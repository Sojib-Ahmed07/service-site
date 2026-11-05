// src/server/booking-rules.js
/**
 * Booking rules shared by checkout, slot availability and customer changes.
 * Rules come from Settings › Booking rules (site_settings "booking").
 */
import "server-only";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { bookings } from "@/db/schema";
import { addDaysISO, hobartToUTC, todayISO, weekdayIndex } from "@/lib/dates";

/** Can this date be booked online? Returns { ok } or { ok: false, error }. */
export function checkDateAllowed(date, rules) {
    const today = todayISO();
    const firstDay = addDaysISO(today, Math.ceil((Number(rules.minNoticeHours) || 0) / 24));
    const lastDay = addDaysISO(today, Number(rules.windowDays) || 14);
    if (date < firstDay) return { ok: false, error: "That date is too soon. Please choose a later day." };
    if (date > lastDay) return { ok: false, error: "That date is too far ahead." };
    if (!rules.sundays && weekdayIndex(date) === 0) return { ok: false, error: "We don’t book on Sundays." };
    return { ok: true };
}

/**
 * Start time of an arrival window as "HH:MM:SS" (24h), e.g.
 * "7:00–9:00am" → 07:00, "11:00am–1:00pm" → 11:00, "1:00–3:00pm" → 13:00.
 */
export function slotStartTime(slot) {
    const m = String(slot).match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[–-]\s*(\d{1,2})(?::\d{2})?\s*(am|pm)?/i);
    if (!m) return "08:00:00";
    let hour = Number(m[1]);
    const minute = Number(m[2] ?? 0);
    const endHour = Number(m[4]);
    let suffix = (m[3] ?? "").toLowerCase();
    if (!suffix) {
        const endSuffix = (m[5] ?? "am").toLowerCase();
        // "11:00–1:00pm": start is before noon if it's a bigger number than the end
        suffix = endSuffix === "pm" && hour > endHour && hour !== 12 ? "am" : endSuffix;
    }
    if (suffix === "pm" && hour !== 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

/** Is this a time window the site can read, e.g. "7:00–9:00am" or "11:00am–1:00pm"? */
export function isValidSlot(slot) {
    return /^\s*(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?\s*[–-]\s*(\d{1,2})(?::[0-5]\d)?\s*(am|pm)\s*$/i.test(String(slot));
}

/** Hours from now until the arrival window starts (negative if it has started). */
export function hoursUntilSlot(date, slot) {
    const start = hobartToUTC(date, slotStartTime(slot));
    return (start.getTime() - Date.now()) / 3_600_000;
}

/**
 * Serialises booking writes so two people can't take the last place in a window,
 * and booking references stay unique. Call first inside db.transaction().
 */
export async function lockBookings(tx) {
    await tx.execute(sql`select pg_advisory_xact_lock(724117)`);
}

/** Is there still room in this window? Pass excludeId when moving an existing booking. */
export async function slotHasRoom(tx, date, slot, rules, excludeId = null) {
    const max = Number(rules.maxJobsPerSlot) || 0;
    if (max <= 0) return true;
    const conds = [eq(bookings.serviceDate, date), eq(bookings.timeSlot, slot), ne(bookings.status, "cancelled")];
    if (excludeId) conds.push(ne(bookings.id, excludeId));
    const [r] = await tx
        .select({ n: count() })
        .from(bookings)
        .where(and(...conds));
    return r.n < max;
}

/** Next booking reference, e.g. "HD-24818". Must be called after lockBookings(). */
export async function nextReference(tx) {
    const [r] = await tx
        .select({
            max: sql`coalesce(max(nullif(regexp_replace(${bookings.reference}, '\\D', '', 'g'), '')::int), 24800)`,
        })
        .from(bookings)
        .where(sql`${bookings.reference} ~ '^HD-[0-9]+$'`);
    return `HD-${Number(r.max) + 1}`;
}

/** Customers can change or cancel online until this many hours before the window. */
export const freeChangeHours = (rules) => Number(rules.freeCancelHours) || 24;