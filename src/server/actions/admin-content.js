// src/server/actions/admin-content.js
"use server";

/** Admin › Content: pages, homepage, banners, FAQs and blog posts. */
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull, max, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activityLog, banners, categories, faqs, pages, posts, siteSettings } from "@/db/schema";
import { bannerPlacements, homeSections, isBuiltInPage, isImageRef, reservedSlugs, slugify } from "@/lib/cms";
import { hobartToUTC, isISODate, todayISO } from "@/lib/dates";
import { logError } from "@/server/errors";
import { getAdmin } from "@/server/session";

const denied = { ok: false, error: "Only admins can do that. Please log in again." };
const failed = (tag, err, msg = "Something went wrong. Please try again.") => {
    logError(tag, err);
    return { ok: false, error: msg };
};
const who = (admin) => `${admin.name.split(" ")[0]} (admin)`;
const activity = (tx, admin, message) => tx.insert(activityLog).values({ actorId: admin.id, actorName: who(admin), message });
const refreshSite = () => revalidatePath("/", "layout");
const firstError = (parsed) => parsed.error.issues[0]?.message ?? "Please check the form.";
const isUnique = (err) => err?.code === "23505" || err?.cause?.code === "23505";

const text = (maxLen) => z.string().trim().max(maxLen, { error: `Keep it under ${maxLen} characters.` });
/** A link on the site ("/services") or a full https:// address. */
const link = z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/\S+$/.test(v), {
        error: "Links must start with / (a page on this site) or https://",
    });
const imageRef = text(500).refine(isImageRef, {
    error: "Images must be an Unsplash photo id (photo-…) or a full https:// address.",
});

/* Content blocks ------------------------------------------------------------ */

const blockId = z.union([z.number(), z.string().max(40)]);
const blockSchema = z.discriminatedUnion("type", [
    z.object({ id: blockId, type: z.literal("heading"), text: text(200) }),
    z.object({ id: blockId, type: z.literal("text"), text: text(5000) }),
    z.object({ id: blockId, type: z.literal("quote"), text: text(1000) }),
    z.object({ id: blockId, type: z.literal("image"), src: imageRef, alt: text(200) }),
    z.object({ id: blockId, type: z.literal("cta"), text: text(60), href: link }),
    z.object({
        id: blockId,
        type: z.literal("cards"),
        style: z.enum(["numbered", "ticks"]),
        items: z.array(z.object({ title: text(120), body: text(600) })).max(12, { error: "Up to 12 cards per block." }),
    }),
]);
const blocksSchema = z.array(blockSchema).max(100, { error: "That’s a lot of blocks — split it into two pages." });

/** Drops blocks that would show nothing on the site. */
function cleanBlocks(blocks) {
    return blocks
        .map((b) => (b.type === "cards" ? { ...b, items: b.items.filter((i) => i.title || i.body) } : b))
        .filter((b) => {
            if (b.type === "image") return b.src;
            if (b.type === "cta") return b.text && b.href;
            if (b.type === "cards") return b.items.length > 0;
            return b.text;
        });
}

/* Pages --------------------------------------------------------------------- */

const pageSchema = z.object({
    id: z.number().int().positive().nullable().optional(),
    builtInSlug: z.string().max(80).nullable().optional(),
    title: z.string().trim().min(1, { error: "Give the page a title." }).max(160),
    intro: text(400),
    slug: text(80),
    blocks: blocksSchema,
    seoTitle: text(160),
    seoDescription: text(300),
    status: z.enum(["draft", "published", "archived"]),
    offers: z
        .object({
            seasonal: z.array(z.string().max(80)).max(8, { error: "Pick up to 8 services." }),
            seasonalTitle: text(120),
            seasonalText: text(300),
        })
        .optional(),
});

export async function savePage(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = pageSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstError(parsed) };
    const d = parsed.data;

    try {
        let existing = null;
        if (d.id) {
            [existing] = await db.select().from(pages).where(eq(pages.id, d.id)).limit(1);
            if (!existing || existing.slug === "/") return { ok: false, error: "That page no longer exists." };
        }
        const builtIn = existing ? isBuiltInPage(existing.slug) : Boolean(d.builtInSlug && isBuiltInPage(d.builtInSlug));
        if (!existing && builtIn) {
            [existing] = await db.select().from(pages).where(eq(pages.slug, d.builtInSlug)).limit(1);
        }

        let slug;
        if (builtIn) {
            slug = existing?.slug ?? d.builtInSlug;
        } else {
            const s = slugify(d.slug.replace(/^\/+/, "") || d.title);
            if (!s) return { ok: false, error: "Enter a URL for the page, e.g. careers." };
            if (reservedSlugs.includes(s)) return { ok: false, error: `/${s} is already used by the site. Pick another URL.` };
            slug = `/${s}`;
        }

        const values = {
            title: d.title,
            intro: d.intro || null,
            blocks: cleanBlocks(d.blocks),
            seoTitle: d.seoTitle || null,
            seoDescription: d.seoDescription || null,
            status: builtIn ? "published" : d.status,
            updatedAt: new Date(),
        };

        let offers = null;
        if (slug === "/offers" && d.offers) {
            const valid = d.offers.seasonal.length
                ? await db.select({ slug: categories.slug }).from(categories).where(inArray(categories.slug, d.offers.seasonal))
                : [];
            offers = {
                seasonal: d.offers.seasonal.filter((s) => valid.some((v) => v.slug === s)),
                seasonalTitle: d.offers.seasonalTitle,
                seasonalText: d.offers.seasonalText,
            };
        }

        const id = await db.transaction(async (tx) => {
            let pageId;
            if (existing) {
                await tx
                    .update(pages)
                    .set({ ...values, slug })
                    .where(eq(pages.id, existing.id));
                pageId = existing.id;
            } else {
                [{ id: pageId }] = await tx
                    .insert(pages)
                    .values({ ...values, slug })
                    .returning({ id: pages.id });
            }
            if (offers) await putSetting(tx, "offers", offers);
            await activity(tx, admin, `${existing ? "Updated" : "Created"} page ${slug}`);
            return pageId;
        });
        refreshSite();
        return { ok: true, id, slug };
    } catch (err) {
        if (isUnique(err)) return { ok: false, error: "Another page already uses that URL." };
        return failed("savePage", err);
    }
}

export async function deletePage(id) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const [p] = await db
            .select()
            .from(pages)
            .where(eq(pages.id, Number(id)))
            .limit(1);
        if (!p) return { ok: true };
        if (p.slug === "/" || isBuiltInPage(p.slug)) return { ok: false, error: "Built-in pages can’t be deleted." };
        await db.transaction(async (tx) => {
            await tx.delete(pages).where(eq(pages.id, p.id));
            await activity(tx, admin, `Deleted page ${p.slug}`);
        });
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("deletePage", err);
    }
}

/* Settings rows (shared with the homepage editor) ------------------------------ */

/** Merges `value` into a site_settings row, keeping fields this form doesn't edit. */
async function putSetting(tx, key, value) {
    const [row] = await tx.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    const merged = { ...(row?.value ?? {}), ...value };
    await tx
        .insert(siteSettings)
        .values({ key, value: merged })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: merged, updatedAt: new Date() } });
}

/* Homepage ------------------------------------------------------------------ */

const homepageSchema = z.object({
    heroTitle: z.string().trim().min(1, { error: "Enter the headline." }).max(120),
    heroText: text(300),
    heroBadge: text(60),
    popularTitle: text(120),
    popularText: text(300),
    howTitle: text(120),
    howText: text(300),
    steps: z
        .array(
            z.object({
                title: z.string().trim().min(1, { error: "Every step needs a title." }).max(80),
                body: text(300),
            }),
        )
        .min(2, { error: "Keep at least two steps." })
        .max(4, { error: "Up to four steps fit." }),
    teamTitle: text(120),
    teamText: text(400),
    teamPoints: z.array(text(80)).max(6),
    reviewsTitle: text(120),
    reviewsText: text(300),
    areasText: text(300),
    faqTitle: text(120),
    ctaTitle: text(120),
    ctaText: text(300),
    sections: z
        .array(z.object({ id: z.enum(homeSections.map((s) => s.id)), visible: z.boolean() }))
        .length(homeSections.length),
    images: z.object({ hero: imageRef, cleaner: imageRef, kitchen: imageRef, livingRoom: imageRef }),
});

export async function saveHomepage(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = homepageSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstError(parsed) };
    const { images, ...home } = parsed.data;
    if (new Set(home.sections.map((s) => s.id)).size !== home.sections.length) {
        return { ok: false, error: "Each section can only appear once." };
    }
    try {
        await db.transaction(async (tx) => {
            await putSetting(tx, "homepage", { ...home, teamPoints: home.teamPoints.filter(Boolean) });
            // Empty photo fields keep the current photo.
            await putSetting(tx, "images", Object.fromEntries(Object.entries(images).filter(([, v]) => v)));
            await activity(tx, admin, "Updated the homepage");
        });
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("saveHomepage", err);
    }
}

/* Banners ------------------------------------------------------------------- */

const dateField = z.string().refine((v) => v === "" || isISODate(v), { error: "Enter a valid date." });
const bannerSchema = z.object({
    id: z.number().int().positive().nullable().optional(),
    text: z.string().trim().min(3, { error: "Enter the banner text." }).max(200),
    link: link,
    placement: z.enum(bannerPlacements),
    active: z.boolean(),
    startsOn: dateField,
    endsOn: dateField,
});

export async function saveBanner(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = bannerSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstError(parsed) };
    const d = parsed.data;
    if (d.startsOn && d.endsOn && d.endsOn < d.startsOn) {
        return { ok: false, error: "The end date is before the start date." };
    }
    const values = {
        text: d.text,
        link: d.link || null,
        placement: d.placement,
        active: d.active,
        startsAt: d.startsOn ? hobartToUTC(d.startsOn, "00:00:00") : null,
        // Shows until the end of the chosen day.
        endsAt: d.endsOn ? hobartToUTC(d.endsOn, "23:59:59") : null,
    };
    try {
        const id = await db.transaction(async (tx) => {
            let bannerId = d.id;
            if (d.id) {
                const r = await tx.update(banners).set(values).where(eq(banners.id, d.id)).returning({ id: banners.id });
                if (!r.length) throw Object.assign(new Error("missing"), { missing: true });
            } else {
                [{ id: bannerId }] = await tx.insert(banners).values(values).returning({ id: banners.id });
            }
            await activity(tx, admin, `${d.id ? "Updated" : "Added"} ${d.placement.toLowerCase()} banner “${d.text.slice(0, 60)}”`);
            return bannerId;
        });
        refreshSite();
        return { ok: true, id };
    } catch (err) {
        if (err.missing) return { ok: false, error: "That banner no longer exists. Refresh the page." };
        return failed("saveBanner", err);
    }
}

export async function deleteBanner(id) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        await db.transaction(async (tx) => {
            const r = await tx
                .delete(banners)
                .where(eq(banners.id, Number(id)))
                .returning({ text: banners.text });
            if (r.length) await activity(tx, admin, `Deleted banner “${r[0].text.slice(0, 60)}”`);
        });
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("deleteBanner", err);
    }
}

/* FAQs ---------------------------------------------------------------------- */

const faqSchema = z.object({
    id: z.number().int().positive().nullable().optional(),
    question: z.string().trim().min(3, { error: "Enter the question." }).max(255),
    answer: z.string().trim().min(1, { error: "Enter the answer." }).max(3000),
    section: z.enum(["general", "payments"]),
});

export async function saveFaq(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = faqSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstError(parsed) };
    const d = parsed.data;
    try {
        const id = await db.transaction(async (tx) => {
            if (d.id) {
                const [old] = await tx
                    .select()
                    .from(faqs)
                    .where(and(eq(faqs.id, d.id), isNull(faqs.categoryId)))
                    .limit(1);
                if (!old) throw Object.assign(new Error("missing"), { missing: true });
                const set = { question: d.question, answer: d.answer, section: d.section };
                if (old.section !== d.section) set.sortOrder = await nextSort(tx, d.section);
                await tx.update(faqs).set(set).where(eq(faqs.id, d.id));
                await activity(tx, admin, `Updated FAQ “${d.question.slice(0, 60)}”`);
                return d.id;
            }
            const [{ id: newId }] = await tx
                .insert(faqs)
                .values({ question: d.question, answer: d.answer, section: d.section, sortOrder: await nextSort(tx, d.section) })
                .returning({ id: faqs.id });
            await activity(tx, admin, `Added FAQ “${d.question.slice(0, 60)}”`);
            return newId;
        });
        refreshSite();
        return { ok: true, id };
    } catch (err) {
        if (err.missing) return { ok: false, error: "That question no longer exists. Refresh the page." };
        return failed("saveFaq", err);
    }
}

async function nextSort(tx, section) {
    const [r] = await tx
        .select({ m: max(faqs.sortOrder) })
        .from(faqs)
        .where(and(eq(faqs.section, section), isNull(faqs.categoryId)));
    return (r?.m ?? -1) + 1;
}

export async function deleteFaq(id) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        await db.transaction(async (tx) => {
            const r = await tx
                .delete(faqs)
                .where(and(eq(faqs.id, Number(id)), isNull(faqs.categoryId)))
                .returning({ q: faqs.question });
            if (r.length) await activity(tx, admin, `Deleted FAQ “${r[0].q.slice(0, 60)}”`);
        });
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("deleteFaq", err);
    }
}

/** Moves a question up (-1) or down (1) within its section. */
export async function moveFaq(id, direction) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (direction !== 1 && direction !== -1) return { ok: false, error: "Invalid move." };
    try {
        await db.transaction(async (tx) => {
            const [f] = await tx
                .select()
                .from(faqs)
                .where(and(eq(faqs.id, Number(id)), isNull(faqs.categoryId)))
                .limit(1);
            if (!f) return;
            const list = await tx
                .select({ id: faqs.id })
                .from(faqs)
                .where(and(eq(faqs.section, f.section), isNull(faqs.categoryId)))
                .orderBy(asc(faqs.sortOrder), asc(faqs.id));
            const ids = list.map((r) => r.id);
            const i = ids.indexOf(f.id);
            const j = i + direction;
            if (j < 0 || j >= ids.length) return;
            [ids[i], ids[j]] = [ids[j], ids[i]];
            // Renumber the whole section so the order is always clean.
            for (let k = 0; k < ids.length; k++) {
                await tx.update(faqs).set({ sortOrder: k }).where(eq(faqs.id, ids[k]));
            }
        });
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("moveFaq", err);
    }
}

/* Blog posts ---------------------------------------------------------------- */

const postSchema = z.object({
    id: z.number().int().positive().nullable().optional(),
    title: z.string().trim().min(3, { error: "Give the post a title." }).max(200),
    slug: text(160),
    excerpt: text(300),
    category: text(60),
    coverImage: imageRef,
    blocks: blocksSchema,
    status: z.enum(["draft", "published", "archived"]),
    publishOn: dateField,
});

export async function savePost(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = postSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstError(parsed) };
    const d = parsed.data;
    const slug = slugify(d.slug || d.title);
    if (!slug) return { ok: false, error: "Enter a URL for the post." };
    try {
        let existing = null;
        if (d.id) {
            [existing] = await db.select().from(posts).where(eq(posts.id, d.id)).limit(1);
            if (!existing) return { ok: false, error: "That post no longer exists." };
        }
        const [clash] = await db
            .select({ id: posts.id })
            .from(posts)
            .where(d.id ? and(eq(posts.slug, slug), ne(posts.id, d.id)) : eq(posts.slug, slug))
            .limit(1);
        if (clash) return { ok: false, error: "Another post already uses that URL." };

        // Publish date: the chosen day (9am Hobart), or now when first published without one.
        const kept = existing?.publishedAt ?? null;
        let publishedAt = null;
        if (d.publishOn) {
            if (kept && todayISO(kept) === d.publishOn) publishedAt = kept; // same day as before: keep the exact time
            else if (d.publishOn === todayISO()) publishedAt = new Date(); // today: live straight away
            else publishedAt = hobartToUTC(d.publishOn, "09:00:00"); // another day: 9am Hobart
        } else if (d.status === "published") {
            // No date: publish now (keeping the original date if it's already live).
            publishedAt = kept && kept <= new Date() ? kept : new Date();
        }

        const values = {
            title: d.title,
            slug,
            excerpt: d.excerpt || null,
            category: d.category || null,
            coverImage: d.coverImage || null,
            blocks: cleanBlocks(d.blocks),
            body: null, // the blocks replace any old plain-text body
            status: d.status,
            publishedAt,
            updatedAt: new Date(),
        };
        const id = await db.transaction(async (tx) => {
            let postId = d.id;
            if (existing) await tx.update(posts).set(values).where(eq(posts.id, d.id));
            else[{ id: postId }] = await tx.insert(posts).values(values).returning({ id: posts.id });
            await activity(tx, admin, `${existing ? "Updated" : "Created"} post “${d.title.slice(0, 60)}” (${d.status})`);
            return postId;
        });
        refreshSite();
        return { ok: true, id, slug };
    } catch (err) {
        if (isUnique(err)) return { ok: false, error: "Another post already uses that URL." };
        return failed("savePost", err);
    }
}

export async function deletePost(id) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        await db.transaction(async (tx) => {
            const r = await tx
                .delete(posts)
                .where(eq(posts.id, Number(id)))
                .returning({ title: posts.title });
            if (r.length) await activity(tx, admin, `Deleted post “${r[0].title.slice(0, 60)}”`);
        });
        refreshSite();
        return { ok: true };
    } catch (err) {
        return failed("deletePost", err);
    }
}