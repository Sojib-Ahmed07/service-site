// src/server/actions/bookings.js
"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/server/session";

/**
 * Customer → Sorted team message on one of their bookings (never seen by the provider).
 * Returns { ok, message: { from, text, at } } or { ok: false, error }.
 */
export async function sendBookingMessage(reference, text) {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has ended. Please log in again." };
    const body = String(text ?? "").trim();
    if (!body) return { ok: false, error: "Write a message first." };
    if (body.length > 2000) return { ok: false, error: "Messages can be up to 2,000 characters." };

    try {
        const [b] = await db
            .select({ id: bookings.id, reference: bookings.reference })
            .from(bookings)
            .where(and(eq(bookings.reference, String(reference)), eq(bookings.userId, user.id)))
            .limit(1);
        if (!b) return { ok: false, error: "We couldn’t find that booking." };

        const [ev] = await db
            .insert(bookingEvents)
            .values({ bookingId: b.id, type: "message_customer", message: body, actorId: user.id })
            .returning();
        await db.insert(activityLog).values({ actorId: user.id, actorName: user.name, message: `New message on ${b.reference}` });
        revalidatePath(`/account/bookings/${b.reference}`);
        revalidatePath(`/admin/bookings/${b.reference}`);
        return { ok: true, message: { from: "customer", text: ev.message, at: ev.createdAt.toISOString() } };
    } catch (err) {
        console.error("[sendBookingMessage]", err);
        return { ok: false, error: "We couldn’t send your message. Please try again." };
    }
}