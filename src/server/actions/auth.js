// src/server/actions/auth.js
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth, authProviders } from "@/server/auth";
import { homeFor, safeNext } from "@/server/session";
import { logError } from "@/server/errors";

const email = z.email({ error: "Enter a valid email address." }).max(255);
const password = z.string().min(8, { error: "Use at least 8 characters." }).max(128, { error: "Use 128 characters or fewer." });

const errorCode = (err) => err?.body?.code ?? err?.code ?? "";

function fieldErrors(error) {
    const out = {};
    for (const i of error.issues) if (i.path[0] && !out[i.path[0]]) out[i.path[0]] = i.message;
    return out;
}

const cleanEmail = (v) =>
    String(v ?? "")
        .trim()
        .toLowerCase();

/** Log in with email + password. On success redirects (admin → /admin, customer → /account or `next`). */
export async function signIn(formData) {
    const parsed = z
        .object({ email, password: z.string().min(1, { error: "Enter your password." }).max(128) })
        .safeParse({ email: cleanEmail(formData.get("email")), password: String(formData.get("password") ?? "") });
    if (!parsed.success)
        return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

    let userId;
    try {
        const res = await auth.api.signInEmail({
            body: { email: parsed.data.email, password: parsed.data.password, rememberMe: formData.get("remember") !== "off" },
            headers: await headers(),
        });
        userId = res.user.id;
    } catch (err) {
        const code = errorCode(err);
        if (code === "ACCOUNT_BLOCKED" || err?.body?.message === "ACCOUNT_BLOCKED") {
            return { ok: false, error: "This account has been suspended. Please contact us." };
        }
        if (code === "INVALID_EMAIL_OR_PASSWORD") {
            return {
                ok: false,
                error: "That email and password don’t match. If you booked as a guest, use “Forgot your password?” to set one.",
            };
        }
        if (err?.status === "TOO_MANY_REQUESTS" || err?.statusCode === 429) {
            return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
        }
        logError("signIn", err);
        return { ok: false, error: "We couldn’t log you in right now. Please try again." };
    }

    const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    redirect(safeNext(formData.get("next"), homeFor(u)));
}

const registerSchema = z.object({
    name: z.string().trim().min(2, { error: "Enter your full name." }).max(120),
    email,
    phone: z
        .string()
        .trim()
        .max(32)
        .refine((v) => v.replace(/\D/g, "").length >= 8, { error: "Enter a valid mobile number." }),
    password,
    marketingOptIn: z.boolean(),
});

/** Create a customer account, then sign in and go to /account (or `next`). */
export async function signUp(formData) {
    const parsed = registerSchema.safeParse({
        name: formData.get("name") ?? "",
        email: cleanEmail(formData.get("email")),
        phone: formData.get("phone") ?? "",
        password: String(formData.get("password") ?? ""),
        marketingOptIn: formData.get("marketingOptIn") === "on",
    });
    if (!parsed.success)
        return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

    try {
        await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
    } catch (err) {
        const code = errorCode(err);
        if (code.startsWith("USER_ALREADY_EXISTS")) {
            return {
                ok: false,
                error: "An account with this email already exists. Log in, or use “Forgot your password?” to set a password.",
                fieldErrors: { email: "Already registered." },
            };
        }
        if (code === "PASSWORD_TOO_SHORT") return { ok: false, fieldErrors: { password: "Use at least 8 characters." } };
        logError("signUp", err);
        return { ok: false, error: "We couldn’t create your account right now. Please try again." };
    }
    redirect(safeNext(formData.get("next"), "/account"));
}

/** Emails a reset link. Always reports success so nobody can test which emails are registered. */
export async function requestPasswordReset(formData) {
    const parsed = email.safeParse(cleanEmail(formData.get("email")));
    if (!parsed.success) return { ok: false, fieldErrors: { email: "Enter a valid email address." } };
    try {
        await auth.api.requestPasswordReset({
            body: { email: parsed.data, redirectTo: "/reset-password" },
            headers: await headers(),
        });
    } catch (err) {
        logError("requestPasswordReset", err);
    }
    return { ok: true };
}

/** Sets a new password from the emailed link. Also works for guests who never had a password. */
export async function resetPassword(formData) {
    const token = String(formData.get("token") ?? "");
    const newPassword = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    const check = password.safeParse(newPassword);
    if (!check.success) return { ok: false, fieldErrors: { password: check.error.issues[0].message } };
    if (newPassword !== confirm) return { ok: false, fieldErrors: { confirm: "Passwords don’t match." } };
    if (!token) return { ok: false, error: "This reset link is invalid. Please request a new one." };
    try {
        await auth.api.resetPassword({ body: { newPassword, token }, headers: await headers() });
    } catch (err) {
        if (errorCode(err) === "INVALID_TOKEN") {
            return { ok: false, error: "This reset link has expired or was already used. Please request a new one." };
        }
        logError("resetPassword", err);
        return { ok: false, error: "We couldn’t reset your password right now. Please try again." };
    }
    redirect("/login?reset=done");
}

/** Starts “Continue with Google”. Returns { ok, url } for the browser to follow. */
export async function startGoogleSignIn(next) {
    if (!authProviders.google) return { ok: false, error: "Google sign-in isn’t set up yet." };
    try {
        const res = await auth.api.signInSocial({
            body: {
                provider: "google",
                callbackURL: `/login?next=${encodeURIComponent(safeNext(next, ""))}`,
                errorCallbackURL: "/login?error=google",
            },
            headers: await headers(),
        });
        return res?.url ? { ok: true, url: res.url } : { ok: false, error: "Google sign-in isn’t available right now." };
    } catch (err) {
        logError("startGoogleSignIn", err);
        return { ok: false, error: "Google sign-in isn’t available right now." };
    }
}

/** Logs out and goes to the home page. Use as <form action={signOut}>. */
export async function signOut() {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch (err) {
        logError("signOut", err);
    }
    redirect("/");
}