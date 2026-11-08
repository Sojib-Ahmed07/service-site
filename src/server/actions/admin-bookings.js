// src/server/actions/admin-bookings.js
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
    activityLog,
    addOns,
    bookingAddOns,
    bookingEvents,
    bookings,
    categories,
    packages,
    payments,
    providers,
    users,
} from "@/db/schema";
import { bookingStatus } from "@/lib/constants";
import { formatISODate, isISODate, todayISO } from "@/lib/dates";
import { money2 } from "@/lib/utils";
import { lockBookings, nextReference } from "@/server/booking-rules";
import { sendEmail } from "@/server/email";
import {
    bookingCancelledByTeam,
    bookingConfirmedByTeam,
    bookingUpdatedByTeam,
    proAssigned,
    taxInvoice,
    teamMessage,
} from "@/server/email-templates";
import { logError } from "@/server/errors";
import { cents, priceBooking } from "@/server/pricing";
import { getBookingRules, getBusiness, getPaymentSettings } from "@/server/queries/settings";
import { getAdmin } from "@/server/session";

const denied = { ok: false, error: "Only admins can do that. Please log in again." };
const failed = (tag, err, msg = "Something went wrong. Please try again.") => {
    logError(tag, err);
    return { ok: false, error: msg };
};
const who = (admin) => `${admin.name.split(" ")[0]} (admin)`;

/**
 * For emails sent after a change is already saved: a toast warning when the email didn't go out
 * (or was only printed because email isn't connected yet). Undefined when it was delivered.
 */
function emailWarning(sent, saved) {
    if (!sent || sent.skipped || sent.delivered) return undefined;
    if (!sent.ok) return `${saved}, but the email wasn’t sent: ${sent.error}`;
    return `${saved}. Email isn’t connected yet, so it was printed in the server terminal.`;
}

function refresh(reference) {
    revalidatePath("/admin", "layout");
    revalidatePath("/account", "layout");
    if (reference) revalidatePath(`/admin/bookings/${reference}`);
}

/** Loads a booking by reference (plus its customer) for an admin action. */
async function load(reference) {
    const [b] = await db
        .select({
            id: bookings.id,
            reference: bookings.reference,
            status: bookings.status,
            paymentStatus: bookings.paymentStatus,
            providerId: bookings.providerId,
            providerPay: bookings.providerPay,
            total: bookings.total,
            serviceDate: bookings.serviceDate,
            timeSlot: bookings.timeSlot,
            addressLine: bookings.addressLine,
            service: categories.name,
            packageName: packages.name,
            customerName: users.name,
            customerEmail: users.email,
        })
        .from(bookings)
        .innerJoin(users, eq(bookings.userId, users.id))
        .innerJoin(categories, eq(bookings.categoryId, categories.id))
        .innerJoin(packages, eq(bookings.packageId, packages.id))
        .where(eq(bookings.reference, String(reference)))
        .limit(1);
    return b ?? null;
}

async function log(tx, admin, bookingId, type, message, activity) {
    await tx.insert(bookingEvents).values({ bookingId, type, message, actorId: admin.id });
    if (activity) await tx.insert(activityLog).values({ actorId: admin.id, actorName: who(admin), message: activity });
}

const payValue = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100000 ? cents(n) : null;
};

/* Assignment ------------------------------------------------------------------ */

export async function assignProvider(reference, providerId, pay) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const amount = payValue(pay);
    if (amount === null) return { ok: false, error: "Enter the provider’s pay in dollars." };
    try {
        const b = await load(reference);
        if (!b) return { ok: false, error: "Booking not found." };
        if (["completed", "cancelled"].includes(b.status)) return { ok: false, error: "This booking is closed." };
        const [p] = await db
            .select()
            .from(providers)
            .where(eq(providers.id, Number(providerId)))
            .limit(1);
        if (!p) return { ok: false, error: "Provider not found." };
        if (p.status !== "active") return { ok: false, error: `${p.name} isn’t active, so they can’t be assigned.` };
        await db.transaction(async (tx) => {
            await tx
                .update(bookings)
                .set({
                    providerId: p.id,
                    providerPay: amount.toFixed(2),
                    status: b.status === "new" ? "assigned" : b.status,
                    updatedAt: new Date(),
                })
                .where(eq(bookings.id, b.id));
            await log(
                tx,
                admin,
                b.id,
                "assigned",
                `Assigned to ${p.name}${p.business ? ` (${p.business})` : ""}, pay ${money2(amount)}`,
                `Assigned ${b.reference} to ${p.name}`,
            );
        });
        refresh(b.reference);
        return { ok: true };
    } catch (err) {
        return failed("assignProvider", err);
    }
}

export async function unassignProvider(reference) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const b = await load(reference);
        if (!b) return { ok: false, error: "Booking not found." };
        if (["completed", "cancelled"].includes(b.status)) return { ok: false, error: "This booking is closed." };
        await db.transaction(async (tx) => {
            await tx
                .update(bookings)
                .set({ providerId: null, providerPay: null, status: "new", updatedAt: new Date() })
                .where(eq(bookings.id, b.id));
            await log(tx, admin, b.id, "assigned", "Provider removed, needs re-assigning", `Removed the provider from ${b.reference}`);
        });
        refresh(b.reference);
        return { ok: true };
    } catch (err) {
        return failed("unassignProvider", err);
    }
}

export async function updateProviderPay(reference, pay) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const amount = payValue(pay);
    if (amount === null) return { ok: false, error: "Enter the provider’s pay in dollars." };
    try {
        const b = await load(reference);
        if (!b?.providerId) return { ok: false, error: "Assign a provider first." };
        await db.transaction(async (tx) => {
            await tx
                .update(bookings)
                .set({ providerPay: amount.toFixed(2), updatedAt: new Date() })
                .where(eq(bookings.id, b.id));
            await log(tx, admin, b.id, "assigned", `Provider pay set to ${money2(amount)}`);
        });
        refresh(b.reference);
        return { ok: true };
    } catch (err) {
        return failed("updateProviderPay", err);
    }
}

/* Status & payment ----------------------------------------------------------- */

export async function setBookingStatus(reference, status) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!(status in bookingStatus)) return { ok: false, error: "Unknown status." };
    try {
        const b = await load(reference);
        if (!b) return { ok: false, error: "Booking not found." };
        if (b.status === status) return { ok: true };
        if (status === "cancelled") return { ok: false, error: "Use “Cancel booking” so the reason is recorded." };
        if (["assigned", "confirmed", "in_progress", "completed"].includes(status) && !b.providerId) {
            return { ok: false, error: "Assign a provider before moving the job on." };
        }
        await db.transaction(async (tx) => {
            await tx
                .update(bookings)
                .set({
                    status,
                    ...(status === "new" ? { providerId: null, providerPay: null } : {}),
                    updatedAt: new Date(),
                })
                .where(eq(bookings.id, b.id));
            await log(
                tx,
                admin,
                b.id,
                "status",
                `Status changed from ${bookingStatus[b.status].label} to ${bookingStatus[status].label}${status === "new" ? " (provider removed)" : ""}`,
                `${b.reference} marked ${bookingStatus[status].label.toLowerCase()}`,
            );
        });
        refresh(b.reference);
        return { ok: true };
    } catch (err) {
        return failed("setBookingStatus", err);
    }
}

/**
 * Records money received or refunded outside the site (cash, bank transfer, terminal).
 * kind = "paid" | "refunded" | "unpaid"
 */
export async function recordPayment(reference, kind) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!["paid", "refunded", "unpaid"].includes(kind)) return { ok: false, error: "Unknown payment action." };
    try {
        const b = await load(reference);
        if (!b) return { ok: false, error: "Booking not found." };
        if (kind === "refunded" && !["paid", "partial"].includes(b.paymentStatus)) {
            return { ok: false, error: "Only paid bookings can be refunded." };
        }
        await db.transaction(async (tx) => {
            await tx.update(bookings).set({ paymentStatus: kind, updatedAt: new Date() }).where(eq(bookings.id, b.id));
            if (kind !== "unpaid") {
                await tx.insert(payments).values({
                    bookingId: b.id,
                    provider: "manual",
                    amount: Number(b.total).toFixed(2),
                    status: kind === "paid" ? "succeeded" : "refunded",
                });
            }
            const msg =
                kind === "paid"
                    ? `Payment of ${money2(b.total)} recorded`
                    : kind === "refunded"
                        ? `Refund of ${money2(b.total)} recorded`
                        : "Payment marked as unpaid";
            await log(tx, admin, b.id, "payment", msg, `${b.reference}: ${msg.toLowerCase()}`);
        });
        refresh(b.reference);
        return { ok: true };
    } catch (err) {
        return failed("recordPayment", err);
    }
}

/* Edit & cancel ---------------------------------------------------------------- */

const editSchema = z.object({
    date: z.string().refine(isISODate, { error: "Choose a valid date." }),
    slot: z.string().min(1).max(40),
    address: z.string().trim().min(5, { error: "Enter the full address." }).max(255),
    total: z.coerce.number().min(0, { error: "The total can’t be negative." }).max(100000),
    notes: z.string().trim().max(1000),
    notify: z.enum(["email", "none"]),
});

/** Edit date, window, address, total and access notes. Admins may book outside normal rules. */
export async function updateBookingDetails(reference, input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = editSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const v = parsed.data;
    try {
        const [b, rules, business] = await Promise.all([load(reference), getBookingRules(), getBusiness()]);
        if (!b) return { ok: false, error: "Booking not found." };
        if (!rules.timeSlots.includes(v.slot) && v.slot !== b.timeSlot) return { ok: false, error: "Choose an arrival window." };
        const total = cents(v.total);
        const changes = [];
        if (v.date !== b.serviceDate || v.slot !== b.timeSlot) {
            changes.push(`time ${formatISODate(b.serviceDate)} ${b.timeSlot} → ${formatISODate(v.date)} ${v.slot}`);
        }
        if (v.address !== b.addressLine) changes.push("address");
        if (total !== Number(b.total)) changes.push(`total ${money2(b.total)} → ${money2(total)}`);
        await db.transaction(async (tx) => {
            await tx
                .update(bookings)
                .set({
                    serviceDate: v.date,
                    timeSlot: v.slot,
                    addressLine: v.address,
                    total: total.toFixed(2),
                    accessNotes: v.notes || null,
                    updatedAt: new Date(),
                })
                .where(eq(bookings.id, b.id));
            await log(tx, admin, b.id, "status", `Details edited: ${changes.join("; ") || "notes"}`, `Edited ${b.reference}`);
        });
        let sent;
        if (v.notify === "email" && changes.length) {
            sent = await sendEmail(
                bookingUpdatedByTeam(business, {
                    reference: b.reference,
                    name: b.customerName,
                    email: b.customerEmail,
                    service: b.service,
                    packageName: b.packageName,
                    date: v.date,
                    slot: v.slot,
                    address: v.address,
                    total,
                }),
            );
            if (sent.ok && !sent.skipped) {
                await db.insert(bookingEvents).values({
                    bookingId: b.id,
                    type: "status",
                    message: sent.delivered ? "Customer emailed about the changes" : "Update email printed in the terminal (email not connected)",
                    actorId: admin.id,
                });
            }
        }
        refresh(b.reference);
        return { ok: true, warning: emailWarning(sent, "Booking updated") };
    } catch (err) {
        return failed("updateBookingDetails", err);
    }
}

const cancelReasons = ["Customer request", "No provider available", "Weather", "Duplicate booking", "Other"];

export async function adminCancelBooking(reference, reason, refund) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const why = cancelReasons.includes(reason) ? reason : "Other";
    try {
        const b = await load(reference);
        if (!b) return { ok: false, error: "Booking not found." };
        if (["completed", "cancelled"].includes(b.status)) return { ok: false, error: "This booking is already closed." };
        const paid = ["paid", "partial"].includes(b.paymentStatus);
        await db.transaction(async (tx) => {
            await tx
                .update(bookings)
                .set({ status: "cancelled", ...(paid && refund === "full" ? { paymentStatus: "refunded" } : {}), updatedAt: new Date() })
                .where(eq(bookings.id, b.id));
            if (paid && refund === "full") {
                await tx
                    .insert(payments)
                    .values({ bookingId: b.id, provider: "manual", amount: Number(b.total).toFixed(2), status: "refunded" });
            }
            const refundNote = !paid
                ? ""
                : refund === "full"
                    ? ", full refund recorded"
                    : refund === "partial"
                        ? ", partial refund to arrange"
                        : ", no refund";
            await log(tx, admin, b.id, "status", `Cancelled by admin (${why})${refundNote}`, `Cancelled ${b.reference} (${why})`);
        });
        const business = await getBusiness();
        const sent = await sendEmail(
            bookingCancelledByTeam(business, {
                reference: b.reference,
                name: b.customerName,
                email: b.customerEmail,
                date: b.serviceDate,
                slot: b.timeSlot,
                refund: paid ? refund : "none",
            }),
        );
        refresh(b.reference);
        return { ok: true, warning: emailWarning(sent, "Booking cancelled") };
    } catch (err) {
        return failed("adminCancelBooking", err);
    }
}

/* Notes, messages, notifications --------------------------------------------- */

export async function addBookingNote(reference, text) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const body = String(text ?? "").trim();
    if (!body) return { ok: false, error: "Write a note first." };
    if (body.length > 2000) return { ok: false, error: "Notes can be up to 2,000 characters." };
    try {
        const b = await load(reference);
        if (!b) return { ok: false, error: "Booking not found." };
        const [ev] = await db
            .insert(bookingEvents)
            .values({ bookingId: b.id, type: "note", message: body, actorId: admin.id })
            .returning();
        refresh(b.reference);
        return { ok: true, note: { id: ev.id, text: ev.message, at: ev.createdAt.toISOString(), by: admin.name } };
    } catch (err) {
        return failed("addBookingNote", err);
    }
}

/** Sorted team → customer message (shows in the customer's booking page). */
export async function sendTeamMessage(reference, text) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const body = String(text ?? "").trim();
    if (!body) return { ok: false, error: "Write a message first." };
    if (body.length > 2000) return { ok: false, error: "Messages can be up to 2,000 characters." };
    try {
        const b = await load(reference);
        if (!b) return { ok: false, error: "Booking not found." };
        const [ev] = await db
            .insert(bookingEvents)
            .values({ bookingId: b.id, type: "message_team", message: body, actorId: admin.id })
            .returning();
        const business = await getBusiness();
        const sent = await sendEmail(teamMessage(business, { reference: b.reference, name: b.customerName, email: b.customerEmail }, body));
        refresh(b.reference);
        return {
            ok: true,
            message: { from: "team", text: ev.message, at: ev.createdAt.toISOString() },
            warning: emailWarning(sent, "Message saved in their account"),
        };
    } catch (err) {
        return failed("sendTeamMessage", err);
    }
}

/** Records that the job sheet was sent (the admin's phone opens the SMS with the text filled in). */
export async function logJobSheetSent(reference) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const b = await load(reference);
        if (!b?.providerId) return { ok: false, error: "Assign a provider first." };
        await db.transaction((tx) => log(tx, admin, b.id, "assigned", "Job sheet sent to provider by SMS"));
        refresh(b.reference);
        return { ok: true };
    } catch (err) {
        return failed("logJobSheetSent", err);
    }
}

/** Emails the customer that a pro has been assigned (no provider details are shared). */
export async function notifyCustomerAssigned(reference) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const b = await load(reference);
        if (!b?.providerId) return { ok: false, error: "Assign a provider first." };
        const business = await getBusiness();
        const sent = await sendEmail(
            proAssigned(business, {
                reference: b.reference,
                name: b.customerName,
                email: b.customerEmail,
                date: b.serviceDate,
                slot: b.timeSlot,
                address: b.addressLine,
            }),
        );
        if (!sent.ok) return { ok: false, error: `The email wasn’t sent: ${sent.error}` };
        await db.transaction((tx) =>
            log(
                tx,
                admin,
                b.id,
                "assigned",
                sent.delivered ? "Customer emailed that a pro is assigned" : "“Pro assigned” email printed in the terminal (email not connected)",
            ),
        );
        refresh(b.reference);
        return { ok: true, warning: emailWarning(sent, "Saved") };
    } catch (err) {
        return failed("notifyCustomerAssigned", err);
    }
}

/** Emails an Australian tax invoice (line items, GST, ABN) to the customer. */
export async function emailInvoice(reference) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const [b, business, terms] = await Promise.all([load(reference), getBusiness(), getPaymentSettings()]);
        if (!b) return { ok: false, error: "Booking not found." };
        if (b.status === "cancelled") return { ok: false, error: "This booking is cancelled, so there’s nothing to invoice." };
        const [[amounts], extras] = await Promise.all([
            db
                .select({
                    subtotal: bookings.subtotal,
                    discount: bookings.discount,
                    surcharge: bookings.surcharge,
                    couponCode: bookings.couponCode,
                })
                .from(bookings)
                .where(eq(bookings.id, b.id)),
            db
                .select({ name: addOns.name, price: bookingAddOns.price })
                .from(bookingAddOns)
                .innerJoin(addOns, eq(bookingAddOns.addOnId, addOns.id))
                .where(eq(bookingAddOns.bookingId, b.id)),
        ]);
        const total = Number(b.total);
        const extrasTotal = extras.reduce((sum, x) => sum + Number(x.price), 0);
        const subtotal = Number(amounts.subtotal);
        const discount = Number(amounts.discount);
        const surcharge = Number(amounts.surcharge);
        // Subtotal = package + extras + area surcharge (pricing.js), so the package line is what's left
        // after the extras and surcharge — the price at booking time, even if the catalogue changed since.
        const lines = [
            { name: `${b.service} — ${b.packageName}`, amount: cents(subtotal - extrasTotal - surcharge) },
            ...extras.map((x) => ({ name: x.name, amount: Number(x.price) })),
        ];
        // Any price an admin set by hand (phone bookings, edits) shows as an adjustment so the lines add up.
        const adjustment = cents(total - (subtotal - discount));
        const sent = await sendEmail(
            taxInvoice(
                business,
                {
                    reference: b.reference,
                    name: b.customerName,
                    email: b.customerEmail,
                    date: b.serviceDate,
                    lines,
                    surcharge,
                    discount,
                    couponCode: amounts.couponCode,
                    adjustment: Math.abs(adjustment) >= 0.01 ? adjustment : 0,
                    total,
                    paid: b.paymentStatus === "paid",
                },
                todayISO(),
                terms.invoiceDays,
            ),
        );
        if (!sent.ok) return { ok: false, error: `The invoice wasn’t sent: ${sent.error}` };
        await db.transaction((tx) =>
            log(
                tx,
                admin,
                b.id,
                "payment",
                sent.delivered ? "Tax invoice emailed to customer" : "Tax invoice printed in the terminal (email not connected)",
            ),
        );
        refresh(b.reference);
        return { ok: true, warning: emailWarning(sent, "Invoice ready") };
    } catch (err) {
        return failed("emailInvoice", err);
    }
}

/* New booking (phone / email) ------------------------------------------------- */

const newSchema = z.object({
    customerMode: z.enum(["existing", "new"]),
    customerId: z.string().max(64).optional().default(""),
    name: z.string().trim().max(120).optional().default(""),
    email: z.string().trim().toLowerCase().max(255).optional().default(""),
    phone: z.string().trim().max(32).optional().default(""),
    categorySlug: z.string().min(1).max(80),
    packageId: z.string().min(1).max(20),
    addOnIds: z.array(z.string().max(20)).max(30).default([]),
    street: z.string().trim().min(4, { error: "Enter the street address." }).max(200),
    suburb: z.string().trim().min(1, { error: "Choose a suburb." }).max(80),
    date: z.string().refine(isISODate, { error: "Choose a date." }),
    slot: z.string().min(1, { error: "Choose an arrival window." }).max(40),
    notes: z.string().trim().max(1000).default(""),
    override: z.string().trim().max(12).default(""),
    payment: z.enum(["later", "paid"]),
    sendConfirmation: z.boolean(),
});

export async function createAdminBooking(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = newSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const v = parsed.data;
    if (v.customerMode === "new") {
        if (v.name.length < 2) return { ok: false, error: "Enter the customer’s name." };
        if (!z.email().safeParse(v.email).success) return { ok: false, error: "Enter a valid email address." };
        if (v.phone.replace(/\D/g, "").length < 8) return { ok: false, error: "Enter a valid mobile number." };
    } else if (!v.customerId) return { ok: false, error: "Choose a customer." };

    try {
        const rules = await getBookingRules();
        if (!rules.timeSlots.includes(v.slot)) return { ok: false, error: "Choose an arrival window." };
        const priced = await priceBooking({
            categorySlug: v.categorySlug,
            packageId: v.packageId,
            addOnIds: v.addOnIds,
            suburb: v.suburb,
        });
        if (!priced.ok) return { ok: false, error: priced.error };
        const q = priced.quote;
        let total = q.total;
        if (v.override) {
            const o = Number(v.override);
            if (!Number.isFinite(o) || o < 0 || o > 100000) return { ok: false, error: "The price override must be a dollar amount." };
            total = cents(o);
        }

        const result = await db.transaction(async (tx) => {
            let userId;
            let email;
            let name;
            if (v.customerMode === "existing") {
                const [u] = await tx
                    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
                    .from(users)
                    .where(eq(users.id, v.customerId))
                    .limit(1);
                if (!u || u.role !== "customer") throw new Error("NO_CUSTOMER");
                ({ id: userId, email, name } = u);
            } else {
                const [existing] = await tx
                    .select({ id: users.id, name: users.name, role: users.role })
                    .from(users)
                    .where(eq(sql`lower(${users.email})`, v.email))
                    .limit(1);
                if (existing && existing.role !== "customer") throw new Error("ADMIN_EMAIL");
                if (existing) {
                    userId = existing.id;
                    name = existing.name;
                } else {
                    userId = randomUUID();
                    name = v.name;
                    await tx.insert(users).values({ id: userId, name: v.name, email: v.email, phone: v.phone, role: "customer" });
                }
                email = v.email;
            }

            await lockBookings(tx);
            const reference = await nextReference(tx);
            const [b] = await tx
                .insert(bookings)
                .values({
                    reference,
                    userId,
                    categoryId: q.category.id,
                    packageId: q.package.id,
                    status: "new",
                    paymentStatus: v.payment === "paid" ? "paid" : "unpaid",
                    addressLine: `${v.street}, ${q.suburb.name} TAS ${q.suburb.postcode}`,
                    suburbId: q.suburb.id,
                    accessNotes: v.notes || null,
                    serviceDate: v.date,
                    timeSlot: v.slot,
                    subtotal: q.subtotal.toFixed(2),
                    discount: "0.00",
                    surcharge: q.surcharge.toFixed(2),
                    total: total.toFixed(2),
                })
                .returning({ id: bookings.id });
            if (q.addOns.length) {
                await tx
                    .insert(bookingAddOns)
                    .values(q.addOns.map((a) => ({ bookingId: b.id, addOnId: a.id, price: a.price.toFixed(2) })));
            }
            if (v.payment === "paid") {
                await tx.insert(payments).values({ bookingId: b.id, provider: "manual", amount: total.toFixed(2), status: "succeeded" });
            }
            await log(
                tx,
                admin,
                b.id,
                "created",
                `Booked by ${who(admin)} by phone/email${v.override ? `, price set to ${money2(total)}` : ""}`,
                `New booking ${reference} — ${q.category.name}, ${q.suburb.name} (phone)`,
            );
            return { reference, email, name, bookingId: b.id };
        });

        let sent;
        if (v.sendConfirmation) {
            const business = await getBusiness();
            sent = await sendEmail(
                bookingConfirmedByTeam(business, {
                    reference: result.reference,
                    name: result.name,
                    email: result.email,
                    service: q.category.name,
                    packageName: q.package.name,
                    date: v.date,
                    slot: v.slot,
                    address: `${v.street}, ${q.suburb.name} TAS ${q.suburb.postcode}`,
                    total,
                    paid: v.payment === "paid",
                }),
            );
            if (!sent.skipped) {
                await db.insert(bookingEvents).values({
                    bookingId: result.bookingId,
                    type: "status",
                    message: !sent.ok
                        ? `Confirmation email not sent: ${sent.error}`
                        : sent.delivered
                            ? "Confirmation emailed to customer"
                            : "Confirmation printed in the terminal (email not connected)",
                    actorId: admin.id,
                });
            }
        }
        refresh(result.reference);
        return { ok: true, reference: result.reference, warning: emailWarning(sent, "Booking created") };
    } catch (err) {
        if (err.message === "NO_CUSTOMER") return { ok: false, error: "That customer no longer exists." };
        if (err.message === "ADMIN_EMAIL") return { ok: false, error: "That email belongs to an admin account." };
        return failed("createAdminBooking", err, "We couldn’t create the booking. Please try again.");
    }
}