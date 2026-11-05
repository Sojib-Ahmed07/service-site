// src/server/queries/account.js
/**
 * The signed-in customer's own data. Every query is scoped by userId, so one
 * customer can never load another customer's bookings or addresses.
 * Provider details are never returned here (customers only see "a vetted pro").
 */
import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { addOns, addresses, bookingAddOns, bookingEvents, bookings, categories, packages, reviews, suburbs } from "@/db/schema";

const ACTIVE = ["new", "assigned", "confirmed", "in_progress"];

const bookingColumns = {
    dbId: bookings.id,
    id: bookings.reference,
    status: bookings.status,
    payment: bookings.paymentStatus,
    date: bookings.serviceDate,
    slot: bookings.timeSlot,
    address: bookings.addressLine,
    notes: bookings.accessNotes,
    subtotal: bookings.subtotal,
    discount: bookings.discount,
    surcharge: bookings.surcharge,
    total: bookings.total,
    couponCode: bookings.couponCode,
    hasProvider: sql`${bookings.providerId} is not null`.mapWith(Boolean),
    createdAt: bookings.createdAt,
    category: categories.slug,
    categoryName: categories.name,
    icon: categories.icon,
    packageName: packages.name,
    packagePrice: packages.price,
};

function toBooking(r) {
    return {
        ...r,
        subtotal: Number(r.subtotal),
        discount: Number(r.discount),
        surcharge: Number(r.surcharge),
        total: Number(r.total),
        packagePrice: Number(r.packagePrice),
        notes: r.notes ?? "",
    };
}

/** All of a customer's bookings, newest service date first. */
export const getMyBookings = cache(async (userId) => {
    const rows = await db
        .select(bookingColumns)
        .from(bookings)
        .innerJoin(categories, eq(bookings.categoryId, categories.id))
        .innerJoin(packages, eq(bookings.packageId, packages.id))
        .where(eq(bookings.userId, userId))
        .orderBy(desc(bookings.serviceDate), desc(bookings.createdAt));
    return rows.map(toBooking);
});

/** Splits bookings into upcoming (soonest first) and past (most recent first). */
export function splitBookings(list) {
    const upcoming = list.filter((b) => ACTIVE.includes(b.status)).sort((a, b) => a.date.localeCompare(b.date));
    const past = list.filter((b) => !ACTIVE.includes(b.status));
    return { upcoming, past };
}

/**
 * One booking by reference, only if it belongs to this customer. Includes extras
 * (with the price paid at the time) and the customer ↔ team message thread.
 */
export const getMyBooking = cache(async (userId, reference) => {
    const [row] = await db
        .select(bookingColumns)
        .from(bookings)
        .innerJoin(categories, eq(bookings.categoryId, categories.id))
        .innerJoin(packages, eq(bookings.packageId, packages.id))
        .where(and(eq(bookings.userId, userId), eq(bookings.reference, String(reference))))
        .limit(1);
    if (!row) return null;

    const [extras, messages, review] = await Promise.all([
        db
            .select({ id: addOns.id, name: addOns.name, price: bookingAddOns.price })
            .from(bookingAddOns)
            .innerJoin(addOns, eq(bookingAddOns.addOnId, addOns.id))
            .where(eq(bookingAddOns.bookingId, row.dbId))
            .orderBy(asc(addOns.id)),
        db
            .select({ type: bookingEvents.type, text: bookingEvents.message, at: bookingEvents.createdAt })
            .from(bookingEvents)
            .where(and(eq(bookingEvents.bookingId, row.dbId), inArray(bookingEvents.type, ["message_customer", "message_team"])))
            .orderBy(asc(bookingEvents.createdAt)),
        db.select({ id: reviews.id }).from(reviews).where(eq(reviews.bookingId, row.dbId)).limit(1),
    ]);

    const b = toBooking(row);
    return {
        ...b,
        reviewed: review.length > 0,
        extras: extras.map((e) => ({ id: String(e.id), name: e.name, price: Number(e.price) })),
        messages: messages.map((m) => ({
            from: m.type === "message_team" ? "team" : "customer",
            text: m.text,
            at: m.at.toISOString(),
        })),
    };
});

/** Total paid with us (paid bookings only). */
export const getMySpend = cache(async (userId) => {
    const [r] = await db
        .select({ total: sql`coalesce(sum(${bookings.total}), 0)` })
        .from(bookings)
        .where(and(eq(bookings.userId, userId), eq(bookings.paymentStatus, "paid")));
    return Number(r.total);
});

/** Saved addresses, default first. */
export const getMyAddresses = cache(async (userId) => {
    const rows = await db
        .select({
            id: addresses.id,
            label: addresses.label,
            line1: addresses.line1,
            line2: addresses.line2,
            notes: addresses.accessNotes,
            isDefault: addresses.isDefault,
            suburb: suburbs.name,
            postcode: suburbs.postcode,
        })
        .from(addresses)
        .innerJoin(suburbs, eq(addresses.suburbId, suburbs.id))
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.isDefault), asc(addresses.id));
    return rows.map((a) => ({
        ...a,
        label: a.label || "Address",
        line2: a.line2 ?? "",
        notes: a.notes ?? "",
        line: [a.line1, a.line2].filter(Boolean).join(", ") + `, ${a.suburb} TAS ${a.postcode}`,
    }));
});