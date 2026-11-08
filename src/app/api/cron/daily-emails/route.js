// src/app/api/cron/daily-emails/route.js
/**
 * GET /api/cron/daily-emails — sends day-before reminders and review requests.
 * Vercel Cron calls it once a day (see vercel.json) with "Authorization: Bearer <CRON_SECRET>".
 * Run it yourself (PowerShell):
 *   curl.exe -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/daily-emails
 * Or use "Run now" in Admin › Settings › Notifications.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { logError } from "@/server/errors";
import { runDailyEmails } from "@/server/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const digest = (s) => createHash("sha256").update(s).digest();

export async function GET(request) {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret || secret.length < 16) {
        return Response.json({ ok: false, error: "CRON_SECRET isn't set (16+ characters)." }, { status: 503 });
    }
    const given = request.headers.get("authorization") ?? "";
    if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) {
        return Response.json({ ok: false, error: "Unauthorised." }, { status: 401 });
    }
    try {
        const result = await runDailyEmails();
        return Response.json(result);
    } catch (err) {
        logError("cron:daily-emails", err);
        return Response.json({ ok: false, error: "The daily emails failed. Check the server logs." }, { status: 500 });
    }
}