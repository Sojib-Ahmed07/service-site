// src/lib/dates.js
/**
 * Date helpers that always work in the business time zone (Australia/Hobart),
 * whatever time zone the visitor's device or the server is in.
 * Dates for bookings are plain "YYYY-MM-DD" strings (no time, no zone).
 * Safe to use in both server and client components.
 */
export const TIME_ZONE = "Australia/Hobart";

/** Today's date in Hobart, e.g. "2026-11-04". */
export function todayISO(now = new Date()) {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** Adds whole days to a "YYYY-MM-DD" string. */
export function addDaysISO(iso, days) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a "YYYY-MM-DD" string. */
export function weekdayIndex(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "Mon".."Sun" for a "YYYY-MM-DD" string (matches provider availability values). */
export function weekdayShort(iso) {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekdayIndex(iso)];
}

/** Formats a "YYYY-MM-DD" string without shifting it across time zones. */
export function formatISODate(iso, opts = { weekday: "long", day: "numeric", month: "long" }) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", { timeZone: "UTC", ...opts });
}

/** True if the string is a real calendar date in YYYY-MM-DD form. */
export function isISODate(iso) {
    if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * The UTC instant for a wall-clock time in Hobart, e.g. end of a coupon's last day.
 * Handles daylight saving (AEDT +11 / AEST +10).
 */
export function hobartToUTC(iso, time = "00:00:00") {
    const guess = new Date(`${iso}T${time}Z`);
    const offset = (date) => {
        const part = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "longOffset" })
            .formatToParts(date)
            .find((p) => p.type === "timeZoneName").value; // "GMT+11:00"
        const m = part.match(/GMT([+-])(\d{2}):(\d{2})/);
        return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
    };
    const first = new Date(guess.getTime() - offset(guess) * 60_000);
    return new Date(guess.getTime() - offset(first) * 60_000);
}