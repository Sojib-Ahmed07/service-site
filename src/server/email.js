// src/server/email.js
/**
 * Sends an email. No email provider is connected yet (that's the notifications batch),
 * so for now the message is printed in the server terminal. In development, copy the
 * password-reset link from there.
 */
import "server-only";
import { getNotificationSettings } from "@/server/queries/settings";

/**
 * `event` ("confirmation" | "cancellation") marks an automatic email that can be
 * switched off in Admin › Settings › Notifications. Emails without one always send.
 */
export async function sendEmail({ to, subject, text, event }) {
    if (event) {
        const settings = await getNotificationSettings();
        if (settings.emails?.[event] === false) return { ok: true, skipped: true };
    }
    const line = "-".repeat(60);
    console.log(`\n${line}\n[email] To: ${to}\n[email] Subject: ${subject}\n\n${text}\n${line}\n`);
    if (process.env.NODE_ENV === "production") {
        console.warn("[email] No email provider configured yet, so this email was NOT delivered.");
    }
    return { ok: true };
}