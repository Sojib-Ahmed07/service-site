// src/server/queries/content.js
/** Public content: CMS pages, FAQs, banners, blog posts and live offers. */
import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { banners, coupons, faqs, pages, posts } from "@/db/schema";
import { pageDefaults } from "@/db/content-defaults";
import { builtInPages, fillVars, isBuiltInPage } from "@/lib/cms";
import { getContentVars } from "@/server/queries/settings";

/** Fills {variables} in a block's text fields. */
function fillBlock(b, vars) {
    const out = { ...b };
    if (out.text) out.text = fillVars(out.text, vars);
    if (out.alt) out.alt = fillVars(out.alt, vars);
    if (Array.isArray(out.items)) {
        out.items = out.items.map((i) => ({ title: fillVars(i.title, vars), body: fillVars(i.body, vars) }));
    }
    return out;
}

/**
 * A page's content with {variables} filled in, or null.
 * Built-in pages (/about, /terms…) always return something, falling back to the
 * starting content if the row is missing. Other pages must be published.
 */
export const getPage = cache(async (slug) => {
    const [row, vars] = await Promise.all([
        db
            .select()
            .from(pages)
            .where(eq(pages.slug, slug))
            .limit(1)
            .then((r) => r[0]),
        getContentVars(),
    ]);
    const builtIn = isBuiltInPage(slug);
    if (!row && !builtIn) return null;
    if (row && !builtIn && row.status !== "published") return null;
    const d = pageDefaults[slug] ?? { title: builtInPages.find((p) => p.slug === slug)?.title ?? "", intro: "", blocks: [] };
    const src = row ?? { ...d, seoTitle: null, seoDescription: null, updatedAt: null };
    const title = fillVars(src.title, vars);
    const intro = fillVars(src.intro ?? "", vars);
    return {
        slug,
        title,
        intro,
        blocks: (src.blocks ?? []).map((b) => fillBlock(b, vars)),
        seoTitle: fillVars(src.seoTitle || "", vars) || title,
        seoDescription: fillVars(src.seoDescription || "", vars) || intro,
        updatedAt: src.updatedAt ? src.updatedAt.toISOString() : null,
    };
});

/** generateMetadata() helper for CMS-driven pages. */
export async function pageMetadata(slug) {
    const page = await getPage(slug);
    if (!page) return {};
    return { title: page.seoTitle, description: page.seoDescription || undefined };
}

/** General FAQs by section ("general" | "payments"), as { q, a } for <Accordion />. */
export const getFaqs = cache(async (section = "general") => {
    const rows = await db
        .select()
        .from(faqs)
        .where(and(eq(faqs.section, section), isNull(faqs.categoryId)))
        .orderBy(asc(faqs.sortOrder), asc(faqs.id));
    const vars = await getContentVars();
    return rows.map((f) => ({ q: fillVars(f.question, vars), a: fillVars(f.answer, vars) }));
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
    if (!row) return null;
    const vars = await getContentVars();
    return { text: fillVars(row.text, vars), link: row.link || "/" };
});

/** Reading time from the post's text blocks (about 220 words a minute). */
function readTime(p) {
    const text = [p.excerpt, p.body, ...(p.blocks ?? []).map((b) => b.text ?? "")].join(" ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.round(words / 220))} min`;
}

function toPost(p, vars) {
    return {
        id: p.id,
        slug: p.slug,
        title: fillVars(p.title, vars),
        excerpt: fillVars(p.excerpt ?? "", vars),
        category: p.category ?? "",
        coverImage: p.coverImage,
        date: (p.publishedAt ?? p.createdAt).toISOString(),
        readTime: readTime(p),
        blocks: (p.blocks ?? []).map((b) => fillBlock(b, vars)),
        body: fillVars(p.body ?? "", vars),
    };
}

const publishedNow = () => and(eq(posts.status, "published"), lte(posts.publishedAt, new Date()));

/** Published blog posts, newest first. */
export const getPublishedPosts = cache(async () => {
    const [rows, vars] = await Promise.all([
        db.select().from(posts).where(publishedNow()).orderBy(desc(posts.publishedAt)),
        getContentVars(),
    ]);
    return rows.map((p) => toPost(p, vars));
});

/** One published post by slug, or null. */
export const getPublishedPost = cache(async (slug) => {
    const [row] = await db
        .select()
        .from(posts)
        .where(and(eq(posts.slug, slug), publishedNow()))
        .limit(1);
    return row ? toPost(row, await getContentVars()) : null;
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