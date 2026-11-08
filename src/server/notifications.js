// src/server/notifications.js
/**
 * The daily email job: day-before reminders and review requests.
 * Runs from /api/cron/daily-emails (Vercel Cron, once a day) or the "Run daily emails now" button
 * in Admin › Settings › Notifications. Safe to run any number of times, even two at once:
 *   - before sending, the job "claims" the booking by recording a booking_events row
 *     ("email_reminder" / "email_review"). A unique index allows only one per booking, so a second
 *     run can't claim it again. If the email fails, the claim is removed so a later run can retry.
 *   - no database transaction is held open while emails are sent.
 * Customers who switched off "Booking updates by email" (Account › Profile) are skipped.
 */
import "server-only";
import { and, eq, gte, inArray, lte, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookingEvents, bookings, categories, reviews, users } from "@/db/schema";
import { addDaysISO, todayISO } from "@/lib/dates";
import { freeChangeHours } from "@/server/booking-rules";
import { emailStatus, sendEmail } from "@/server/email";
import { dayBeforeReminder, reviewRequest } from "@/server/email-templates";
import { getBookingRules, getBusiness } from "@/server/queries/settings";

const MAX_PER_RUN = 150; // keeps one run well inside the server time limit; the rest go next run
const REVIEW_DAYS = 7; // only ask for reviews on jobs from the last week

const noEvent = (type) =>
    notExists(
        db
            .select({ one: sql`1` })
            .from(bookingEvents)
            .where(and(eq(bookingEvents.bookingId, bookings.id), eq(bookingEvents.type, type))),
    );

/** Records the claim. Returns its id, or null if another run already has this booking. */
async function claim(bookingId, type, label) {
    const rows = await db
        .insert(bookingEvents)
        .values({ bookingId, type, message: `${label} sending…` })
        .onConflictDoNothing()
        .returning({ id: bookingEvents.id });
    return rows[0]?.id ?? null;
}

/**
 * @returns {Promise<{ ok: true, date: string, connected: boolean,
 *   reminders: { sent: number, skipped: number, failed: number },
 *   reviews: { sent: number, skipped: number, failed: number }, errors: string[] }>}
 */
export async function runDailyEmails() {
    const today = todayISO();
    const tomorrow = addDaysISO(today, 1);
    const [business, rules] = await Promise.all([getBusiness(), getBookingRules()]);
    const result = {
        ok: true,
        date: today,
        connected: emailStatus().connected,
        reminders: { sent: 0, skipped: 0, failed: 0 },
        reviews: { sent: 0, skipped: 0, failed: 0 },
        errors: [],
    };

    // Tomorrow's jobs that have a pro (an unassigned job gets its reminder once assigned + "Run now").
    const due = await db
        .select({
            id: bookings.id,
            reference: bookings.reference,
            date: bookings.serviceDate,
            slot: bookings.timeSlot,
            address: bookings.addressLine,
            accessNotes: bookings.accessNotes,
            service: categories.name,
            name: users.name,
            email: users.email,
        })
        .from(bookings)
        .innerJoin(users, eq(bookings.userId, users.id))
        .innerJoin(categories, eq(bookings.categoryId, categories.id))
        .where(
            and(
                eq(bookings.serviceDate, tomorrow),
                inArray(bookings.status, ["assigned", "confirmed"]),
                eq(users.notifyEmail, true),
                noEvent("email_reminder"),
            ),
        )
        .orderBy(bookings.id)
        .limit(MAX_PER_RUN);

    // Jobs completed in the last week that haven't been reviewed.
    const asked = await db
        .select({
            id: bookings.id,
            reference: bookings.reference,
            service: categories.name,
            name: users.name,
            email: users.email,
        })
        .from(bookings)
        .innerJoin(users, eq(bookings.userId, users.id))
        .innerJoin(categories, eq(bookings.categoryId, categories.id))
        .where(
            and(
                eq(bookings.status, "completed"),
                gte(bookings.serviceDate, addDaysISO(today, -REVIEW_DAYS)),
                lte(bookings.serviceDate, today),
                eq(users.notifyEmail, true),
                noEvent("email_review"),
                notExists(db.select({ one: sql`1` }).from(reviews).where(eq(reviews.bookingId, bookings.id))),
            ),
        )
        .orderBy(bookings.id)
        .limit(Math.max(0, MAX_PER_RUN - due.length));

    const jobs = [
        ...due.map((b) => ({
            b,
            kind: "reminders",
            type: "email_reminder",
            label: "Day-before reminder",
            email: dayBeforeReminder(business, b, freeChangeHours(rules)),
        })),
        ...asked.map((b) => ({
            b,
            kind: "reviews",
            type: "email_review",
            label: "Review request",
            email: reviewRequest(business, b),
        })),
    ];

    for (const job of jobs) {
        const counts = result[job.kind];
        const claimId = await claim(job.b.id, job.type, job.label);
        if (!claimId) continue; // another run is handling (or handled) this one

        let res;
        try {
            res = await sendEmail(job.email);
        } catch (err) {
            res = { ok: false, error: "Something went wrong sending the email." };
            console.error(`[daily-emails] ${job.label} for ${job.b.reference}:`, err);
        }

        if (!res.ok || res.skipped) {
            // Not sent: remove the claim so a later run can try again.
            await db.delete(bookingEvents).where(eq(bookingEvents.id, claimId));
            if (res.skipped) counts.skipped += 1; // switched off in Settings › Notifications
            else {
                counts.failed += 1;
                if (!result.errors.includes(res.error)) result.errors.push(res.error);
            }
            continue;
        }
        counts.sent += 1;
        await db
            .update(bookingEvents)
            .set({ message: res.delivered ? `${job.label} emailed` : `${job.label} printed in the terminal (email not connected)` })
            .where(eq(bookingEvents.id, claimId));
    }
    return result;
}