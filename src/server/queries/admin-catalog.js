// src/server/queries/admin-catalog.js
/** Admin reads for services, areas, promo codes, payments and payouts. */
import "server-only";
import { and, asc, avg, count, desc, eq, inArray, isNotNull, isNull, lte, ne, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
    addOns,
    bookings,
    categories,
    coupons,
    packages,
    payments,
    payouts,
    providerSkills,
    providerZones,
    providers,
    reviews,
    suburbs,
    users,
    zones,
} from "@/db/schema";
import { PAGE_SIZE } from "@/server/queries/admin";

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const countMap = (rows, key = "id") => new Map(rows.map((r) => [r[key], r.n]));

/* Services ------------------------------------------------------------------ */

/** Every service (any status) with counts for the services list. */
export async function getServicesOverview() {
    const [cats, pkgs, extras, pros, booked, ratings] = await Promise.all([
        db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
        db
            .select({ id: packages.categoryId, n: count(), from: sql`min(${packages.price})` })
            .from(packages)
            .where(eq(packages.active, true))
            .groupBy(packages.categoryId),
        db.select({ id: addOns.categoryId, n: count() }).from(addOns).where(eq(addOns.active, true)).groupBy(addOns.categoryId),
        db
            .select({ id: providerSkills.categoryId, n: count() })
            .from(providerSkills)
            .innerJoin(providers, eq(providerSkills.providerId, providers.id))
            .where(eq(providers.status, "active"))
            .groupBy(providerSkills.categoryId),
        db
            .select({ id: bookings.categoryId, n: count() })
            .from(bookings)
            .where(ne(bookings.status, "cancelled"))
            .groupBy(bookings.categoryId),
        db
            .select({ id: reviews.categoryId, rating: avg(reviews.rating), n: count() })
            .from(reviews)
            .where(eq(reviews.status, "published"))
            .groupBy(reviews.categoryId),
    ]);
    const pk = new Map(pkgs.map((r) => [r.id, r]));
    const ex = countMap(extras);
    const pr = countMap(pros);
    const bk = countMap(booked);
    const rt = new Map(ratings.map((r) => [r.id, r]));
    return cats.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        group: c.group,
        icon: c.icon,
        featured: c.featured,
        bookable: c.status === "published",
        packages: pk.get(c.id)?.n ?? 0,
        fromPrice: pk.has(c.id) ? num(pk.get(c.id).from) : null,
        priceUnit: c.priceUnit ?? "",
        extras: ex.get(c.id) ?? 0,
        providers: pr.get(c.id) ?? 0,
        bookings: bk.get(c.id) ?? 0,
        rating: rt.has(c.id) ? Math.round(num(rt.get(c.id).rating) * 10) / 10 : null,
        reviews: rt.get(c.id)?.n ?? 0,
    }));
}

/** One service with its active packages and extras, for the editor. */
export async function getServiceForEdit(slug) {
    const [c] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, String(slug)))
        .limit(1);
    if (!c) return null;
    const [pkgs, extras] = await Promise.all([
        db
            .select()
            .from(packages)
            .where(and(eq(packages.categoryId, c.id), eq(packages.active, true)))
            .orderBy(asc(packages.sortOrder), asc(packages.id)),
        db
            .select()
            .from(addOns)
            .where(and(eq(addOns.categoryId, c.id), eq(addOns.active, true)))
            .orderBy(asc(addOns.id)),
    ]);
    return {
        service: {
            id: c.id,
            name: c.name,
            slug: c.slug,
            group: c.group,
            icon: c.icon,
            short: c.short ?? "",
            description: c.description ?? "",
            priceUnit: c.priceUnit ?? "",
            includes: c.includes ?? [],
            faqs: c.faqs ?? [],
            heroImage: c.heroImage ?? "",
            seoTitle: c.seoTitle ?? "",
            seoDescription: c.seoDescription ?? "",
            featured: c.featured,
            bookable: c.status === "published",
        },
        packages: pkgs.map((p) => ({
            id: p.id,
            name: p.name,
            price: num(p.price),
            duration: p.duration ?? "",
            summary: p.summary ?? "",
            includes: p.includes ?? [],
            popular: p.popular,
        })),
        addOns: extras.map((a) => ({ id: a.id, name: a.name, price: num(a.price) })),
    };
}

/* Areas --------------------------------------------------------------------- */

export async function getAreasAdmin() {
    const [zs, subs, pros] = await Promise.all([
        db.select().from(zones).orderBy(asc(zones.sortOrder), asc(zones.name)),
        db.select().from(suburbs).orderBy(asc(suburbs.name)),
        db
            .select({ id: providerZones.zoneId, n: count() })
            .from(providerZones)
            .innerJoin(providers, eq(providerZones.providerId, providers.id))
            .where(eq(providers.status, "active"))
            .groupBy(providerZones.zoneId),
    ]);
    const pr = countMap(pros);
    return zs.map((z) => ({
        id: z.id,
        name: z.name,
        active: z.active,
        providers: pr.get(z.id) ?? 0,
        suburbs: subs
            .filter((s) => s.zoneId === z.id)
            .map((s) => ({ id: s.id, name: s.name, postcode: s.postcode, surcharge: num(s.surcharge), active: s.active })),
    }));
}

/* Promo codes ----------------------------------------------------------------- */

export async function getCouponsAdmin() {
    const rows = await db.select().from(coupons).orderBy(desc(coupons.active), asc(coupons.code));
    return rows.map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description ?? "",
        type: c.type,
        value: num(c.value),
        minSpend: num(c.minSpend),
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        categoryIds: c.categoryIds ?? null,
        restriction: c.restriction,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        active: c.active,
    }));
}

/* Payments & payouts ------------------------------------------------------------ */

export async function getPaymentsOverview() {
    const [[collected], [outstanding], [owedPayouts], [unbatched]] = await Promise.all([
        db
            .select({ v: sum(bookings.total) })
            .from(bookings)
            .where(eq(bookings.paymentStatus, "paid")),
        db
            .select({ v: sum(bookings.total), n: count() })
            .from(bookings)
            .where(and(inArray(bookings.paymentStatus, ["unpaid", "partial"]), ne(bookings.status, "cancelled"))),
        db
            .select({ v: sum(payouts.amount) })
            .from(payouts)
            .where(eq(payouts.status, "pending")),
        db
            .select({ v: sum(bookings.providerPay), n: count() })
            .from(bookings)
            .where(and(eq(bookings.status, "completed"), isNotNull(bookings.providerId), isNull(bookings.payoutId))),
    ]);
    return {
        collected: num(collected.v),
        outstanding: num(outstanding.v),
        outstandingCount: outstanding.n,
        owed: num(owedPayouts.v),
        unbatched: num(unbatched.v),
        unbatchedJobs: unbatched.n,
    };
}

/** Bookings with their payment state, newest first, paged. payment = "all" | status. */
export async function listPaymentRows({ payment = "all", page = 1 }) {
    const where = payment === "all" ? undefined : eq(bookings.paymentStatus, payment);
    const pageNum = Math.max(1, Number(page) || 1);
    const [rows, [{ n: total }]] = await Promise.all([
        db
            .select({
                id: bookings.reference,
                status: bookings.status,
                payment: bookings.paymentStatus,
                total: bookings.total,
                date: bookings.serviceDate,
                createdAt: bookings.createdAt,
                customerName: users.name,
            })
            .from(bookings)
            .innerJoin(users, eq(bookings.userId, users.id))
            .where(where)
            .orderBy(desc(bookings.createdAt))
            .limit(PAGE_SIZE)
            .offset((pageNum - 1) * PAGE_SIZE),
        db.select({ n: count() }).from(bookings).where(where),
    ]);
    return {
        rows: rows.map((r) => ({ ...r, total: num(r.total), createdAt: r.createdAt.toISOString() })),
        total,
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
}

export async function getPayoutsAdmin() {
    const rows = await db
        .select({
            id: payouts.id,
            providerId: payouts.providerId,
            providerName: providers.name,
            bankBsb: providers.bankBsb,
            bankAccount: providers.bankAccount,
            periodStart: payouts.periodStart,
            periodEnd: payouts.periodEnd,
            jobs: payouts.jobs,
            amount: payouts.amount,
            status: payouts.status,
            paidAt: payouts.paidAt,
        })
        .from(payouts)
        .innerJoin(providers, eq(payouts.providerId, providers.id))
        .orderBy(desc(payouts.periodEnd), asc(providers.name))
        .limit(300);
    return rows.map((p) => ({
        ...p,
        amount: num(p.amount),
        hasBank: Boolean(p.bankBsb && p.bankAccount),
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    }));
}

/** Completed jobs not yet in a payout, up to a date — used to preview "Create payouts". */
export async function getUnbatchedJobs(upTo) {
    return db
        .select({ providerId: bookings.providerId, n: count(), amount: sum(bookings.providerPay) })
        .from(bookings)
        .where(
            and(
                eq(bookings.status, "completed"),
                isNotNull(bookings.providerId),
                isNull(bookings.payoutId),
                lte(bookings.serviceDate, upTo),
            ),
        )
        .groupBy(bookings.providerId);
}

/** Payments recorded (money in / refunds) for the accounting export. */
export async function getPaymentLedger() {
    return db
        .select({
            at: payments.createdAt,
            reference: bookings.reference,
            customer: users.name,
            method: payments.provider,
            amount: payments.amount,
            status: payments.status,
        })
        .from(payments)
        .innerJoin(bookings, eq(payments.bookingId, bookings.id))
        .innerJoin(users, eq(bookings.userId, users.id))
        .orderBy(asc(payments.createdAt));
}