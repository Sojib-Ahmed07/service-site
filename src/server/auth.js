// src/server/auth.js
/**
 * Better Auth configuration (server only).
 * Two roles: "customer" (default for everyone who signs up) and "admin" (set by
 * `npm run user:password -- --admin …` or directly in the database). Never by sign-up.
 *
 * Docs: https://www.better-auth.com/docs
 */
import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { site } from "@/lib/site";
import { sendEmail } from "@/server/email";
import { passwordReset } from "@/server/email-templates";
import { getBusiness } from "@/server/queries/settings";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
    appName: site.name,
    baseURL: site.url,
    secret: process.env.AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: { user: users, session: sessions, account: accounts, verification: verifications },
        transaction: true,
    }),

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true, // signed in straight after creating an account
        requireEmailVerification: false,
        resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
        revokeSessionsOnPasswordReset: true,
        // Security email: always sent, whatever the customer's notification settings.
        sendResetPassword: async ({ user, url }) => {
            const res = await sendEmail(passwordReset(await getBusiness(), user, url));
            // Throwing lets callers tell the difference (the customer still sees the same neutral message).
            if (!res.ok) throw new Error(`EMAIL_FAILED: ${res.error}`);
        },
    },

    socialProviders: googleEnabled
        ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
        : {},

    user: {
        additionalFields: {
            phone: { type: "string", required: false, input: true },
            marketingOptIn: { type: "boolean", required: false, defaultValue: false, input: true },
            role: { type: "string", required: false, defaultValue: "customer", input: false },
            blocked: { type: "boolean", required: false, defaultValue: false, input: false },
            notifySms: { type: "boolean", required: false, defaultValue: true, input: false },
            notifyEmail: { type: "boolean", required: false, defaultValue: true, input: false },
            teamRole: { type: "string", required: false, input: false },
        },
    },

    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // refresh the expiry once a day while in use
    },

    databaseHooks: {
        session: {
            create: {
                // Blocked customers can't sign in (Admin › Customers › Block).
                before: async (session) => {
                    const [u] = await db.select({ blocked: users.blocked }).from(users).where(eq(users.id, session.userId)).limit(1);
                    if (u?.blocked) {
                        throw new APIError("FORBIDDEN", { message: "ACCOUNT_BLOCKED", code: "ACCOUNT_BLOCKED" });
                    }
                },
            },
        },
    },

    plugins: [nextCookies()], // must be last: lets Server Actions set the session cookie
});

export const authProviders = { google: googleEnabled };