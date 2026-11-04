// src/db/seed.js
/**
 * Loads the starter data into an empty database.
 *
 *   npm run db:seed            → seeds an empty database (refuses if data already exists)
 *   npm run db:seed -- --reset → WIPES every table, then seeds again (dev only!)
 *
 * Run `npm run db:push` first so the tables exist.
 */
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as s from "./schema.js";
import * as d from "./seed-data.js";
import { site } from "../lib/site.js";
import { hobartToUTC } from "../lib/dates.js";
import { databaseUrl } from "./url.js";

loadEnvConfig(process.cwd()); // loads .env.local like Next.js does

const RESET = process.argv.includes("--reset");

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
    process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl() });
const db = drizzle(pool, { schema: s });

const money = (n) => (Math.round(Number(n || 0) * 100) / 100).toFixed(2);
const payTypes = { "Per job": "per_job", Hourly: "hourly", Commission: "commission" };
const docTypes = { abn: "abn", insurance: "insurance", policeCheck: "police_check", licence: "licence" };

async function main() {
    const [{ count }] = (await db.execute(sql`select count(*)::int as count from categories`)).rows;
    if (count > 0 && !RESET) {
        console.error("The database already has data. Use `npm run db:seed -- --reset` to wipe it and seed again.");
        process.exit(1);
    }

    await db.transaction(async (tx) => {
        if (RESET) {
            console.log("Wiping all tables…");
            await tx.execute(sql`
        truncate table verifications, accounts, sessions, activity_log, site_settings, partner_applications, enquiries, faqs, banners, posts, pages,
          coupons, reviews, payouts, payments, booking_events, booking_add_ons, bookings, provider_documents,
          provider_zones, provider_skills, providers, add_ons, packages, categories, addresses, suburbs, zones, users
        restart identity cascade`);
        }

        /* Areas ---------------------------------------------------------------- */
        const zoneRows = await tx
            .insert(s.zones)
            .values(d.zones.map((name, i) => ({ name, sortOrder: i })))
            .returning();
        const zoneId = Object.fromEntries(zoneRows.map((z) => [z.name, z.id]));

        const suburbRows = await tx
            .insert(s.suburbs)
            .values(
                d.suburbs.map((x) => ({ name: x.name, postcode: x.postcode, zoneId: zoneId[x.zone], surcharge: money(x.surcharge) })),
            )
            .returning();
        const suburbId = Object.fromEntries(suburbRows.map((x) => [x.name, x.id]));

        /* Catalogue ------------------------------------------------------------- */
        const catRows = await tx
            .insert(s.categories)
            .values(
                d.categories.map((c, i) => ({
                    slug: c.slug,
                    name: c.name,
                    group: c.group,
                    icon: c.icon,
                    short: c.short,
                    description: c.description,
                    priceUnit: c.priceUnit ?? null,
                    includes: c.includes,
                    faqs: c.faqs,
                    heroImage: d.categoryImages[c.slug] ?? null,
                    seoTitle: `${c.name} in Hobart`,
                    seoDescription: c.description.slice(0, 300),
                    sortOrder: i,
                    featured: Boolean(c.popular),
                    status: "published",
                })),
            )
            .returning();
        const catId = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));

        const pkgRows = await tx
            .insert(s.packages)
            .values(
                d.packages.map((p, i) => ({
                    categoryId: catId[p.category],
                    name: p.name,
                    summary: p.summary,
                    price: money(p.price),
                    priceUnit: d.categories.find((c) => c.slug === p.category)?.priceUnit ?? null,
                    duration: p.duration,
                    includes: p.includes,
                    popular: Boolean(p.popular),
                    sortOrder: i,
                })),
            )
            .returning();
        const pkgId = Object.fromEntries(d.packages.map((p, i) => [p.id, pkgRows[i].id]));
        const pkgPrice = Object.fromEntries(d.packages.map((p) => [p.id, p.price]));

        const aoRows = await tx
            .insert(s.addOns)
            .values(d.addOns.map((a) => ({ categoryId: catId[a.category], name: a.name, price: money(a.price) })))
            .returning();
        const addOnId = Object.fromEntries(d.addOns.map((a, i) => [a.id, aoRows[i].id]));
        const addOnPrice = Object.fromEntries(d.addOns.map((a) => [a.id, a.price]));

        /* Users: admins + customers --------------------------------------------- */
        const adminIds = {};
        for (const a of d.adminUsers) {
            adminIds[a.id] = randomUUID();
            await tx.insert(s.users).values({
                id: adminIds[a.id],
                name: a.name,
                email: a.email,
                emailVerified: true,
                role: "admin",
                teamRole: a.role,
            });
        }
        const adminByFirstName = Object.fromEntries(d.adminUsers.map((a) => [a.name.split(" ")[0], adminIds[a.id]]));
        const ownerId = adminIds[d.adminUsers[0].id];

        const userId = {};
        for (const c of d.customers) {
            userId[c.id] = randomUUID();
            await tx.insert(s.users).values({
                id: userId[c.id],
                name: c.name,
                email: c.email,
                emailVerified: true,
                phone: c.phone,
                role: "customer",
                blocked: c.status === "blocked",
                createdAt: new Date(`${c.joined}T09:00:00+11:00`),
                updatedAt: new Date(`${c.joined}T09:00:00+11:00`),
            });
            // Default address = the address from their first booking
            const first = d.bookings.find((b) => b.customerId === c.id);
            if (first) {
                await tx.insert(s.addresses).values({
                    userId: userId[c.id],
                    label: "Home",
                    line1: first.address.split(",")[0].trim(),
                    suburbId: suburbId[first.suburb],
                    accessNotes: first.notes ?? null,
                    isDefault: true,
                });
            }
        }

        /* Providers ------------------------------------------------------------- */
        const providerId = {};
        for (const p of d.providers) {
            const [row] = await tx
                .insert(s.providers)
                .values({
                    name: p.name,
                    business: p.business,
                    email: p.email,
                    phone: p.phone,
                    abn: null,
                    status: p.status,
                    payType: payTypes[p.payType] ?? "per_job",
                    payRate: p.rate,
                    availability: p.availability,
                    rating: p.rating.toFixed(1),
                    notes: p.notes ?? null,
                    createdAt: new Date(`${p.joined}T09:00:00+11:00`),
                    updatedAt: new Date(`${p.joined}T09:00:00+11:00`),
                })
                .returning();
            providerId[p.id] = row.id;
            await tx.insert(s.providerSkills).values(p.skills.map((slug) => ({ providerId: row.id, categoryId: catId[slug] })));
            await tx.insert(s.providerZones).values(p.zones.map((z) => ({ providerId: row.id, zoneId: zoneId[z] })));
            const docs = Object.entries(p.docs)
                .filter(([, v]) => v !== null) // null = not required for this provider
                .map(([k, v]) => ({
                    providerId: row.id,
                    type: docTypes[k],
                    verified: Boolean(v),
                    expiresOn: v && (k === "insurance" || k === "policeCheck") ? "2027-06-30" : null,
                }));
            if (docs.length) await tx.insert(s.providerDocuments).values(docs);
        }

        /* Bookings -------------------------------------------------------------- */
        const bookingId = {};
        for (const b of d.bookings) {
            const sub = d.suburbs.find((x) => x.name === b.suburb);
            const subtotal = pkgPrice[b.packageId] + b.addOns.reduce((t, id) => t + addOnPrice[id], 0);
            const surcharge = sub?.surcharge ?? 0;
            const discount = Math.max(0, subtotal + surcharge - b.total);
            const createdAt = new Date(b.createdAt);
            const [row] = await tx
                .insert(s.bookings)
                .values({
                    reference: b.id,
                    userId: userId[b.customerId],
                    categoryId: catId[b.category],
                    packageId: pkgId[b.packageId],
                    providerId: b.providerId ? providerId[b.providerId] : null,
                    status: b.status,
                    paymentStatus: b.payment,
                    addressLine: b.address,
                    suburbId: suburbId[b.suburb],
                    accessNotes: b.notes ?? null,
                    serviceDate: b.date,
                    timeSlot: b.slot,
                    subtotal: money(subtotal),
                    discount: money(discount),
                    surcharge: money(surcharge),
                    total: money(b.total),
                    providerPay: b.providerPay ? money(b.providerPay) : null,
                    createdAt,
                    updatedAt: createdAt,
                })
                .returning();
            bookingId[b.id] = row.id;

            if (b.addOns.length) {
                await tx
                    .insert(s.bookingAddOns)
                    .values(b.addOns.map((id) => ({ bookingId: row.id, addOnId: addOnId[id], price: money(addOnPrice[id]) })));
            }

            const events = [{ bookingId: row.id, type: "created", message: "Booking placed online", createdAt }];
            if (b.providerId) {
                const p = d.providers.find((x) => x.id === b.providerId);
                events.push({
                    bookingId: row.id,
                    type: "assigned",
                    message: `Assigned to ${p.name} (${p.business})`,
                    actorId: ownerId,
                    createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
                });
            }
            if (b.status === "cancelled") {
                events.push({ bookingId: row.id, type: "status", message: "Booking cancelled", createdAt });
            }
            for (const m of d.bookingMessages[b.id] ?? []) {
                events.push({
                    bookingId: row.id,
                    type: m.from === "team" ? "message_team" : "message_customer",
                    message: m.text,
                    actorId: m.from === "team" ? ownerId : userId[b.customerId],
                    createdAt: new Date(m.at),
                });
            }
            await tx.insert(s.bookingEvents).values(events);

            if (b.payment !== "unpaid") {
                const amount = b.payment === "partial" ? Math.round(b.total * 0.2) : b.total;
                await tx.insert(s.payments).values({
                    bookingId: row.id,
                    provider: "manual",
                    amount: money(amount),
                    status: b.payment === "refunded" ? "refunded" : "succeeded",
                    createdAt,
                });
            }
        }

        /* Payouts --------------------------------------------------------------- */
        await tx.insert(s.payouts).values(
            d.payouts.map((p) => {
                const period = d.payoutPeriods[p.period];
                return {
                    providerId: providerId[p.providerId],
                    periodStart: period.start,
                    periodEnd: period.end,
                    amount: money(p.amount),
                    jobs: p.jobs,
                    status: p.status,
                    paidAt: p.status === "paid" ? hobartToUTC("2026-10-31", "10:00:00") : null,
                };
            }),
        );

        /* Reviews --------------------------------------------------------------- */
        for (const r of d.reviews) {
            // "Sophie M." → match the customer "Sophie Mitchell" if there is one
            const [first, initial = ""] = r.name.replace(".", "").split(" ");
            const customer = d.customers.find((c) => c.name.startsWith(`${first} ${initial}`));
            await tx.insert(s.reviews).values({
                userId: customer ? userId[customer.id] : null,
                categoryId: catId[r.category],
                authorName: r.name,
                authorSuburb: r.suburb,
                rating: r.rating,
                body: r.text,
                status: r.status,
                createdAt: new Date(`${r.date}T12:00:00+11:00`),
                updatedAt: new Date(`${r.date}T12:00:00+11:00`),
            });
        }

        /* Coupons --------------------------------------------------------------- */
        await tx.insert(s.coupons).values(
            d.coupons.map((c) => ({
                code: c.code,
                description: c.description,
                type: c.type,
                value: money(c.value),
                minSpend: money(c.minSpend),
                usageLimit: c.limit,
                usedCount: c.uses,
                categoryIds: null,
                expiresAt: c.expires ? hobartToUTC(c.expires, "23:59:59") : null,
                restriction: c.restriction ?? "anyone",
                active: c.active,
            })),
        );

        /* CMS ------------------------------------------------------------------- */
        await tx.insert(s.pages).values(
            d.cmsPages.map((p) => ({
                slug: p.slug,
                title: p.title,
                blocks: [],
                status: p.status,
                updatedAt: new Date(`${p.updated}T09:00:00+11:00`),
            })),
        );

        await tx.insert(s.posts).values(
            d.blogPosts.map((p) => ({
                slug: p.slug,
                title: p.title,
                excerpt: p.excerpt,
                category: p.category,
                status: p.status,
                // Only the first guide has body text in the starter data.
                blocks: p.slug === "huntsman-season-hobart" ? d.blogBody.map((text, i) => ({ id: i + 1, type: "text", text })) : [],
                publishedAt: p.status === "published" ? new Date(`${p.date}T09:00:00+11:00`) : null,
                createdAt: new Date(`${p.date}T09:00:00+11:00`),
                updatedAt: new Date(`${p.date}T09:00:00+11:00`),
            })),
        );

        await tx
            .insert(s.banners)
            .values(d.banners.map((b) => ({ text: b.text, link: b.link, placement: b.placement, active: b.active })));

        await tx
            .insert(s.faqs)
            .values([
                ...d.faqs.map((f, i) => ({ question: f.q, answer: f.a, section: "general", sortOrder: i })),
                ...d.paymentFaqs.map((f, i) => ({ question: f.q, answer: f.a, section: "payments", sortOrder: i })),
            ]);

        /* Inbox ----------------------------------------------------------------- */
        await tx.insert(s.enquiries).values(
            d.enquiries.map((e) => ({
                name: e.name,
                email: e.email,
                type: e.type,
                bookingRef: e.subject.match(/HD-\d{5}/)?.[0] ?? null,
                subject: e.subject,
                message: e.message,
                status: e.status,
                createdAt: new Date(`${e.date}T10:00:00+11:00`),
                updatedAt: new Date(`${e.date}T10:00:00+11:00`),
            })),
        );

        await tx.insert(s.partnerApplications).values(
            d.partnerApplications.map((a) => ({
                name: a.name,
                business: a.business,
                email: d.applicationContacts[a.id].email,
                phone: d.applicationContacts[a.id].phone,
                abn: d.applicationContacts[a.id].abn,
                experience: d.applicationContacts[a.id].experience,
                skills: a.skills,
                zones: a.zones,
                status: a.status,
                createdAt: new Date(`${a.date}T10:00:00+11:00`),
                updatedAt: new Date(`${a.date}T10:00:00+11:00`),
            })),
        );

        /* Activity log ---------------------------------------------------------- */
        await tx.insert(s.activityLog).values(
            d.activityLog.map((a) => ({
                actorId: adminByFirstName[a.who.split(" ")[0]] ?? null,
                actorName: a.who,
                message: a.what,
                createdAt: new Date(a.when),
            })),
        );

        /* Settings -------------------------------------------------------------- */
        const { url: _url, ...business } = site; // the site URL comes from NEXT_PUBLIC_SITE_URL, not the DB
        await tx.insert(s.siteSettings).values([
            { key: "business", value: { ...business, gst: "registered" } },
            { key: "booking", value: { ...d.bookingRules, timeSlots: d.timeSlots } },
            { key: "images", value: d.images },
            { key: "offers", value: { seasonal: d.seasonalServices } },
        ]);
    });

    const counts = (
        await db.execute(sql`
      select (select count(*) from categories)::int as categories, (select count(*) from packages)::int as packages,
             (select count(*) from suburbs)::int as suburbs, (select count(*) from providers)::int as providers,
             (select count(*) from users)::int as users, (select count(*) from bookings)::int as bookings,
             (select count(*) from reviews)::int as reviews`)
    ).rows[0];
    console.log("Seed complete:", counts);
}

main()
    .catch((err) => {
        console.error("Seed failed:", err);
        process.exitCode = 1;
    })
    .finally(() => pool.end());