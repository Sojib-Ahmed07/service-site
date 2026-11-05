// src/server/queries/settings.js
/** Everything on Admin › Settings and the homepage editor, read from the site_settings table. */
import "server-only";
import { cache } from "react";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { homepageDefaults, notificationDefaults, paymentDefaults } from "@/db/content-defaults";
import { contentVars } from "@/lib/cms";
import { site as defaults } from "@/lib/site";

const { url: _url, ...businessDefaults } = defaults;

/** Fallbacks used only if a settings row (or a field in it) is missing. */
const fallback = {
    business: { ...businessDefaults, gst: "registered" },
    booking: {
        minNoticeHours: 24,
        windowDays: 14,
        freeCancelHours: 24,
        lateCancelFeePercent: 50,
        guaranteeHours: 48,
        maxJobsPerSlot: 6,
        sundays: false,
        timeSlots: ["7:00–9:00am", "9:00–11:00am", "11:00am–1:00pm", "1:00–3:00pm", "3:00–5:00pm"],
    },
    images: {},
    offers: { seasonal: [], seasonalTitle: "In season now", seasonalText: "" },
    notifications: notificationDefaults,
    payments: paymentDefaults,
    homepage: homepageDefaults,
};
export const settingKeys = Object.keys(fallback);

/** All settings rows in one query, cached for the length of a request. */
const loadSettings = cache(async () => {
    const rows = await db.select().from(siteSettings).where(inArray(siteSettings.key, settingKeys));
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

/** Offers page settings ("In season now"). */
export const getOfferSettings = () => getSetting("offers");

/** Message settings: job sheet template, which emails go out. */
export async function getNotificationSettings() {
    const n = await getSetting("notifications");
    return { ...n, emails: { ...notificationDefaults.emails, ...(n.emails ?? {}) } };
}

/** Invoice terms. */
export const getPaymentSettings = () => getSetting("payments");

/** Homepage copy, steps and section order. */
export async function getHomepage() {
    const h = await getSetting("homepage");
    // Keep every known section exactly once, in the saved order, adding any new ones at the end.
    const known = homepageDefaults.sections.map((s) => s.id);
    const saved = (h.sections ?? []).filter((s, i, all) => known.includes(s.id) && all.findIndex((x) => x.id === s.id) === i);
    const missing = homepageDefaults.sections.filter((s) => !saved.some((x) => x.id === s.id));
    return { ...h, sections: [...saved, ...missing] };
}

/** Values for {variables} in page text, FAQs and banners. */
export const getContentVars = cache(async () => {
    const [business, rules, payments] = await Promise.all([getBusiness(), getBookingRules(), getPaymentSettings()]);
    return contentVars({ business, rules, payments });
});