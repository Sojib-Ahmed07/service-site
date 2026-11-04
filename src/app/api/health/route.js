// src/app/api/health/route.js
/** GET /api/health → { ok: true, db: "up" } when the database answers. Handy for uptime checks. */
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await db.execute(sql`select 1`);
        return Response.json({ ok: true, db: "up" });
    } catch (err) {
        console.error("[health]", err.message);
        return Response.json({ ok: false, db: "down" }, { status: 503 });
    }
}