// src/server/queries/settings.js
import "server-only";
import { cache } from "react";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { site as defaults } from "@/lib/site";

/** Fallbacks used only if a settings row is missing (e.g. a fresh database before seeding). */
const fallback = {
    business: defaults,
    booking: {
        minNoticeHours: 24,
        windowDays: 14,
        freeCancelHours: 24,
        lateCancelFeePercent: 50,
        maxJobsPerSlot: 6,
        sundays: false,
        requireDeposit: false,
        depositPercent: 20,
        timeSlots: [],
    },
    images: {},
    offers: { seasonal: [] },
    notifications: {
        jobSheetTemplate:
            "New Sorted job {booking_id}\n{service} — {package}\n{date}, {slot}\n{address}\nNotes: {access_notes}\nPay: {provider_pay}\nReply YES to confirm.",
    },
};

/** All settings rows in one query, cached for the length of a request. */
const loadSettings = cache(async () => {
    const rows = await db
        .select()
        .from(siteSettings)
        .where(inArray(siteSettings.key, Object.keys(fallback)));
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
});

async function getSetting(key) {
    const all = await loadSettings();
    return { ...fallback[key], ...(all[key] ?? {}) };
}

/** Business details: name, phone, email, address, ABN, hours, region… */
export async function getBusiness() {
    const b = await getSetting("business");
    // The public URL always comes from the environment, never the DB.
    return { ...b, phoneHref: telHref(b.phone) || b.phoneHref || "", url: defaults.url };
}

/** "(03) 6111 0000" → "tel:+61361110000" (Australian numbers). */
function telHref(phone) {
    const digits = String(phone ?? "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("61")) return `tel:+${digits}`;
    return `tel:+61${digits.replace(/^0/, "")}`;
}

/** Booking rules: time slots, notice, Sundays, max jobs per window… */
export const getBookingRules = () => getSetting("booking");

/** Site photography (Unsplash ids or full URLs). */
export const getImages = () => getSetting("images");

/** Offers page settings. */
export const getOfferSettings = () => getSetting("offers");

/** Message templates (Admin › Settings › Notifications). */
export const getNotificationSettings = () => getSetting("notifications");