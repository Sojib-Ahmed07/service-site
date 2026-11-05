// src/server/queries/admin-content.js
/** Admin reads for Content (pages, posts, banners, FAQs) and Settings (team). */
import "server-only";
import { asc, desc, eq, isNull, max } from "drizzle-orm";
import { db } from "@/db";
import { banners, faqs, pages, posts, sessions, users } from "@/db/schema";
import { pageDefaults } from "@/db/content-defaults";
import { builtInPages, isBuiltInPage } from "@/lib/cms";

const iso = (d) => (d ? d.toISOString() : null);

/** Every page: built-in pages first (in menu order), then custom pages by title. */
export async function listPagesAdmin() {
    const rows = await db.select().from(pages).orderBy(asc(pages.title));
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    const builtIn = builtInPages.map((b) => {
        const r = bySlug.get(b.slug);
        return {
            id: r?.id ?? null,
            slug: b.slug,
            title: r?.title ?? pageDefaults[b.slug]?.title ?? b.title,
            status: "published",
            builtIn: true,
            updatedAt: iso(r?.updatedAt),
        };
    });
    const custom = rows
        .filter((r) => r.slug !== "/" && !isBuiltInPage(r.slug))
        .map((r) => ({ id: r.id, slug: r.slug, title: r.title, status: r.status, builtIn: false, updatedAt: iso(r.updatedAt) }));
    return [...builtIn, ...custom];
}

const blankPage = { id: null, title: "", intro: "", slug: "", blocks: [], seoTitle: "", seoDescription: "", status: "draft" };

/**
 * One page for the editor. `key` is a page id, "new", or a built-in slug without the
 * slash (e.g. "about") for built-in pages that have no row yet.
 */
export async function getPageForEdit(key) {
    if (key === "new") return { ...blankPage, builtIn: false };
    let row = null;
    if (/^\d+$/.test(key)) {
        [row] = await db.select().from(pages).where(eq(pages.id, Number(key))).limit(1);
    } else {
        const slug = `/${key}`;
        if (!isBuiltInPage(slug)) return null;
        [row] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
        if (!row) {
            const d = pageDefaults[slug] ?? {};
            return { ...blankPage, ...d, slug, status: "published", builtIn: true };
        }
    }
    if (!row || row.slug === "/") return null;
    return {
        id: row.id,
        title: row.title,
        intro: row.intro ?? "",
        slug: row.slug,
        blocks: row.blocks ?? [],
        seoTitle: row.seoTitle ?? "",
        seoDescription: row.seoDescription ?? "",
        status: row.status,
        builtIn: isBuiltInPage(row.slug),
        updatedAt: iso(row.updatedAt),
    };
}

export async function listPostsAdmin() {
    const rows = await db
        .select({
            id: posts.id,
            slug: posts.slug,
            title: posts.title,
            category: posts.category,
            status: posts.status,
            publishedAt: posts.publishedAt,
            updatedAt: posts.updatedAt,
        })
        .from(posts)
        .orderBy(desc(posts.updatedAt));
    return rows.map((p) => ({ ...p, category: p.category ?? "", publishedAt: iso(p.publishedAt), updatedAt: iso(p.updatedAt) }));
}

export async function getPostForEdit(key) {
    if (key === "new") {
        return { id: null, title: "", slug: "", excerpt: "", category: "", coverImage: "", blocks: [], status: "draft", publishedAt: null };
    }
    if (!/^\d+$/.test(key)) return null;
    const [p] = await db.select().from(posts).where(eq(posts.id, Number(key))).limit(1);
    if (!p) return null;
    // Older posts may only have plain body text: turn it into paragraphs for the editor.
    const blocks = p.blocks?.length
        ? p.blocks
        : (p.body ?? "")
            .split(/\n{2,}/)
            .map((t) => t.trim())
            .filter(Boolean)
            .map((text, i) => ({ id: i + 1, type: "text", text }));
    return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt ?? "",
        category: p.category ?? "",
        coverImage: p.coverImage ?? "",
        blocks,
        status: p.status,
        publishedAt: iso(p.publishedAt),
    };
}

/** Post categories already used, for the editor's suggestions. */
export async function getPostCategories() {
    const rows = await db.selectDistinct({ c: posts.category }).from(posts);
    return rows
        .map((r) => r.c)
        .filter(Boolean)
        .sort();
}

export async function getBannersAdmin() {
    const rows = await db.select().from(banners).orderBy(asc(banners.placement), desc(banners.id));
    return rows.map((b) => ({ ...b, link: b.link ?? "", startsAt: iso(b.startsAt), endsAt: iso(b.endsAt) }));
}

/** General and payment FAQs (service FAQs live on each service). */
export async function getFaqsAdmin() {
    const rows = await db
        .select({ id: faqs.id, question: faqs.question, answer: faqs.answer, section: faqs.section, sortOrder: faqs.sortOrder })
        .from(faqs)
        .where(isNull(faqs.categoryId))
        .orderBy(asc(faqs.section), asc(faqs.sortOrder), asc(faqs.id));
    return rows;
}

/** Admin team with when they were last seen. */
export async function getTeam() {
    const rows = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            teamRole: users.teamRole,
            blocked: users.blocked,
            lastSeen: max(sessions.updatedAt),
        })
        .from(users)
        .leftJoin(sessions, eq(sessions.userId, users.id))
        .where(eq(users.role, "admin"))
        .groupBy(users.id)
        .orderBy(asc(users.name));
    return rows.map((u) => ({ ...u, teamRole: u.teamRole ?? "Operations", lastSeen: u.lastSeen ? new Date(u.lastSeen).toISOString() : null }));
}