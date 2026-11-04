// src/server/queries/catalog.js
/**
 * Public catalogue: services (categories), packages, extras, areas and reviews.
 * Every function returns plain objects in the shapes the UI components expect.
 */
import "server-only";
import { cache } from "react";
import { and, asc, avg, count, desc, eq, min } from "drizzle-orm";
import { db } from "@/db";
import { addOns, categories, packages, reviews, suburbs, zones } from "@/db/schema";

const num = (v) => (v === null || v === undefined ? null : Number(v));

/** Average rating + review count per category (published reviews only). */
const reviewStats = cache(async () => {
    const rows = await db
        .select({ categoryId: reviews.categoryId, rating: avg(reviews.rating), total: count() })
        .from(reviews)
        .where(eq(reviews.status, "published"))
        .groupBy(reviews.categoryId);
    return new Map(rows.map((r) => [r.categoryId, { rating: Math.round(Number(r.rating) * 10) / 10, total: r.total }]));
});

/** Lowest active package price per category. */
const fromPrices = cache(async () => {
    const rows = await db
        .select({ categoryId: packages.categoryId, price: min(packages.price) })
        .from(packages)
        .where(eq(packages.active, true))
        .groupBy(packages.categoryId);
    return new Map(rows.map((r) => [r.categoryId, Number(r.price)]));
});

function toCategory(row, stats, prices) {
    const s = stats.get(row.id);
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        icon: row.icon,
        group: row.group,
        short: row.short ?? "",
        description: row.description ?? "",
        fromPrice: prices.get(row.id) ?? null,
        priceUnit: row.priceUnit ?? undefined,
        popular: row.featured,
        rating: s?.rating ?? null,
        reviews: s?.total ?? 0,
        includes: row.includes ?? [],
        faqs: row.faqs ?? [],
        image: row.heroImage ?? "",
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
    };
}

/**
 * Published services that can be booked (at least one active package), in display order.
 */
export const getCategories = cache(async () => {
    const [rows, stats, prices] = await Promise.all([
        db
            .select()
            .from(categories)
            .where(eq(categories.status, "published"))
            .orderBy(asc(categories.sortOrder), asc(categories.name)),
        reviewStats(),
        fromPrices(),
    ]);
    return rows.filter((r) => prices.has(r.id)).map((r) => toCategory(r, stats, prices));
});

/**
 * Just what cards, menus and search need (keeps big fields like FAQs out of the
 * data sent to the browser for client components).
 */
export const toCard = (c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    group: c.group,
    short: c.short,
    description: c.description,
    fromPrice: c.fromPrice,
    priceUnit: c.priceUnit,
    popular: c.popular,
    rating: c.rating,
    reviews: c.reviews,
    image: c.image,
});

/** One published, bookable service by slug, or null. */
export const getCategory = cache(async (slug) => {
    const all = await getCategories();
    return all.find((c) => c.slug === slug) ?? null;
});

/** Active packages for a service, cheapest-first within the admin's sort order. */
export const getPackagesFor = cache(async (category) => {
    const rows = await db
        .select()
        .from(packages)
        .where(and(eq(packages.categoryId, category.id), eq(packages.active, true)))
        .orderBy(asc(packages.sortOrder), asc(packages.price));
    return rows.map((p) => ({
        id: String(p.id),
        category: category.slug,
        name: p.name,
        price: Number(p.price),
        priceUnit: p.priceUnit ?? undefined,
        duration: p.duration ?? "",
        summary: p.summary ?? "",
        includes: p.includes ?? [],
        popular: p.popular,
    }));
});

/** Active extras for a service. */
export const getAddOnsFor = cache(async (category) => {
    const rows = await db
        .select()
        .from(addOns)
        .where(and(eq(addOns.categoryId, category.id), eq(addOns.active, true)))
        .orderBy(asc(addOns.id));
    return rows.map((a) => ({ id: String(a.id), category: category.slug, name: a.name, price: Number(a.price) }));
});

/**
 * Service areas: active zones (names, in order) and their active suburbs.
 * suburb = { id, name, postcode, zone, surcharge }
 */
export const getAreas = cache(async () => {
    const rows = await db
        .select({
            id: suburbs.id,
            name: suburbs.name,
            postcode: suburbs.postcode,
            surcharge: suburbs.surcharge,
            zone: zones.name,
        })
        .from(suburbs)
        .innerJoin(zones, eq(suburbs.zoneId, zones.id))
        .where(and(eq(suburbs.active, true), eq(zones.active, true)))
        .orderBy(asc(zones.sortOrder), asc(zones.name), asc(suburbs.name));
    const zoneNames = [...new Set(rows.map((r) => r.zone))];
    return {
        zones: zoneNames,
        suburbs: rows.map((r) => ({ ...r, surcharge: num(r.surcharge) || 0 })),
    };
});

/**
 * Published reviews for the review walls. Falls back to the latest reviews of any
 * service when the requested one has none yet.
 */
export const getPublishedReviews = cache(async (categorySlug = null, limit = 3) => {
    const base = db
        .select({
            id: reviews.id,
            name: reviews.authorName,
            suburb: reviews.authorSuburb,
            rating: reviews.rating,
            text: reviews.body,
            reply: reviews.reply,
            date: reviews.createdAt,
            category: categories.slug,
            categoryName: categories.name,
        })
        .from(reviews)
        .innerJoin(categories, eq(reviews.categoryId, categories.id));

    const latest = (where) => base.where(where).orderBy(desc(reviews.featured), desc(reviews.createdAt)).limit(limit);

    let rows = categorySlug ? await latest(and(eq(reviews.status, "published"), eq(categories.slug, categorySlug))) : [];
    if (!rows.length) rows = await latest(eq(reviews.status, "published"));
    return rows.map((r) => ({ ...r, name: r.name || "Verified customer", suburb: r.suburb || "", text: r.text || "" }));
});

/** Site-wide rating summary for the home page hero. */
export const getRatingSummary = cache(async () => {
    const [row] = await db
        .select({ rating: avg(reviews.rating), total: count() })
        .from(reviews)
        .where(eq(reviews.status, "published"));
    return { rating: row.total ? Math.round(Number(row.rating) * 10) / 10 : null, total: row.total };
});

/** Several services by slug, keeping the given order (used for "In season now"). */
export async function getCategoriesBySlugs(slugs) {
    if (!slugs?.length) return [];
    const all = await getCategories();
    return slugs.map((s) => all.find((c) => c.slug === s)).filter(Boolean);
}

/** Valid category slugs and zone names, for validating form input. */
export async function getSkillAndZoneOptions() {
    const [cats, areas] = await Promise.all([getCategories(), getAreas()]);
    return { slugs: cats.map((c) => c.slug), zones: areas.zones };
}