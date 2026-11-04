// src/server/actions/account.js
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, addresses, bookings, sessions, suburbs, users, zones } from "@/db/schema";
import { auth } from "@/server/auth";
import { getCurrentUser } from "@/server/session";

const MAX_ADDRESSES = 10;

function fieldErrors(error) {
    const out = {};
    for (const i of error.issues) if (i.path[0] && !out[i.path[0]]) out[i.path[0]] = i.message;
    return out;
}

async function me() {
    const user = await getCurrentUser();
    if (!user) throw new Error("NOT_SIGNED_IN");
    return user;
}

const signedOut = { ok: false, error: "Your session has ended. Please log in again." };

/* Profile ------------------------------------------------------------------ */

const profileSchema = z.object({
    name: z.string().trim().min(2, { error: "Enter your full name." }).max(120),
    phone: z
        .string()
        .trim()
        .max(32)
        .refine((v) => v === "" || v.replace(/\D/g, "").length >= 8, { error: "Enter a valid mobile number." }),
});

export async function updateProfile(formData) {
    let user;
    try {
        user = await me();
    } catch {
        return signedOut;
    }
    const parsed = profileSchema.safeParse({ name: formData.get("name") ?? "", phone: formData.get("phone") ?? "" });
    if (!parsed.success)
        return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    try {
        await db
            .update(users)
            .set({ name: parsed.data.name, phone: parsed.data.phone || null, updatedAt: new Date() })
            .where(eq(users.id, user.id));
        revalidatePath("/account", "layout");
        return { ok: true, message: "Details saved." };
    } catch (err) {
        console.error("[updateProfile]", err);
        return { ok: false, error: "We couldn’t save your details. Please try again." };
    }
}

const prefKeys = { notifySms: users.notifySms, notifyEmail: users.notifyEmail, marketingOptIn: users.marketingOptIn };

/** Saves one notification switch. key = "notifySms" | "notifyEmail" | "marketingOptIn". */
export async function updateNotificationPref(key, value) {
    let user;
    try {
        user = await me();
    } catch {
        return signedOut;
    }
    if (!(key in prefKeys) || typeof value !== "boolean") return { ok: false, error: "Unknown setting." };
    try {
        await db
            .update(users)
            .set({ [key]: value, updatedAt: new Date() })
            .where(eq(users.id, user.id));
        return { ok: true };
    } catch (err) {
        console.error("[updateNotificationPref]", err);
        return { ok: false, error: "We couldn’t save that setting. Please try again." };
    }
}

/* Password ----------------------------------------------------------------- */

export async function changePassword(formData) {
    let user;
    try {
        user = await me();
    } catch {
        return signedOut;
    }
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (!currentPassword) return { ok: false, fieldErrors: { currentPassword: "Enter your current password." } };
    if (newPassword.length < 8) return { ok: false, fieldErrors: { newPassword: "Use at least 8 characters." } };
    if (newPassword.length > 128) return { ok: false, fieldErrors: { newPassword: "Use 128 characters or fewer." } };
    if (newPassword !== confirm) return { ok: false, fieldErrors: { confirm: "Passwords don’t match." } };

    const [cred] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential")))
        .limit(1);
    if (!cred) {
        return {
            ok: false,
            error: "Your account doesn’t have a password yet. Log out and use “Forgot your password?” to set one.",
        };
    }

    try {
        const h = await headers();
        // Keep this session (so the page doesn't log you out) and end every other one.
        await auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: false }, headers: h });
        await auth.api.revokeOtherSessions({ headers: h });
        return { ok: true, message: "Password updated. Other devices have been logged out." };
    } catch (err) {
        const code = err?.body?.code ?? "";
        if (code === "INVALID_PASSWORD") return { ok: false, fieldErrors: { currentPassword: "That isn’t your current password." } };
        console.error("[changePassword]", err);
        return { ok: false, error: "We couldn’t change your password. Please try again." };
    }
}

/* Addresses ---------------------------------------------------------------- */

const addressSchema = z.object({
    id: z.coerce.number().int().positive().optional(),
    label: z.string().trim().max(40).default(""),
    line1: z.string().trim().min(4, { error: "Enter the street address." }).max(200),
    line2: z.string().trim().max(200).default(""),
    suburb: z.string().trim().min(1, { error: "Choose a suburb." }).max(80),
    notes: z.string().trim().max(1000).default(""),
    isDefault: z.boolean(),
});

/** Adds or edits a saved address (FormData from the address dialog). */
export async function saveAddress(formData) {
    let user;
    try {
        user = await me();
    } catch {
        return signedOut;
    }
    const parsed = addressSchema.safeParse({
        id: formData.get("id") || undefined,
        label: formData.get("label") ?? "",
        line1: formData.get("line1") ?? "",
        line2: formData.get("line2") ?? "",
        suburb: formData.get("suburb") ?? "",
        notes: formData.get("notes") ?? "",
        isDefault: formData.get("isDefault") === "on",
    });
    if (!parsed.success)
        return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    const v = parsed.data;

    try {
        const [sub] = await db
            .select({ id: suburbs.id })
            .from(suburbs)
            .innerJoin(zones, eq(suburbs.zoneId, zones.id))
            .where(and(eq(suburbs.name, v.suburb), eq(suburbs.active, true), eq(zones.active, true)))
            .limit(1);
        if (!sub) return { ok: false, fieldErrors: { suburb: "We don’t cover that suburb yet." } };

        await db.transaction(async (tx) => {
            const mine = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, user.id));
            if (v.id && !mine.some((a) => a.id === v.id)) throw new Error("NOT_FOUND");
            if (!v.id && mine.length >= MAX_ADDRESSES) throw new Error("TOO_MANY");
            const makeDefault = v.isDefault || mine.length === 0 || (mine.length === 1 && v.id === mine[0].id);
            if (makeDefault) await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));

            const values = {
                label: v.label || "Home",
                line1: v.line1,
                line2: v.line2 || null,
                suburbId: sub.id,
                accessNotes: v.notes || null,
                ...(makeDefault ? { isDefault: true } : {}),
                updatedAt: new Date(),
            };
            if (v.id) {
                await tx
                    .update(addresses)
                    .set(values)
                    .where(and(eq(addresses.id, v.id), eq(addresses.userId, user.id)));
            } else {
                await tx.insert(addresses).values({ ...values, userId: user.id, isDefault: makeDefault });
            }
        });
        revalidatePath("/account/addresses");
        return { ok: true };
    } catch (err) {
        if (err.message === "NOT_FOUND") return { ok: false, error: "That address no longer exists." };
        if (err.message === "TOO_MANY") return { ok: false, error: `You can save up to ${MAX_ADDRESSES} addresses.` };
        console.error("[saveAddress]", err);
        return { ok: false, error: "We couldn’t save that address. Please try again." };
    }
}

export async function deleteAddress(id) {
    let user;
    try {
        user = await me();
    } catch {
        return signedOut;
    }
    const addressId = Number(id);
    if (!Number.isInteger(addressId)) return { ok: false, error: "Unknown address." };
    try {
        await db.transaction(async (tx) => {
            const [gone] = await tx
                .delete(addresses)
                .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)))
                .returning();
            // If the default was removed, the oldest remaining address becomes the default.
            if (gone?.isDefault) {
                const [next] = await tx
                    .select({ id: addresses.id })
                    .from(addresses)
                    .where(eq(addresses.userId, user.id))
                    .orderBy(asc(addresses.id))
                    .limit(1);
                if (next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
            }
        });
        revalidatePath("/account/addresses");
        return { ok: true };
    } catch (err) {
        console.error("[deleteAddress]", err);
        return { ok: false, error: "We couldn’t remove that address. Please try again." };
    }
}

export async function makeDefaultAddress(id) {
    let user;
    try {
        user = await me();
    } catch {
        return signedOut;
    }
    const addressId = Number(id);
    if (!Number.isInteger(addressId)) return { ok: false, error: "Unknown address." };
    try {
        await db.transaction(async (tx) => {
            const [own] = await tx
                .select({ id: addresses.id })
                .from(addresses)
                .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)))
                .limit(1);
            if (!own) throw new Error("NOT_FOUND");
            await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
            await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, addressId));
        });
        revalidatePath("/account/addresses");
        return { ok: true };
    } catch (err) {
        if (err.message === "NOT_FOUND") return { ok: false, error: "That address no longer exists." };
        console.error("[makeDefaultAddress]", err);
        return { ok: false, error: "We couldn’t update that address. Please try again." };
    }
}

/* Delete account ----------------------------------------------------------- */

/**
 * Removes the customer's personal details, saved addresses, logins and sessions.
 * Booking records stay (tax invoices must be kept for 5 years) but are no longer
 * linked to a name, email or phone. Admins can't delete themselves here.
 */
export async function deleteAccount(formData) {
    let user;
    try {
        user = await me();
    } catch {
        return signedOut;
    }
    if (user.role === "admin") return { ok: false, error: "Admin accounts can’t be deleted here." };
    if (
        String(formData.get("confirm") ?? "")
            .trim()
            .toLowerCase() !== "delete"
    ) {
        return { ok: false, fieldErrors: { confirm: "Type DELETE to confirm." } };
    }
    const [active] = await db
        .select({ n: sql`count(*)::int` })
        .from(bookings)
        .where(and(eq(bookings.userId, user.id), inArray(bookings.status, ["new", "assigned", "confirmed", "in_progress"])));
    if (active.n > 0) {
        return { ok: false, error: "You have upcoming bookings. Cancel them, or contact us, before deleting your account." };
    }

    try {
        await auth.api.signOut({ headers: await headers() });
    } catch {
        // The session is removed below anyway.
    }
    try {
        await db.transaction(async (tx) => {
            await tx.delete(addresses).where(eq(addresses.userId, user.id));
            await tx.delete(sessions).where(eq(sessions.userId, user.id));
            await tx.delete(accounts).where(eq(accounts.userId, user.id));
            await tx
                .update(users)
                .set({
                    name: "Deleted customer",
                    email: `deleted-${user.id}@deleted.invalid`,
                    phone: null,
                    image: null,
                    blocked: true,
                    marketingOptIn: false,
                    notifyEmail: false,
                    notifySms: false,
                    updatedAt: new Date(),
                })
                .where(and(eq(users.id, user.id), ne(users.role, "admin")));
        });
    } catch (err) {
        console.error("[deleteAccount]", err);
        return { ok: false, error: "We couldn’t delete your account. Please contact us." };
    }
    redirect("/?account=deleted");
}