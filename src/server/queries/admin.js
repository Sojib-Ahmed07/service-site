// src/server/queries/admin.js
/**
 * Read-only queries for the admin panel. Pages call these after requireAdmin()
 * (the admin layout already does). Shapes are kept close to the old mock data.
 */
import "server-only";
import { cache } from "react";
import { aliasedTable, and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, ne, notLike, or, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
    activityLog,
    addOns,
    addresses,
    bookingAddOns,
    bookingEvents,
    bookings,
    categories,
    enquiries,
    packages,
    partnerApplications,
    payouts,
    providerDocuments,
    providerSkills,
    providerZones,
    providers,
    reviews,
    suburbs,
    users,
    zones,
} from "@/db/schema";
import { addDaysISO, todayISO, weekdayShort } from "@/lib/dates";

export const PAGE_SIZE = 50;
const num = (v) => (v === null || v === undefined ? 0 : Number(v));
/** Escapes % and _ so a search for "50%" means the text "50%". */
const likeTerm = (q) =>
    `%${String(q)
        .trim()
        .replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
const isCustomer = and(eq(users.role, "customer"), notLike(users.email, "deleted-%@deleted.invalid"));

/* Shared --------------------------------------------------------------------- */

/** All categories (any status) and active zones, for filter menus and forms. */
export const getAdminOptions = cache(async () => {
    const [cats, zs] = await Promise.all([
        db
            .select({ id: categories.id, slug: categories.slug, name: categories.name, status: categories.status })
            .from(categories)
            .orderBy(asc(categories.sortOrder), asc(categories.name)),
        db.select({ id: zones.id, name: zones.name }).from(zones).orderBy(asc(zones.sortOrder), asc(zones.name)),
    ]);
    return { categories: cats, zones: zs };
});

/**
 * Document check used everywhere: ABN, insurance and police check must be on file,
 * verified and not expired. A licence only counts if one is recorded (= required).
 */
function complianceOf(docs, today = todayISO()) {
    const byType = Object.fromEntries(docs.map((d) => [d.type, d]));
    const okDoc = (d) => Boolean(d?.verified) && (!d.expiresOn || d.expiresOn >= today);
    const missing = [];
    if (!okDoc(byType.abn)) missing.push("ABN");
    if (!okDoc(byType.insurance)) missing.push("Insurance");
    if (!okDoc(byType.police_check)) missing.push("Police check");
    if (byType.licence && !okDoc(byType.licence)) missing.push("Licence");
    const soon = addDaysISO(today, 30);
    const expiring = docs.filter((d) => d.verified && d.expiresOn && d.expiresOn >= today && d.expiresOn <= soon);
    return { compliant: missing.length === 0, missing, expiring };
}

/* Providers ------------------------------------------------------------------ */

/** Every provider with skills (slugs), zones (names), documents, compliance and job counts. */
export const getProvidersFull = cache(async () => {
    const [rows, skills, zoneRows, docs, jobCounts] = await Promise.all([
        db.select().from(providers).orderBy(asc(providers.name)),
        db
            .select({ providerId: providerSkills.providerId, slug: categories.slug })
            .from(providerSkills)
            .innerJoin(categories, eq(providerSkills.categoryId, categories.id)),
        db
            .select({ providerId: providerZones.providerId, name: zones.name })
            .from(providerZones)
            .innerJoin(zones, eq(providerZones.zoneId, zones.id)),
        db.select().from(providerDocuments),
        db
            .select({ providerId: bookings.providerId, n: count() })
            .from(bookings)
            .where(and(isNotNull(bookings.providerId), eq(bookings.status, "completed")))
            .groupBy(bookings.providerId),
    ]);
    const group = (list, key, val) => list.reduce((m, x) => m.set(x[key], [...(m.get(x[key]) ?? []), val(x)]), new Map());
    const skillMap = group(skills, "providerId", (x) => x.slug);
    const zoneMap = group(zoneRows, "providerId", (x) => x.name);
    const docMap = group(docs, "providerId", (x) => x);
    const jobsMap = new Map(jobCounts.map((x) => [x.providerId, x.n]));
    const today = todayISO();

    return rows.map((p) => {
        const d = docMap.get(p.id) ?? [];
        return {
            id: p.id,
            name: p.name,
            business: p.business ?? "",
            email: p.email ?? "",
            phone: p.phone,
            abn: p.abn ?? "",
            status: p.status,
            payType: p.payType,
            rate: p.payRate ?? "",
            payoutSchedule: p.payoutSchedule,
            availability: p.availability ?? [],
            rating: num(p.rating),
            bankBsb: p.bankBsb ?? "",
            bankAccount: p.bankAccount ?? "",
            notes: p.notes ?? "",
            joined: p.createdAt.toISOString(),
            skills: skillMap.get(p.id) ?? [],
            zones: zoneMap.get(p.id) ?? [],
            docs: d.map((x) => ({ type: x.type, verified: x.verified, expiresOn: x.expiresOn, file: x.fileUrl ?? "" })),
            jobs: jobsMap.get(p.id) ?? 0,
            ...complianceOf(d, today),
        };
    });
});

export async function getProviderById(id) {
    const n = Number(id);
    if (!Number.isInteger(n)) return null;
    return (await getProvidersFull()).find((p) => p.id === n) ?? null;
}

/** A provider's jobs and payouts for the provider page. */
export async function getProviderActivity(providerId) {
    const [jobs, pays] = await Promise.all([
        db
            .select({
                id: bookings.reference,
                date: bookings.serviceDate,
                status: bookings.status,
                providerPay: bookings.providerPay,
                categoryName: categories.name,
            })
            .from(bookings)
            .innerJoin(categories, eq(bookings.categoryId, categories.id))
            .where(eq(bookings.providerId, providerId))
            .orderBy(desc(bookings.serviceDate))
            .limit(100),
        db.select().from(payouts).where(eq(payouts.providerId, providerId)).orderBy(desc(payouts.periodStart)),
    ]);
    return {
        jobs: jobs.map((j) => ({ ...j, providerPay: num(j.providerPay) })),
        payouts: pays.map((x) => ({
            id: x.id,
            periodStart: x.periodStart,
            periodEnd: x.periodEnd,
            jobs: x.jobs,
            amount: num(x.amount),
            status: x.status,
        })),
    };
}

/* Bookings ------------------------------------------------------------------- */

const provider2 = aliasedTable(providers, "assigned_provider");

/** Bookings list with server-side filters, search, sort and paging. */
export async function listBookings({ status = "all", category = "all", zone = "all", q = "", sort = "date", page = 1 }) {
    const conds = [];
    if (status !== "all") conds.push(eq(bookings.status, status));
    if (category !== "all") conds.push(eq(categories.slug, category));
    if (zone !== "all") conds.push(eq(zones.name, zone));
    if (q.trim()) {
        const t = likeTerm(q);
        conds.push(
            or(
                ilike(bookings.reference, t),
                ilike(users.name, t),
                ilike(users.email, t),
                ilike(suburbs.name, t),
                ilike(bookings.addressLine, t),
                ilike(provider2.name, t),
            ),
        );
    }
    const where = conds.length ? and(...conds) : undefined;
    const order =
        sort === "newest"
            ? [desc(bookings.createdAt)]
            : sort === "value"
                ? [desc(bookings.total), desc(bookings.createdAt)]
                : [asc(bookings.serviceDate), asc(bookings.timeSlot), asc(bookings.id)];
    const pageNum = Math.max(1, Number(page) || 1);

    const base = () =>
        db
            .select({
                id: bookings.reference,
                status: bookings.status,
                payment: bookings.paymentStatus,
                date: bookings.serviceDate,
                slot: bookings.timeSlot,
                total: bookings.total,
                createdAt: bookings.createdAt,
                customerName: users.name,
                customerId: users.id,
                suburb: suburbs.name,
                zone: zones.name,
                categoryName: categories.name,
                providerName: provider2.name,
            })
            .from(bookings)
            .innerJoin(users, eq(bookings.userId, users.id))
            .innerJoin(categories, eq(bookings.categoryId, categories.id))
            .innerJoin(suburbs, eq(bookings.suburbId, suburbs.id))
            .innerJoin(zones, eq(suburbs.zoneId, zones.id))
            .leftJoin(provider2, eq(bookings.providerId, provider2.id));

    const [rows, [{ n: total }], statusRows] = await Promise.all([
        base()
            .where(where)
            .orderBy(...order)
            .limit(PAGE_SIZE)
            .offset((pageNum - 1) * PAGE_SIZE),
        db
            .select({ n: count() })
            .from(bookings)
            .innerJoin(users, eq(bookings.userId, users.id))
            .innerJoin(categories, eq(bookings.categoryId, categories.id))
            .innerJoin(suburbs, eq(bookings.suburbId, suburbs.id))
            .innerJoin(zones, eq(suburbs.zoneId, zones.id))
            .leftJoin(provider2, eq(bookings.providerId, provider2.id))
            .where(where),
        db.select({ status: bookings.status, n: count() }).from(bookings).groupBy(bookings.status),
    ]);
    const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, r.n]));
    statusCounts.all = statusRows.reduce((s, r) => s + r.n, 0);
    return {
        rows: rows.map((r) => ({ ...r, total: num(r.total), createdAt: r.createdAt.toISOString() })),
        total,
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        statusCounts,
    };
}

/** Everything the booking manager needs, or null. */
export async function getAdminBooking(reference) {
    const [b] = await db
        .select({
            dbId: bookings.id,
            id: bookings.reference,
            status: bookings.status,
            payment: bookings.paymentStatus,
            date: bookings.serviceDate,
            slot: bookings.timeSlot,
            address: bookings.addressLine,
            notes: bookings.accessNotes,
            subtotal: bookings.subtotal,
            discount: bookings.discount,
            surcharge: bookings.surcharge,
            total: bookings.total,
            couponCode: bookings.couponCode,
            providerId: bookings.providerId,
            providerPay: bookings.providerPay,
            createdAt: bookings.createdAt,
            userId: bookings.userId,
            categoryId: categories.id,
            categorySlug: categories.slug,
            categoryName: categories.name,
            icon: categories.icon,
            packageName: packages.name,
            packagePrice: packages.price,
            duration: packages.duration,
            suburb: suburbs.name,
            zone: zones.name,
        })
        .from(bookings)
        .innerJoin(categories, eq(bookings.categoryId, categories.id))
        .innerJoin(packages, eq(bookings.packageId, packages.id))
        .innerJoin(suburbs, eq(bookings.suburbId, suburbs.id))
        .innerJoin(zones, eq(suburbs.zoneId, zones.id))
        .where(eq(bookings.reference, String(reference)))
        .limit(1);
    if (!b) return null;

    const actor = aliasedTable(users, "actor");
    const [extras, events, [customer], [stats], allProviders, sameDay] = await Promise.all([
        db
            .select({ id: addOns.id, name: addOns.name, price: bookingAddOns.price })
            .from(bookingAddOns)
            .innerJoin(addOns, eq(bookingAddOns.addOnId, addOns.id))
            .where(eq(bookingAddOns.bookingId, b.dbId)),
        db
            .select({
                id: bookingEvents.id,
                type: bookingEvents.type,
                message: bookingEvents.message,
                at: bookingEvents.createdAt,
                by: actor.name,
            })
            .from(bookingEvents)
            .leftJoin(actor, eq(bookingEvents.actorId, actor.id))
            .where(eq(bookingEvents.bookingId, b.dbId))
            .orderBy(asc(bookingEvents.createdAt), asc(bookingEvents.id)),
        db
            .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, blocked: users.blocked })
            .from(users)
            .where(eq(users.id, b.userId)),
        db
            .select({
                bookings: count(),
                spent: sql`coalesce(sum(case when ${bookings.paymentStatus} = 'paid' then ${bookings.total} else 0 end), 0)`,
            })
            .from(bookings)
            .where(eq(bookings.userId, b.userId)),
        getProvidersFull(),
        db
            .select({ providerId: bookings.providerId, n: count() })
            .from(bookings)
            .where(
                and(
                    eq(bookings.serviceDate, b.date),
                    ne(bookings.status, "cancelled"),
                    ne(bookings.id, b.dbId),
                    isNotNull(bookings.providerId),
                ),
            )
            .groupBy(bookings.providerId),
    ]);
    const busy = new Map(sameDay.map((r) => [r.providerId, r.n]));
    const day = weekdayShort(b.date);
    const candidates = allProviders
        .filter((p) => p.skills.includes(b.categorySlug))
        .map((p) => ({
            ...p,
            jobsThatDay: busy.get(p.id) ?? 0,
            inZone: p.zones.includes(b.zone),
            available: p.availability.includes(day),
        }));
    const assigned = b.providerId ? (allProviders.find((p) => p.id === b.providerId) ?? null) : null;

    const ev = events.map((e) => ({ ...e, at: e.at.toISOString(), by: e.by ?? "System" }));
    return {
        booking: {
            ...b,
            subtotal: num(b.subtotal),
            discount: num(b.discount),
            surcharge: num(b.surcharge),
            total: num(b.total),
            packagePrice: num(b.packagePrice),
            providerPay: b.providerPay === null ? null : num(b.providerPay),
            notes: b.notes ?? "",
            createdAt: b.createdAt.toISOString(),
            day,
        },
        extras: extras.map((x) => ({ id: x.id, name: x.name, price: num(x.price) })),
        customer: { ...customer, phone: customer.phone ?? "", bookings: stats.bookings, spent: num(stats.spent) },
        assigned,
        candidates,
        messages: ev
            .filter((e) => e.type === "message_customer" || e.type === "message_team")
            .map((e) => ({ from: e.type === "message_team" ? "team" : "customer", text: e.message, at: e.at })),
        notes: ev.filter((e) => e.type === "note").map((e) => ({ id: e.id, text: e.message, at: e.at, by: e.by })),
        timeline: ev.filter((e) => !["message_customer", "message_team", "note"].includes(e.type)),
    };
}

/** Customers for the "existing customer" picker on the new booking form. */
export async function getCustomerPicker() {
    return db
        .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
        .from(users)
        .where(and(isCustomer, eq(users.blocked, false)))
        .orderBy(asc(users.name))
        .limit(2000);
}

/* Customers ------------------------------------------------------------------ */

/** Default address suburb + zone for each customer. */
const defaultAddress = () =>
    db
        .select({
            userId: addresses.userId,
            suburb: sql`${suburbs.name}`.as("suburb_name"),
            zone: sql`${zones.name}`.as("zone_name"),
        })
        .from(addresses)
        .innerJoin(suburbs, eq(addresses.suburbId, suburbs.id))
        .innerJoin(zones, eq(suburbs.zoneId, zones.id))
        .where(eq(addresses.isDefault, true))
        .as("default_address");

export async function listCustomers({ q = "", zone = "all", sort = "spent", page = 1 }) {
    const stats = db
        .select({
            userId: bookings.userId,
            n: count().as("n"),
            spent: sql`coalesce(sum(case when ${bookings.paymentStatus} = 'paid' then ${bookings.total} else 0 end), 0)`.as("spent"),
        })
        .from(bookings)
        .groupBy(bookings.userId)
        .as("stats");
    const addr = defaultAddress();
    const conds = [isCustomer];
    if (zone !== "all") conds.push(eq(addr.zone, zone));
    if (q.trim()) {
        const t = likeTerm(q);
        conds.push(or(ilike(users.name, t), ilike(users.email, t), ilike(users.phone, t), ilike(addr.suburb, t)));
    }
    const order =
        sort === "bookings"
            ? [sql`coalesce(${stats.n}, 0) desc`, desc(users.createdAt)]
            : sort === "joined"
                ? [desc(users.createdAt)]
                : [sql`coalesce(${stats.spent}, 0) desc`, desc(users.createdAt)];
    const pageNum = Math.max(1, Number(page) || 1);
    const from = () =>
        db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
                blocked: users.blocked,
                joined: users.createdAt,
                suburb: addr.suburb,
                bookings: stats.n,
                spent: stats.spent,
            })
            .from(users)
            .leftJoin(stats, eq(stats.userId, users.id))
            .leftJoin(addr, eq(addr.userId, users.id))
            .where(and(...conds));
    const [rows, [{ n: total }]] = await Promise.all([
        from()
            .orderBy(...order)
            .limit(PAGE_SIZE)
            .offset((pageNum - 1) * PAGE_SIZE),
        db
            .select({ n: count() })
            .from(users)
            .leftJoin(addr, eq(addr.userId, users.id))
            .where(and(...conds)),
    ]);
    return {
        rows: rows.map((c) => ({
            ...c,
            phone: c.phone ?? "",
            suburb: c.suburb ?? "",
            bookings: num(c.bookings),
            spent: num(c.spent),
            joined: c.joined.toISOString(),
            status: c.blocked ? "blocked" : "active",
        })),
        total,
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
}

export async function getAdminCustomer(id) {
    const [u] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, String(id)), eq(users.role, "customer")))
        .limit(1);
    if (!u) return null;
    const [list, addrs] = await Promise.all([
        db
            .select({
                id: bookings.reference,
                date: bookings.serviceDate,
                status: bookings.status,
                payment: bookings.paymentStatus,
                total: bookings.total,
                categoryName: categories.name,
                providerName: provider2.name,
            })
            .from(bookings)
            .innerJoin(categories, eq(bookings.categoryId, categories.id))
            .leftJoin(provider2, eq(bookings.providerId, provider2.id))
            .where(eq(bookings.userId, u.id))
            .orderBy(desc(bookings.serviceDate)),
        db
            .select({ line1: addresses.line1, suburb: suburbs.name, isDefault: addresses.isDefault })
            .from(addresses)
            .innerJoin(suburbs, eq(addresses.suburbId, suburbs.id))
            .where(eq(addresses.userId, u.id))
            .orderBy(desc(addresses.isDefault)),
    ]);
    const rows = list.map((b) => ({ ...b, total: num(b.total) }));
    const spent = rows.filter((b) => b.payment === "paid").reduce((s, b) => s + b.total, 0);
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? "",
        adminNotes: u.adminNotes ?? "",
        status: u.blocked ? "blocked" : "active",
        deleted: u.email.endsWith("@deleted.invalid"),
        joined: u.createdAt.toISOString(),
        suburb: addrs.find((a) => a.isDefault)?.suburb ?? addrs[0]?.suburb ?? "",
        bookings: rows,
        spent,
    };
}

/* Inbox & reviews --------------------------------------------------------------- */

export async function getInbox() {
    const [msgs, apps] = await Promise.all([
        db.select().from(enquiries).orderBy(desc(enquiries.createdAt)).limit(300),
        db.select().from(partnerApplications).orderBy(desc(partnerApplications.createdAt)).limit(300),
    ]);
    return {
        enquiries: msgs.map((e) => ({
            id: e.id,
            name: e.name,
            email: e.email,
            phone: e.phone ?? "",
            type: e.type ?? "General",
            bookingRef: e.bookingRef ?? "",
            subject: e.subject ?? "",
            message: e.message,
            replies: e.replies ?? [],
            attachments: e.attachments ?? [],
            status: e.status,
            date: e.createdAt.toISOString(),
        })),
        applications: apps.map((a) => ({
            id: a.id,
            name: a.name,
            business: a.business ?? "",
            email: a.email,
            phone: a.phone,
            abn: a.abn ?? "",
            experience: a.experience ?? "",
            skills: a.skills ?? [],
            zones: a.zones ?? [],
            message: a.message ?? "",
            status: a.status,
            date: a.createdAt.toISOString(),
        })),
    };
}

export async function getAllReviews() {
    const rows = await db
        .select({
            id: reviews.id,
            name: reviews.authorName,
            suburb: reviews.authorSuburb,
            rating: reviews.rating,
            text: reviews.body,
            reply: reviews.reply,
            status: reviews.status,
            date: reviews.createdAt,
            categoryName: categories.name,
            bookingRef: bookings.reference,
        })
        .from(reviews)
        .leftJoin(categories, eq(reviews.categoryId, categories.id))
        .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
        .orderBy(desc(reviews.createdAt));
    return rows.map((r) => ({
        ...r,
        name: r.name || "Customer",
        suburb: r.suburb || "",
        text: r.text || "",
        reply: r.reply || "",
        categoryName: r.categoryName || "",
        date: r.date.toISOString(),
    }));
}

/* Dashboard ------------------------------------------------------------------ */

/** Monday of the week (Hobart dates) for a YYYY-MM-DD. */
function mondayOf(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun
    return addDaysISO(iso, -((dow + 6) % 7));
}

export async function getDashboard() {
    const today = todayISO();
    const thisMonday = mondayOf(today);
    const firstMonday = addDaysISO(thisMonday, -7 * 7);

    const [unassigned, todays, weekRows, [marginRow], top, allProviders, activity] = await Promise.all([
        db
            .select({
                id: bookings.reference,
                date: bookings.serviceDate,
                slot: bookings.timeSlot,
                total: bookings.total,
                suburb: suburbs.name,
                categoryName: categories.name,
                icon: categories.icon,
                customerName: users.name,
            })
            .from(bookings)
            .innerJoin(categories, eq(bookings.categoryId, categories.id))
            .innerJoin(suburbs, eq(bookings.suburbId, suburbs.id))
            .innerJoin(users, eq(bookings.userId, users.id))
            .where(eq(bookings.status, "new"))
            .orderBy(asc(bookings.createdAt))
            .limit(8),
        db
            .select({
                id: bookings.reference,
                slot: bookings.timeSlot,
                status: bookings.status,
                suburb: suburbs.name,
                categoryName: categories.name,
                providerName: provider2.name,
            })
            .from(bookings)
            .innerJoin(categories, eq(bookings.categoryId, categories.id))
            .innerJoin(suburbs, eq(bookings.suburbId, suburbs.id))
            .leftJoin(provider2, eq(bookings.providerId, provider2.id))
            .where(and(eq(bookings.serviceDate, today), ne(bookings.status, "cancelled")))
            .orderBy(asc(bookings.timeSlot)),
        // Revenue by job week (service date), cancelled jobs excluded.
        db
            .select({ date: bookings.serviceDate, total: sum(bookings.total), n: count() })
            .from(bookings)
            .where(
                and(
                    gte(bookings.serviceDate, firstMonday),
                    sql`${bookings.serviceDate} <= ${addDaysISO(thisMonday, 6)}`,
                    ne(bookings.status, "cancelled"),
                ),
            )
            .groupBy(bookings.serviceDate),
        db
            .select({ margin: sql`coalesce(sum(${bookings.total} - ${bookings.providerPay}), 0)` })
            .from(bookings)
            .where(and(inArray(bookings.status, ["assigned", "confirmed", "in_progress"]), isNotNull(bookings.providerPay))),
        db
            .select({ name: categories.name, slug: categories.slug, n: count() })
            .from(bookings)
            .innerJoin(categories, eq(bookings.categoryId, categories.id))
            .where(ne(bookings.status, "cancelled"))
            .groupBy(categories.name, categories.slug)
            .orderBy(desc(count()))
            .limit(5),
        getProvidersFull(),
        db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(10),
    ]);

    const weeks = Array.from({ length: 8 }, (_, i) => ({ start: addDaysISO(firstMonday, i * 7), revenue: 0, bookings: 0 }));
    for (const r of weekRows) {
        const w = weeks.find((x) => r.date >= x.start && r.date <= addDaysISO(x.start, 6));
        if (w) {
            w.revenue += num(r.total);
            w.bookings += r.n;
        }
    }
    const weekly = weeks.map((w) => {
        const [, m, d] = w.start.split("-").map(Number);
        const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
        return { week: `${d} ${month}`, revenue: Math.round(w.revenue), bookings: w.bookings };
    });
    const thisWeek = weekly.at(-1);
    const lastWeek = weekly.at(-2);
    const revDelta = lastWeek.revenue > 0 ? Math.round(((thisWeek.revenue - lastWeek.revenue) / lastWeek.revenue) * 100) : null;

    const compliance = allProviders
        .filter((p) => p.status === "active" || p.status === "onboarding")
        .filter((p) => !p.compliant || p.expiring.length)
        .map((p) => ({
            id: p.id,
            name: p.name,
            issue: !p.compliant
                ? `${p.missing.join(", ")} missing or not verified`
                : `${p.expiring.map((d) => d.type.replace("_", " ")).join(", ")} expiring soon`,
        }));

    return {
        today,
        unassigned: unassigned.map((b) => ({ ...b, total: num(b.total) })),
        todays,
        weekly,
        thisWeekRevenue: thisWeek.revenue,
        revDelta,
        margin: num(marginRow.margin),
        top,
        compliance,
        activity: activity.map((a) => ({ id: a.id, who: a.actorName, what: a.message, when: a.createdAt.toISOString() })),
    };
}