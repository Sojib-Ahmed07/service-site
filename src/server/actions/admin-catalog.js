// src/server/actions/admin-catalog.js
"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, isNotNull, isNull, lte, max, min, ne, notInArray, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
    activityLog,
    addOns,
    bookingAddOns,
    bookingEvents,
    bookings,
    categories,
    coupons,
    packages,
    payouts,
    suburbs,
    users,
    zones,
} from "@/db/schema";
import { couponRestrictions, serviceGroups, serviceIcons } from "@/lib/constants";
import { formatISODate, hobartToUTC, isISODate } from "@/lib/dates";
import { money2 } from "@/lib/utils";
import { sendEmail } from "@/server/email";
import { paymentReminder } from "@/server/email-templates";
import { logError } from "@/server/errors";
import { getBusiness } from "@/server/queries/settings";
import { getAdmin } from "@/server/session";

const denied = { ok: false, error: "Only admins can do that. Please log in again." };
const failed = (tag, err, msg = "Something went wrong. Please try again.") => {
    logError(tag, err);
    return { ok: false, error: msg };
};
const who = (admin) => `${admin.name.split(" ")[0]} (admin)`;
const activity = (tx, admin, message) => tx.insert(activityLog).values({ actorId: admin.id, actorName: who(admin), message });
const money = (n) => Number(n).toFixed(2);
/** Public pages show services, prices, areas and offers, so refresh everything. */
const refreshSite = () => revalidatePath("/", "layout");

/* Services ------------------------------------------------------------------ */

const text = (maxLen) => z.string().trim().max(maxLen);
const price = z
    .number({ error: "Enter a price for every package and extra." })
    .min(0, { error: "Prices can’t be negative." })
    .max(100000);
const serviceSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().trim().min(2, { error: "Enter the service name." }).max(120),
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Use lowercase letters, numbers and dashes, e.g. oven-cleaning." })
        .max(80),
    group: z.enum(serviceGroups),
    icon: z.enum(serviceIcons),
    short: text(200),
    description: text(5000),
    priceUnit: z.enum(["", "/hr"]),
    includes: z.array(text(200)).max(30),
    faqs: z.array(z.object({ q: text(255), a: text(2000) })).max(30),
    heroImage: text(500),
    seoTitle: text(160),
    seoDescription: text(300),
    featured: z.boolean(),
    bookable: z.boolean(),
    packages: z
        .array(
            z.object({
                id: z.number().int().positive().optional(),
                name: z.string().trim().min(1, { error: "Every package needs a name." }).max(120),
                price,
                duration: text(40),
                summary: text(240),
                includes: z.array(text(120)).max(20),
                popular: z.boolean(),
            }),
        )
        .max(30),
    addOns: z
        .array(
            z.object({
                id: z.number().int().positive().optional(),
                name: z.string().trim().min(1, { error: "Every extra needs a name." }).max(120),
                price,
            }),
        )
        .max(50),
});

/**
 * Create or update a service with its packages, extras and FAQs in one go.
 * Packages/extras already used by bookings are switched off instead of deleted,
 * so booking history keeps its prices.
 */
export async function saveService(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = serviceSchema.safeParse(input);
    if (!parsed.success) {
        const i = parsed.error.issues[0];
        return { ok: false, error: i.message, field: i.path.join(".") };
    }
    const v = parsed.data;
    const includes = v.includes.filter(Boolean);
    const faqs = v.faqs.filter((f) => f.q && f.a);
    if (v.bookable && !v.packages.length) {
        return { ok: false, error: "Add at least one package before making the service bookable." };
    }

    try {
        const [taken] = await db
            .select({ id: categories.id })
            .from(categories)
            .where(v.id ? and(eq(categories.slug, v.slug), ne(categories.id, v.id)) : eq(categories.slug, v.slug))
            .limit(1);
        if (taken) return { ok: false, error: "Another service already uses that URL slug.", field: "slug" };

        const id = await db.transaction(async (tx) => {
            const values = {
                name: v.name,
                slug: v.slug,
                group: v.group,
                icon: v.icon,
                short: v.short || null,
                description: v.description || null,
                priceUnit: v.priceUnit || null,
                includes,
                faqs,
                heroImage: v.heroImage || null,
                seoTitle: v.seoTitle || null,
                seoDescription: v.seoDescription || null,
                featured: v.featured,
                status: v.bookable ? "published" : "draft",
                updatedAt: new Date(),
            };
            let cid = v.id;
            if (cid) {
                const done = await tx.update(categories).set(values).where(eq(categories.id, cid)).returning({ id: categories.id });
                if (!done.length) throw new Error("NOT_FOUND");
            } else {
                const [{ n }] = await tx.select({ n: count() }).from(categories);
                [{ id: cid }] = await tx
                    .insert(categories)
                    .values({ ...values, sortOrder: n })
                    .returning({ id: categories.id });
            }

            // Packages
            const keepPkg = [];
            for (const [i, p] of v.packages.entries()) {
                const row = {
                    name: p.name,
                    price: money(p.price),
                    duration: p.duration || null,
                    summary: p.summary || null,
                    includes: p.includes.filter(Boolean),
                    popular: p.popular,
                    priceUnit: v.priceUnit || null,
                    active: true,
                    sortOrder: i,
                    updatedAt: new Date(),
                };
                if (p.id) {
                    const done = await tx
                        .update(packages)
                        .set(row)
                        .where(and(eq(packages.id, p.id), eq(packages.categoryId, cid)))
                        .returning({ id: packages.id });
                    if (done.length) keepPkg.push(p.id);
                    else throw new Error("BAD_PACKAGE");
                } else {
                    const [{ id: pid }] = await tx
                        .insert(packages)
                        .values({ ...row, categoryId: cid })
                        .returning({ id: packages.id });
                    keepPkg.push(pid);
                }
            }
            const removedPkgs = await tx
                .select({ id: packages.id })
                .from(packages)
                .where(
                    and(
                        eq(packages.categoryId, cid),
                        keepPkg.length ? notInArray(packages.id, keepPkg) : undefined,
                        eq(packages.active, true),
                    ),
                );
            for (const { id: pid } of removedPkgs) {
                const [used] = await tx.select({ n: count() }).from(bookings).where(eq(bookings.packageId, pid));
                if (used.n) await tx.update(packages).set({ active: false }).where(eq(packages.id, pid));
                else await tx.delete(packages).where(eq(packages.id, pid));
            }

            // Extras
            const keepExtra = [];
            for (const a of v.addOns) {
                if (a.id) {
                    const done = await tx
                        .update(addOns)
                        .set({ name: a.name, price: money(a.price), active: true })
                        .where(and(eq(addOns.id, a.id), eq(addOns.categoryId, cid)))
                        .returning({ id: addOns.id });
                    if (done.length) keepExtra.push(a.id);
                    else throw new Error("BAD_EXTRA");
                } else {
                    const [{ id: aid }] = await tx
                        .insert(addOns)
                        .values({ categoryId: cid, name: a.name, price: money(a.price) })
                        .returning({ id: addOns.id });
                    keepExtra.push(aid);
                }
            }
            const removedExtras = await tx
                .select({ id: addOns.id })
                .from(addOns)
                .where(
                    and(
                        eq(addOns.categoryId, cid),
                        keepExtra.length ? notInArray(addOns.id, keepExtra) : undefined,
                        eq(addOns.active, true),
                    ),
                );
            for (const { id: aid } of removedExtras) {
                const [used] = await tx.select({ n: count() }).from(bookingAddOns).where(eq(bookingAddOns.addOnId, aid));
                if (used.n) await tx.update(addOns).set({ active: false }).where(eq(addOns.id, aid));
                else await tx.delete(addOns).where(eq(addOns.id, aid));
            }

            await activity(tx, admin, `${v.id ? "Updated" : "Added"} service ${v.name}`);
            return cid;
        });
        refreshSite();
        return { ok: true, id, slug: v.slug };
    } catch (err) {
        if (err.message === "NOT_FOUND") return { ok: false, error: "That service no longer exists." };
        if (err.message === "BAD_PACKAGE" || err.message === "BAD_EXTRA") {
            return { ok: false, error: "This page is out of date. Refresh and try again." };
        }
        return failed("saveService", err, "We couldn’t save the service. Please try again.");
    }
}

export async function setServiceBookable(id, bookable) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const cid = Number(id);
        if (bookable) {
            const [{ n }] = await db
                .select({ n: count() })
                .from(packages)
                .where(and(eq(packages.categoryId, cid), eq(packages.active, true)));
            if (!n) return { ok: false, error: "Add a package first." };
        }
        const [c] = await db
            .update(categories)
            .set({ status: bookable ? "published" : "draft", updatedAt: new Date() })
            .where(eq(categories.id, cid))
            .returning({ name: categories.name });
        if (!c) return { ok: false, error: "Service not found." };
        await activity(db, admin, `${c.name} ${bookable ? "is bookable" : "hidden from the website"}`);
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("setServiceBookable", err);
    }
}

/* Areas --------------------------------------------------------------------- */

export async function saveZone(id, name) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const clean = String(name ?? "").trim();
    if (clean.length < 2 || clean.length > 80) return { ok: false, error: "Enter a zone name (2–80 characters)." };
    try {
        const [dup] = await db
            .select({ id: zones.id })
            .from(zones)
            .where(and(eq(sql`lower(${zones.name})`, clean.toLowerCase()), id ? ne(zones.id, Number(id)) : undefined))
            .limit(1);
        if (dup) return { ok: false, error: "A zone with that name already exists." };
        if (id) {
            await db
                .update(zones)
                .set({ name: clean })
                .where(eq(zones.id, Number(id)));
        } else {
            const [{ n }] = await db.select({ n: count() }).from(zones);
            await db.insert(zones).values({ name: clean, sortOrder: n });
        }
        await activity(db, admin, `${id ? "Renamed" : "Added"} zone ${clean}`);
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("saveZone", err);
    }
}

export async function setZoneActive(id, active) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const [z] = await db
            .update(zones)
            .set({ active: Boolean(active) })
            .where(eq(zones.id, Number(id)))
            .returning({ name: zones.name });
        if (!z) return { ok: false, error: "Zone not found." };
        await activity(db, admin, `Zone ${z.name} ${active ? "switched on" : "switched off"}`);
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("setZoneActive", err);
    }
}

const suburbSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().trim().min(2, { error: "Enter the suburb name." }).max(80),
    postcode: z
        .string()
        .trim()
        .regex(/^\d{4}$/, { error: "A postcode has 4 digits." }),
    zoneId: z.number().int().positive(),
    surcharge: z.coerce.number().min(0, { error: "The travel fee can’t be negative." }).max(1000),
    active: z.boolean(),
});

export async function saveSuburb(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = suburbSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const v = parsed.data;
    try {
        const [dup] = await db
            .select({ id: suburbs.id })
            .from(suburbs)
            .where(and(eq(sql`lower(${suburbs.name})`, v.name.toLowerCase()), v.id ? ne(suburbs.id, v.id) : undefined))
            .limit(1);
        if (dup) return { ok: false, error: `${v.name} is already listed.` };
        const values = { name: v.name, postcode: v.postcode, zoneId: v.zoneId, surcharge: money(v.surcharge), active: v.active };
        if (v.id) await db.update(suburbs).set(values).where(eq(suburbs.id, v.id));
        else await db.insert(suburbs).values(values);
        await activity(db, admin, `${v.id ? "Updated" : "Added"} suburb ${v.name}`);
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("saveSuburb", err);
    }
}

/* Promo codes ----------------------------------------------------------------- */

const couponSchema = z.object({
    id: z.number().int().positive().optional(),
    code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{3,20}$/, { error: "Use 3–20 letters and numbers, e.g. SUMMER20." }),
    description: text(200),
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().positive({ error: "Enter a discount above zero." }).max(100000),
    minSpend: z.coerce.number().min(0).max(100000),
    usageLimit: z.union([z.literal(""), z.coerce.number().int().min(1).max(1000000)]),
    expires: z.union([z.literal(""), z.string().refine(isISODate, { error: "Enter a valid date." })]),
    categoryId: z.union([z.literal("all"), z.coerce.number().int().positive()]),
    restriction: z.enum(Object.keys(couponRestrictions)),
    active: z.boolean(),
});

export async function saveCoupon(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = couponSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const v = parsed.data;
    if (v.type === "percent" && v.value > 100) return { ok: false, error: "A percentage can’t be more than 100." };
    try {
        const [dup] = await db
            .select({ id: coupons.id })
            .from(coupons)
            .where(and(eq(sql`upper(${coupons.code})`, v.code), v.id ? ne(coupons.id, v.id) : undefined))
            .limit(1);
        if (dup) return { ok: false, error: `${v.code} already exists.` };
        const values = {
            code: v.code,
            description: v.description || null,
            type: v.type,
            value: money(v.value),
            minSpend: money(v.minSpend),
            usageLimit: v.usageLimit === "" ? null : v.usageLimit,
            expiresAt: v.expires ? hobartToUTC(v.expires, "23:59:59") : null,
            categoryIds: v.categoryId === "all" ? null : [v.categoryId],
            restriction: v.restriction,
            active: v.active,
        };
        if (v.id) await db.update(coupons).set(values).where(eq(coupons.id, v.id));
        else await db.insert(coupons).values(values);
        await activity(db, admin, `${v.id ? "Updated" : "Created"} promo code ${v.code}`);
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("saveCoupon", err);
    }
}

export async function setCouponActive(id, active) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const [c] = await db
            .update(coupons)
            .set({ active: Boolean(active) })
            .where(eq(coupons.id, Number(id)))
            .returning({ code: coupons.code });
        if (!c) return { ok: false, error: "Promo code not found." };
        await activity(db, admin, `${active ? "Resumed" : "Paused"} promo code ${c.code}`);
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("setCouponActive", err);
    }
}

/* Payouts ------------------------------------------------------------------------ */

/**
 * Groups completed, not-yet-paid-out jobs (job date on or before `upTo`) into one
 * pending payout per provider. Jobs without a provider pay amount are skipped.
 */
export async function createPayouts(upTo) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!isISODate(upTo)) return { ok: false, error: "Choose the last day to include." };
    try {
        const result = await db.transaction(async (tx) => {
            const groups = await tx
                .select({
                    providerId: bookings.providerId,
                    n: count(),
                    amount: sum(bookings.providerPay),
                    start: min(bookings.serviceDate),
                    end: max(bookings.serviceDate),
                })
                .from(bookings)
                .where(
                    and(
                        eq(bookings.status, "completed"),
                        isNotNull(bookings.providerId),
                        isNotNull(bookings.providerPay),
                        isNull(bookings.payoutId),
                        lte(bookings.serviceDate, upTo),
                    ),
                )
                .groupBy(bookings.providerId);
            let created = 0;
            for (const g of groups) {
                const [p] = await tx
                    .insert(payouts)
                    .values({
                        providerId: g.providerId,
                        periodStart: g.start,
                        periodEnd: upTo,
                        amount: money(g.amount),
                        jobs: g.n,
                        status: "pending",
                    })
                    .returning({ id: payouts.id });
                await tx
                    .update(bookings)
                    .set({ payoutId: p.id })
                    .where(
                        and(
                            eq(bookings.providerId, g.providerId),
                            eq(bookings.status, "completed"),
                            isNotNull(bookings.providerPay),
                            isNull(bookings.payoutId),
                            lte(bookings.serviceDate, upTo),
                        ),
                    );
                created++;
            }
            const [{ n: skipped }] = await tx
                .select({ n: count() })
                .from(bookings)
                .where(
                    and(
                        eq(bookings.status, "completed"),
                        isNotNull(bookings.providerId),
                        isNull(bookings.providerPay),
                        isNull(bookings.payoutId),
                        lte(bookings.serviceDate, upTo),
                    ),
                );
            if (created)
                await activity(tx, admin, `Created ${created} provider payout${created === 1 ? "" : "s"} up to ${formatISODate(upTo)}`);
            return { created, skipped };
        });
        revalidatePath("/admin", "layout");
        if (!result.created) {
            return {
                ok: false,
                error:
                    "No completed jobs to pay out up to that date." +
                    (result.skipped ? ` ${result.skipped} job(s) have no provider pay set.` : ""),
            };
        }
        return {
            ok: true,
            message: `${result.created} payout${result.created === 1 ? "" : "s"} created${result.skipped ? `. ${result.skipped} job(s) skipped: no provider pay set` : ""}`,
        };
    } catch (err) {
        return failed("createPayouts", err);
    }
}

/** status = "paid" | "pending" | "held". Pass "all-pending" as id to mark every pending payout paid. */
export async function setPayoutStatus(id, status) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!["paid", "pending", "held"].includes(status)) return { ok: false, error: "Unknown status." };
    try {
        const where = id === "all-pending" ? eq(payouts.status, "pending") : eq(payouts.id, Number(id));
        const done = await db
            .update(payouts)
            .set({ status, paidAt: status === "paid" ? new Date() : null })
            .where(where)
            .returning({ id: payouts.id, amount: payouts.amount });
        if (!done.length) return { ok: false, error: id === "all-pending" ? "No pending payouts." : "Payout not found." };
        const total = done.reduce((s, p) => s + Number(p.amount), 0);
        await activity(db, admin, `Marked ${done.length} payout${done.length === 1 ? "" : "s"} ${status} (${money2(total)})`);
        revalidatePath("/admin", "layout");
        return { ok: true, message: `${done.length} payout${done.length === 1 ? "" : "s"} marked ${status}` };
    } catch (err) {
        return failed("setPayoutStatus", err);
    }
}

/** Emails the customer a reminder for an unpaid booking. */
export async function sendPaymentReminder(reference) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const [b] = await db
            .select({
                id: bookings.id,
                reference: bookings.reference,
                total: bookings.total,
                date: bookings.serviceDate,
                payment: bookings.paymentStatus,
                name: users.name,
                email: users.email,
            })
            .from(bookings)
            .innerJoin(users, eq(bookings.userId, users.id))
            .where(eq(bookings.reference, String(reference)))
            .limit(1);
        if (!b) return { ok: false, error: "Booking not found." };
        if (!["unpaid", "partial"].includes(b.payment)) return { ok: false, error: "This booking is already paid." };
        const business = await getBusiness();
        const sent = await sendEmail(paymentReminder(business, b));
        if (!sent.ok) return { ok: false, error: `The reminder wasn’t sent: ${sent.error}` };
        await db.insert(bookingEvents).values({
            bookingId: b.id,
            type: "payment",
            message: sent.delivered ? "Payment reminder emailed" : "Payment reminder printed in the terminal (email not connected)",
            actorId: admin.id,
        });
        revalidatePath(`/admin/bookings/${b.reference}`);
        return {
            ok: true,
            message: sent.delivered ? "Payment reminder sent" : "Email isn’t connected yet, so the reminder was printed in the server terminal",
        };
    } catch (err) {
        return failed("sendPaymentReminder", err);
    }
}