// src/server/queries/content.js
/** Public content: FAQs, banners, blog posts and live offers. */
import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { banners, coupons, faqs, posts } from "@/db/schema";

/** General FAQs by section ("general" | "payments"), as { q, a } for <Accordion />. */
export const getFaqs = cache(async (section = "general") => {
    const rows = await db
        .select()
        .from(faqs)
        .where(and(eq(faqs.section, section), isNull(faqs.categoryId)))
        .orderBy(asc(faqs.sortOrder), asc(faqs.id));
    return rows.map((f) => ({ q: f.question, a: f.answer }));
});

/** The live banner for a placement ("Top bar" | "Home hero" | "Service pages"), or null. */
export const getBanner = cache(async (placement) => {
    const now = new Date();
    const [row] = await db
        .select()
        .from(banners)
        .where(
            and(
                eq(banners.placement, placement),
                eq(banners.active, true),
                or(isNull(banners.startsAt), lte(banners.startsAt, now)),
                or(isNull(banners.endsAt), gt(banners.endsAt, now)),
            ),
        )
        .orderBy(desc(banners.id))
        .limit(1);
    return row ? { text: row.text, link: row.link || "/" } : null;
});

/** Reading time from the post's text blocks (about 220 words a minute). */
function readTime(p) {
    const text = [p.excerpt, p.body, ...(p.blocks ?? []).map((b) => b.text ?? "")].join(" ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.round(words / 220))} min`;
}

function toPost(p) {
    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt ?? "",
        category: p.category ?? "",
        coverImage: p.coverImage,
        date: (p.publishedAt ?? p.createdAt).toISOString(),
        readTime: readTime(p),
        blocks: p.blocks ?? [],
        body: p.body ?? "",
    };
}

const publishedNow = () => and(eq(posts.status, "published"), lte(posts.publishedAt, new Date()));

/** Published blog posts, newest first. */
export const getPublishedPosts = cache(async () => {
    const rows = await db.select().from(posts).where(publishedNow()).orderBy(desc(posts.publishedAt));
    return rows.map(toPost);
});

/** One published post by slug, or null. */
export const getPublishedPost = cache(async (slug) => {
    const [row] = await db
        .select()
        .from(posts)
        .where(and(eq(posts.slug, slug), publishedNow()))
        .limit(1);
    return row ? toPost(row) : null;
});

/** Coupons customers can use right now (active, not expired, not used up). */
export const getLiveCoupons = cache(async () => {
    const now = new Date();
    const rows = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.active, true), or(isNull(coupons.expiresAt), gt(coupons.expiresAt, now))))
        .orderBy(asc(coupons.code));
    return rows
        .filter((c) => c.usageLimit === null || c.usedCount < c.usageLimit)
        .map((c) => ({
            code: c.code,
            type: c.type,
            value: Number(c.value),
            minSpend: Number(c.minSpend ?? 0),
            expires: c.expiresAt ? c.expiresAt.toISOString() : null,
            description: c.description ?? "",
            restriction: c.restriction ?? "anyone",
            categoryIds: c.categoryIds ?? null,
        }));
});