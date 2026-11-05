// src/server/actions/checkout.js
"use server";

import { logError } from "@/server/errors";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { priceBooking } from "@/server/pricing";
import { getBookingRules } from "@/server/queries/settings";
import { isISODate } from "@/lib/dates";
import { checkDateAllowed } from "@/server/booking-rules";

const quoteInput = z.object({
    categorySlug: z.string().min(1).max(80),
    packageId: z.string().min(1).max(20),
    addOnIds: z.array(z.string().max(20)).max(30).default([]),
    suburb: z.string().max(80).optional().default(""),
    couponCode: z.string().max(40).optional().default(""),
});

/**
 * Checks a promo code against the current selection, using database prices.
 * Returns { ok: true, coupon: { code, type, value, minSpend }, discount } or { ok: false, error }.
 */
export async function applyCoupon(input) {
    const parsed = quoteInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Something went wrong. Please refresh and try again." };
    if (!parsed.data.couponCode.trim()) return { ok: false, error: "Enter a promo code." };

    try {
        const res = await priceBooking(parsed.data);
        if (!res.ok) return { ok: false, error: res.error };
        if (!res.quote.coupon) return { ok: false, error: res.quote.couponError || "That code isn’t valid or has expired." };
        return { ok: true, coupon: res.quote.coupon, discount: res.quote.discount };
    } catch (err) {
        logError("applyCoupon", err);
        return { ok: false, error: "We couldn’t check that code right now. Please try again." };
    }
}

/**
 * Which arrival windows are still open on a date.
 * Returns { ok: true, slots: [{ slot, full }] } or { ok: false, error }.
 * A window is full when bookings (not cancelled) on that date reach "Max jobs per arrival window".
 */
export async function getSlotAvailability(date) {
    if (!isISODate(date)) return { ok: false, error: "Pick a valid date." };
    try {
        const rules = await getBookingRules();
        const check = checkDateAllowed(date, rules);
        if (!check.ok) return check;

        const rows = await db
            .select({ slot: bookings.timeSlot, total: count() })
            .from(bookings)
            .where(and(eq(bookings.serviceDate, date), ne(bookings.status, "cancelled")))
            .groupBy(bookings.timeSlot);
        const taken = new Map(rows.map((r) => [r.slot, r.total]));
        const max = Number(rules.maxJobsPerSlot) || 0;

        return {
            ok: true,
            slots: rules.timeSlots.map((slot) => ({ slot, full: max > 0 && (taken.get(slot) ?? 0) >= max })),
        };
    } catch (err) {
        logError("getSlotAvailability", err);
        return { ok: false, error: "We couldn’t load times right now. Please try again." };
    }
}