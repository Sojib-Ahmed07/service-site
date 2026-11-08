// src/app/(site)/[slug]/page.jsx
/** Pages created in Admin › Content › Pages (e.g. /careers). Built-in routes always win. */
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/sections";
import { PageBody } from "@/components/site/blocks";
import { CtaBand } from "@/components/site/server-sections";
import { getPage } from "@/server/queries/content";
import { isBuiltInPage } from "@/lib/cms";

/** Custom page slugs are lowercase letters, numbers and dashes (see slugify in lib/cms.js). */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function load(params) {
    const { slug } = await params;
    const clean = String(slug ?? "").toLowerCase();
    // Requests like /favicon.ico or /robots.txt can't be pages: 404 straight away, no database query.
    if (!SLUG.test(clean) || clean.length > 120) return null;
    const path = `/${clean}`;
    // Built-in pages have their own routes; never render them twice.
    if (isBuiltInPage(path)) return null;
    return getPage(path);
}

export async function generateMetadata({ params }) {
    const page = await load(params);
    return page ? { title: page.seoTitle, description: page.seoDescription || undefined } : {};
}

export default async function CustomPage({ params }) {
    const page = await load(params);
    if (!page) notFound();
    return (
        <>
            <PageHero title={page.title} body={page.intro} />
            <PageBody blocks={page.blocks} />
            <CtaBand />
        </>
    );
}