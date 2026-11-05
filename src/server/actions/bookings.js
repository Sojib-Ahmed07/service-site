// src/server/actions/bookings.js
"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
    activityLog,
    addresses,
    bookingAddOns,
    bookingEvents,
    bookings,
    categories,
    coupons,
    enquiries,
    reviews,
    suburbs,
    users,
} from "@/db/schema";
import { formatISODate, isISODate } from "@/lib/dates";
import { money2 } from "@/lib/utils";
import { auth } from "@/server/auth";
import {
    checkDateAllowed,
    freeChangeHours,
    hoursUntilSlot,
    lockBookings,
    nextReference,
    slotHasRoom,
} from "@/server/booking-rules";
import { sendEmail } from "@/server/email";
import { logError } from "@/server/errors";
import { priceBooking } from "@/server/pricing";
import { getBookingRules, getBusiness, getNotificationSettings } from "@/server/queries/settings";
import { getCurrentUser } from "@/server/session";

const CHANGEABLE = ["new", "assigned", "confirmed"];
const signedOut = { ok: false, error: "Your session has ended. Please log in again." };

/** Things that go wrong on purpose inside a transaction, shown to the customer as-is. */
class BookingError extends Error {
    constructor(message, extra = {}) {
        super(message);
        this.extra = extra;
    }
}

function refreshPaths(reference) {
    revalidatePath("/account", "layout");
    revalidatePath("/admin", "layout");
    if (reference) revalidatePath(`/account/bookings/${reference}`);
}

/* Create a booking (checkout) --------------------------------------------- */

const bookingSchema = z.object({
    categorySlug: z.string().min(1).max(80),
    packageId: z.string().min(1).max(20),
    addOnIds: z.array(z.string().max(20)).max(30),
    suburb: z.string().trim().min(1, { error: "Choose your suburb." }).max(80),
    street: z.string().trim().min(4, { error: "Enter your street address." }).max(200),
    access: z.string().trim().max(1000),
    date: z.string().refine(isISODate, { error: "Choose a day." }),
    slot: z.string().min(1, { error: "Choose an arrival window." }).max(40),
    name: z.string().trim().min(2, { error: "Enter your full name." }).max(120),
    email: z.email({ error: "Enter a valid email address." }).max(255),
    phone: z
        .string()
        .trim()
        .max(32)
        .refine((v) => v.replace(/\D/g, "").length >= 8, { error: "Enter a valid mobile number." }),
    createAccount: z.boolean(),
    payment: z.enum(["later", "card"]),
    couponCode: z.string().trim().max(40),
    agree: z.literal(true, { error: "Please accept the terms to continue." }),
});

/**
 * Checkout → a real booking. Prices, travel fee, promo code, date rules and slot
 * capacity are all re-checked here, so nothing sent by the browser is trusted.
 * Guests get a customer record (no password); "create an account" emails them a
 * link to set one. Returns { ok: true, reference, ... } or { ok: false, error, step? }.
 */
export async function createBooking(input) {
    const parsed = bookingSchema.safeParse({
        ...input,
        email: String(input?.email ?? "")
            .trim()
            .toLowerCase(),
        addOnIds: Array.isArray(input?.addOnIds) ? input.addOnIds.map(String) : [],
        couponCode: String(input?.couponCode ?? ""),
        access: String(input?.access ?? ""),
    });
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        const field = first.path[0];
        const step = ["suburb", "street", "access"].includes(field)
            ? 0
            : ["date", "slot"].includes(field)
                ? 1
                : ["name", "email", "phone"].includes(field)
                    ? 2
                    : 3;
        return { ok: false, error: first.message, step };
    }
    const v = parsed.data;
    if (v.payment === "card") {
        return { ok: false, error: "Card payments aren’t available yet. Choose “Pay after the job”.", step: 3 };
    }

    const signedIn = await getCurrentUser();
    const [rules, business] = await Promise.all([getBookingRules(), getBusiness()]);

    if (!rules.timeSlots.includes(v.slot)) return { ok: false, error: "Please choose an arrival window.", step: 1 };
    const dateCheck = checkDateAllowed(v.date, rules);
    if (!dateCheck.ok) return { ok: false, error: dateCheck.error, step: 1 };

    const priced = await priceBooking({
        categorySlug: v.categorySlug,
        packageId: v.packageId,
        addOnIds: v.addOnIds,
        suburb: v.suburb,
        couponCode: v.couponCode,
    });
    if (!priced.ok) return { ok: false, error: priced.error, step: 0 };
    const q = priced.quote;
    if (v.couponCode && !q.coupon) return { ok: false, error: q.couponError, step: 3 };

    const addressLine = `${v.street}, ${q.suburb.name} TAS ${q.suburb.postcode}`;
    let result;
    try {
        result = await db.transaction(async (tx) => {
            await lockBookings(tx);
            if (!(await slotHasRoom(tx, v.date, v.slot, rules))) {
                throw new BookingError("Sorry, that arrival window has just filled up. Please choose another.", { step: 1 });
            }

            // Who is this booking for?
            let userId;
            let isNewUser = false;
            if (signedIn) {
                userId = signedIn.id;
                await tx
                    .update(users)
                    .set({ phone: v.phone, updatedAt: new Date() })
                    .where(and(eq(users.id, userId), or(isNull(users.phone), eq(users.phone, ""))));
            } else {
                const [existing] = await tx
                    .select({ id: users.id, blocked: users.blocked, role: users.role })
                    .from(users)
                    .where(eq(sql`lower(${users.email})`, v.email))
                    .limit(1);
                if (existing?.blocked) throw new BookingError("We can’t take this booking online. Please call us.", { step: 2 });
                if (existing?.role === "admin") throw new BookingError("Please log in to book with this email.", { step: 2 });
                if (existing) {
                    userId = existing.id;
                } else {
                    userId = randomUUID();
                    isNewUser = true;
                    await tx.insert(users).values({ id: userId, name: v.name, email: v.email, phone: v.phone, role: "customer" });
                }
            }

            // Customer-specific promo rules (checked here because now we know who the customer is).
            if (q.coupon && q.coupon.restriction !== "anyone") {
                const prior = await tx
                    .select({ couponCode: bookings.couponCode })
                    .from(bookings)
                    .where(and(eq(bookings.userId, userId), ne(bookings.status, "cancelled")));
                if (q.coupon.restriction === "first_booking" && prior.length) {
                    throw new BookingError(`${q.coupon.code} is for first bookings only. Remove it to continue.`, { step: 3 });
                }
                if (q.coupon.restriction === "once_per_customer" && prior.some((p) => p.couponCode === q.coupon.code)) {
                    throw new BookingError(`You’ve already used ${q.coupon.code}. Remove it to continue.`, { step: 3 });
                }
            }

            // Use the promo code (atomically, so a nearly-used-up code can't be over-used).
            if (q.coupon) {
                const used = await tx
                    .update(coupons)
                    .set({ usedCount: sql`${coupons.usedCount} + 1` })
                    .where(and(eq(coupons.code, q.coupon.code), or(isNull(coupons.usageLimit), lt(coupons.usedCount, coupons.usageLimit))))
                    .returning({ id: coupons.id });
                if (!used.length) throw new BookingError("That promo code has just run out. Remove it to continue.", { step: 3 });
            }

            const reference = await nextReference(tx);
            const [b] = await tx
                .insert(bookings)
                .values({
                    reference,
                    userId,
                    categoryId: q.category.id,
                    packageId: q.package.id,
                    status: "new",
                    paymentStatus: "unpaid",
                    addressLine,
                    suburbId: q.suburb.id,
                    accessNotes: v.access || null,
                    serviceDate: v.date,
                    timeSlot: v.slot,
                    subtotal: q.subtotal.toFixed(2),
                    discount: q.discount.toFixed(2),
                    surcharge: q.surcharge.toFixed(2),
                    total: q.total.toFixed(2),
                    couponCode: q.coupon?.code ?? null,
                })
                .returning({ id: bookings.id });

            if (q.addOns.length) {
                await tx
                    .insert(bookingAddOns)
                    .values(q.addOns.map((a) => ({ bookingId: b.id, addOnId: a.id, price: a.price.toFixed(2) })));
            }
            await tx.insert(bookingEvents).values({
                bookingId: b.id,
                type: "created",
                message: `Booking placed online (${signedIn ? "signed in" : "guest"}, pay after the job)`,
                actorId: signedIn ? userId : null,
            });

            // Save the address for next time if the customer has none saved yet.
            const [hasAddress] = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, userId)).limit(1);
            if (!hasAddress) {
                await tx.insert(addresses).values({
                    userId,
                    label: "Home",
                    line1: v.street,
                    suburbId: q.suburb.id,
                    accessNotes: v.access || null,
                    isDefault: true,
                });
            }

            await tx.insert(activityLog).values({
                actorId: signedIn ? userId : null,
                actorName: "System",
                message: `New booking ${reference} — ${q.category.name}, ${q.suburb.name}`,
            });
            return { reference, isNewUser };
        });
    } catch (err) {
        if (err instanceof BookingError) return { ok: false, error: err.message, ...err.extra };
        logError("createBooking", err);
        return { ok: false, error: "We couldn’t place your booking. Please try again or call us." };
    }

    // After the booking is safely saved: emails (never block the booking on these).
    const when = `${formatISODate(v.date)}, ${v.slot}`;
    try {
        await sendEmail({
            to: v.email,
            event: "confirmation",
            subject: `Booking ${result.reference} received — ${q.category.name}`,
            text: [
                `Hi ${v.name.split(" ")[0]},`,
                "",
                `Thanks for booking with ${business.name}. Your reference is ${result.reference}.`,
                `${q.category.name} — ${q.package.name}`,
                when,
                addressLine,
                `Total ${money2(q.total)} (GST incl.), payable after the job.`,
                "",
                "We’ll let you know once a pro is assigned.",
            ].join("\n"),
        });
        if (!signedIn && v.createAccount) {
            // Lets a guest set a password (works for new and returning guests).
            await auth.api.requestPasswordReset({
                body: { email: v.email, redirectTo: "/reset-password" },
                headers: await headers(),
            });
        }
    } catch (err) {
        logError("createBooking:email", err);
    }
    try {
        // Alert the office (Settings › Notifications › "Email me about new bookings").
        const notifications = await getNotificationSettings();
        if (notifications.adminNewBooking && business.email) {
            await sendEmail({
                to: business.email,
                subject: `New booking ${result.reference} — ${q.category.name}`,
                text: [
                    `${v.name} booked ${q.category.name} — ${q.package.name}`,
                    when,
                    addressLine,
                    `Total ${money2(q.total)}`,
                    "",
                    `Assign a pro: ${business.url}/admin/bookings/${result.reference}`,
                ].join("\n"),
            });
        }
    } catch (err) {
        logError("createBooking:adminEmail", err);
    }

    refreshPaths(result.reference);
    return {
        ok: true,
        reference: result.reference,
        service: q.category.name,
        date: v.date,
        slot: v.slot,
        accountEmailSent: !signedIn && v.createAccount,
    };
}

/* Customer changes to their own booking ------------------------------------ */

/** Loads one of the signed-in customer's bookings. */
async function ownBooking(user, reference) {
    const [b] = await db
        .select({
            id: bookings.id,
            reference: bookings.reference,
            status: bookings.status,
            paymentStatus: bookings.paymentStatus,
            serviceDate: bookings.serviceDate,
            timeSlot: bookings.timeSlot,
            categoryId: bookings.categoryId,
            categoryName: categories.name,
            categorySlug: categories.slug,
            suburb: suburbs.name,
            updatedAt: bookings.updatedAt,
        })
        .from(bookings)
        .innerJoin(categories, eq(bookings.categoryId, categories.id))
        .innerJoin(suburbs, eq(bookings.suburbId, suburbs.id))
        .where(and(eq(bookings.reference, String(reference)), eq(bookings.userId, user.id)))
        .limit(1);
    return b ?? null;
}

const tooLate = (business, hours) =>
    `Online changes close ${hours} hours before your arrival window. Please call us on ${business.phone}.`;

/** Move a booking to a new day / window. Any assigned pro is released for re-assigning. */
export async function rescheduleBooking(reference, date, slot) {
    const user = await getCurrentUser();
    if (!user) return signedOut;
    if (!isISODate(date)) return { ok: false, error: "Choose a new day." };
    try {
        const [b, rules, business] = await Promise.all([ownBooking(user, reference), getBookingRules(), getBusiness()]);
        if (!b) return { ok: false, error: "We couldn’t find that booking." };
        if (!CHANGEABLE.includes(b.status)) return { ok: false, error: "This booking can’t be changed any more." };
        if (!rules.timeSlots.includes(slot)) return { ok: false, error: "Choose an arrival window." };
        if (hoursUntilSlot(b.serviceDate, b.timeSlot) < freeChangeHours(rules)) {
            return { ok: false, error: tooLate(business, freeChangeHours(rules)) };
        }
        if (date === b.serviceDate && slot === b.timeSlot) return { ok: false, error: "That’s already your booked time." };
        const dateCheck = checkDateAllowed(date, rules);
        if (!dateCheck.ok) return dateCheck;

        await db.transaction(async (tx) => {
            await lockBookings(tx);
            if (!(await slotHasRoom(tx, date, slot, rules, b.id))) {
                throw new BookingError("That arrival window is full. Please choose another.");
            }
            const releasedPro = b.status !== "new";
            await tx
                .update(bookings)
                .set({
                    serviceDate: date,
                    timeSlot: slot,
                    ...(releasedPro ? { status: "new", providerId: null, providerPay: null } : {}),
                    updatedAt: new Date(),
                })
                .where(eq(bookings.id, b.id));
            await tx.insert(bookingEvents).values({
                bookingId: b.id,
                type: "status",
                message: `Rescheduled by customer from ${formatISODate(b.serviceDate)} ${b.timeSlot} to ${formatISODate(date)} ${slot}${releasedPro ? ". Pro released, needs re-assigning." : ""}`,
                actorId: user.id,
            });
            await tx
                .insert(activityLog)
                .values({ actorId: user.id, actorName: user.name, message: `${b.reference} rescheduled by customer` });
        });
        refreshPaths(b.reference);
        return { ok: true };
    } catch (err) {
        if (err instanceof BookingError) return { ok: false, error: err.message };
        logError("rescheduleBooking", err);
        return { ok: false, error: "We couldn’t reschedule right now. Please try again." };
    }
}

const cancelReasons = ["Plans changed", "Found someone else", "Booked by mistake", "Other"];

export async function cancelBooking(reference, reason) {
    const user = await getCurrentUser();
    if (!user) return signedOut;
    const why = cancelReasons.includes(reason) ? reason : "Other";
    try {
        const [b, rules, business] = await Promise.all([ownBooking(user, reference), getBookingRules(), getBusiness()]);
        if (!b) return { ok: false, error: "We couldn’t find that booking." };
        if (!CHANGEABLE.includes(b.status)) return { ok: false, error: "This booking can’t be cancelled any more." };
        if (hoursUntilSlot(b.serviceDate, b.timeSlot) < freeChangeHours(rules)) {
            return { ok: false, error: tooLate(business, freeChangeHours(rules)) };
        }
        const needsRefund = b.paymentStatus === "paid" || b.paymentStatus === "partial";
        await db.transaction(async (tx) => {
            const done = await tx
                .update(bookings)
                .set({ status: "cancelled", updatedAt: new Date() })
                .where(and(eq(bookings.id, b.id), eq(bookings.status, b.status)))
                .returning({ id: bookings.id });
            if (!done.length) throw new BookingError("This booking was just updated. Please refresh the page.");
            await tx.insert(bookingEvents).values({
                bookingId: b.id,
                type: "status",
                message: `Cancelled by customer (${why})${needsRefund ? ". Refund needed." : ""}`,
                actorId: user.id,
            });
            await tx
                .insert(activityLog)
                .values({ actorId: user.id, actorName: user.name, message: `${b.reference} cancelled by customer` });
        });
        refreshPaths(b.reference);
        return { ok: true, needsRefund };
    } catch (err) {
        if (err instanceof BookingError) return { ok: false, error: err.message };
        logError("cancelBooking", err);
        return { ok: false, error: "We couldn’t cancel right now. Please try again." };
    }
}

/** One review per completed booking. Reviews wait in Admin › Reviews until published. */
export async function submitReview(reference, rating, text) {
    const user = await getCurrentUser();
    if (!user) return signedOut;
    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { ok: false, error: "Choose a star rating." };
    const body = String(text ?? "").trim();
    if (body.length > 2000) return { ok: false, error: "Reviews can be up to 2,000 characters." };
    try {
        const b = await ownBooking(user, reference);
        if (!b) return { ok: false, error: "We couldn’t find that booking." };
        if (b.status !== "completed") return { ok: false, error: "You can review a booking once it’s completed." };
        const [already] = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.bookingId, b.id)).limit(1);
        if (already) return { ok: false, error: "You’ve already reviewed this booking. Thank you!" };

        const [first, last = ""] = user.name.trim().split(/\s+/);
        await db.insert(reviews).values({
            bookingId: b.id,
            userId: user.id,
            categoryId: b.categoryId,
            authorName: last ? `${first} ${last[0].toUpperCase()}.` : first,
            authorSuburb: b.suburb,
            rating: stars,
            body: body || null,
            status: "pending",
        });
        await db
            .insert(activityLog)
            .values({ actorId: user.id, actorName: user.name, message: `New ${stars}-star review for ${b.reference}` });
        revalidatePath("/admin", "layout");
        return { ok: true };
    } catch (err) {
        if ((err?.cause?.code ?? err?.code) === "23505")
            return { ok: false, error: "You’ve already reviewed this booking. Thank you!" };
        logError("submitReview", err);
        return { ok: false, error: "We couldn’t save your review. Please try again." };
    }
}

/** "Report a problem" → a Complaint in Admin › Inbox plus an internal note on the booking. */
export async function reportProblem(reference, text) {
    const user = await getCurrentUser();
    if (!user) return signedOut;
    const body = String(text ?? "").trim();
    if (body.length < 10) return { ok: false, error: "Tell us a little more (at least 10 characters)." };
    if (body.length > 5000) return { ok: false, error: "Please keep it under 5,000 characters." };
    try {
        const b = await ownBooking(user, reference);
        if (!b) return { ok: false, error: "We couldn’t find that booking." };
        if (b.status !== "completed") return { ok: false, error: "You can report a problem once the job is completed." };
        await db.transaction(async (tx) => {
            await tx.insert(enquiries).values({
                name: user.name,
                email: user.email,
                phone: user.phone || null,
                type: "Complaint",
                bookingRef: b.reference,
                subject: `Problem with ${b.reference} (${b.categoryName})`,
                message: body,
            });
            await tx.insert(bookingEvents).values({
                bookingId: b.id,
                type: "note",
                message: `Customer reported a problem: ${body}`,
                actorId: user.id,
            });
            await tx
                .insert(activityLog)
                .values({ actorId: user.id, actorName: user.name, message: `Problem reported on ${b.reference}` });
        });
        revalidatePath("/admin", "layout");
        return { ok: true };
    } catch (err) {
        logError("reportProblem", err);
        return { ok: false, error: "We couldn’t send your report. Please call us." };
    }
}

/* Messages ----------------------------------------------------------------- */

/**
 * Customer → Sorted team message on one of their bookings (never seen by the provider).
 * Returns { ok, message: { from, text, at } } or { ok: false, error }.
 */
export async function sendBookingMessage(reference, text) {
    const user = await getCurrentUser();
    if (!user) return signedOut;
    const body = String(text ?? "").trim();
    if (!body) return { ok: false, error: "Write a message first." };
    if (body.length > 2000) return { ok: false, error: "Messages can be up to 2,000 characters." };

    try {
        const b = await ownBooking(user, reference);
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
        logError("sendBookingMessage", err);
        return { ok: false, error: "We couldn’t send your message. Please try again." };
    }
}