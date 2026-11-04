// src/server/session.js
/**
 * Who is signed in? Use these in Server Components, layouts and Server Actions.
 *   const user = await getCurrentUser();       // user or null
 *   const user = await requireUser("/account"); // redirects to /login if signed out
 *   const admin = await requireAdmin();         // redirects unless role === "admin"
 * Always re-check inside Server Actions: proxy.js only does a quick cookie check.
 */
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export const getCurrentUser = cache(async () => {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const user = session?.user;
        if (!user || user.blocked) return null;
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone ?? "",
            image: user.image ?? null,
            role: user.role === "admin" ? "admin" : "customer",
            teamRole: user.teamRole ?? null,
            marketingOptIn: Boolean(user.marketingOptIn),
            notifySms: user.notifySms !== false,
            notifyEmail: user.notifyEmail !== false,
            createdAt: user.createdAt,
        };
    } catch (err) {
        console.error("[session]", err.message);
        return null;
    }
});

/** Only allow same-site relative paths as post-login destinations. */
export function safeNext(next, fallback) {
    const n = typeof next === "string" ? next : "";
    return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : fallback;
}

export async function requireUser(next = "/account") {
    const user = await getCurrentUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
    return user;
}

export async function requireAdmin() {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/admin");
    if (user.role !== "admin") redirect("/account");
    return user;
}

/** Where to send someone after they sign in. */
export const homeFor = (user) => (user?.role === "admin" ? "/admin" : "/account");