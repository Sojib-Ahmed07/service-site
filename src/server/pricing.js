// src/server/pricing.js
/**
 * Coupon rules, used by the checkout "Apply" button now and by booking creation
 * later, so the price the customer sees is the price the server charges.
 */
import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { addOns, categories, coupons, packages, suburbs, zones } from "@/db/schema";
import { money } from "@/lib/utils";

/** Rounds to cents. */
export const cents = (n) => Math.round(Number(n) * 100) / 100;

/** Discount in dollars for a coupon on a subtotal (GST-inclusive). Never more than the subtotal. */
export function discountFor(coupon, subtotal) {
    const value = Number(coupon.value);
    const raw = coupon.type === "percent" ? (subtotal * value) / 100 : value;
    return cents(Math.min(Math.max(raw, 0), subtotal));
}

/**
 * Looks up a code and checks every rule. Returns { ok: true, coupon } or { ok: false, error }.
 * `categoryId` is optional; when given, codes limited to other services are rejected.
 */
export async function checkCouponRules(code, subtotal, categoryId) {
    const clean = String(code ?? "")
        .trim()
        .toUpperCase();
    if (!clean) return { ok: false, error: "Enter a promo code." };

    const [c] = await db
        .select()
        .from(coupons)
        .where(eq(sql`upper(${coupons.code})`, clean))
        .limit(1);

    const invalid = { ok: false, error: "That code isn’t valid or has expired." };
    if (!c || !c.active) return invalid;
    if (c.expiresAt && c.expiresAt <= new Date()) return invalid;
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return invalid;
    if (Array.isArray(c.categoryIds) && c.categoryIds.length && categoryId && !c.categoryIds.includes(categoryId)) {
        return { ok: false, error: "That code can’t be used for this service." };
    }
    const minSpend = Number(c.minSpend ?? 0);
    if (subtotal < minSpend) {
        return { ok: false, error: `This code needs a minimum spend of ${money(minSpend)}.`, minSpend };
    }
    return {
        ok: true,
        coupon: { code: c.code, type: c.type, value: Number(c.value), minSpend, restriction: c.restriction ?? "anyone" },
    };
}

/**
 * Prices a booking from IDs only, using database prices (never prices sent by the browser).
 * input = { categorySlug, packageId, addOnIds: string[], suburb: name, couponCode? }
 * Returns { ok: true, quote } or { ok: false, error }.
 * quote = { category, package, addOns, suburb, subtotal, surcharge, discount, total, coupon, couponError }
 * `subtotal` here is package + extras + travel fee, matching what checkout shows.
 */
export async function priceBooking({ categorySlug, packageId, addOnIds = [], suburb, couponCode }) {
    const [cat] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.slug, String(categorySlug ?? "")), eq(categories.status, "published")))
        .limit(1);
    if (!cat) return { ok: false, error: "That service isn’t available." };

    const pkgNum = Number(packageId);
    const [pkg] = Number.isInteger(pkgNum)
        ? await db
            .select()
            .from(packages)
            .where(and(eq(packages.id, pkgNum), eq(packages.categoryId, cat.id), eq(packages.active, true)))
            .limit(1)
        : [];
    if (!pkg) return { ok: false, error: "Please choose a package." };

    const ids = [...new Set((addOnIds ?? []).map(Number).filter(Number.isInteger))];
    const extras = ids.length
        ? await db
            .select()
            .from(addOns)
            .where(and(inArray(addOns.id, ids), eq(addOns.categoryId, cat.id), eq(addOns.active, true)))
        : [];
    if (extras.length !== ids.length) return { ok: false, error: "One of the extras is no longer available." };

    let sub = null;
    if (suburb) {
        [sub] = await db
            .select({ id: suburbs.id, name: suburbs.name, postcode: suburbs.postcode, surcharge: suburbs.surcharge, zone: zones.name })
            .from(suburbs)
            .innerJoin(zones, eq(suburbs.zoneId, zones.id))
            .where(and(eq(suburbs.name, String(suburb)), eq(suburbs.active, true), eq(zones.active, true)))
            .limit(1);
        if (!sub) return { ok: false, error: "We don’t cover that suburb yet." };
    }

    const surcharge = cents(sub?.surcharge ?? 0);
    const subtotal = cents(Number(pkg.price) + extras.reduce((t, a) => t + Number(a.price), 0) + surcharge);

    let coupon = null;
    let couponError = "";
    if (couponCode && String(couponCode).trim()) {
        const check = await checkCouponRules(couponCode, subtotal, cat.id);
        if (check.ok) coupon = check.coupon;
        else couponError = check.error;
    }
    const discount = coupon ? discountFor(coupon, subtotal) : 0;

    return {
        ok: true,
        quote: {
            category: { id: cat.id, slug: cat.slug, name: cat.name },
            package: { id: pkg.id, name: pkg.name, price: Number(pkg.price) },
            addOns: extras.map((a) => ({ id: a.id, name: a.name, price: Number(a.price) })),
            suburb: sub ? { ...sub, surcharge } : null,
            subtotal,
            surcharge,
            discount,
            total: cents(Math.max(0, subtotal - discount)),
            coupon,
            couponError,
        },
    };
}