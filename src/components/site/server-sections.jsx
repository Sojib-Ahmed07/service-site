// src/components/site/server-sections.jsx
/**
 * Server-only sections that load their own data from the database.
 * Import these in pages (Server Components) only — never in a "use client" file.
 */
import "server-only";
import { CtaBandView, ReviewWallView, TrustStripView } from "@/components/site/sections";
import { getPublishedReviews } from "@/server/queries/catalog";
import { getBusiness, getImages } from "@/server/queries/settings";

/** Latest published reviews, optionally for one service (falls back to any service). */
export async function ReviewWall({ category }) {
    const reviews = await getPublishedReviews(category ?? null, 3);
    return <ReviewWallView reviews={reviews} />;
}

export async function TrustStrip(props) {
    const business = await getBusiness();
    return <TrustStripView {...props} business={business} />;
}

export async function CtaBand(props) {
    const images = await getImages();
    return <CtaBandView {...props} image={images.kitchen} />;
}