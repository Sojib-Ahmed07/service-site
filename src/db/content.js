// src/db/content.js
/**
 * Adds the starting website content to a database that's already in use, without
 * touching anything you've edited.
 *
 *   npm run db:content
 *
 * - Built-in pages (/about, /terms, /privacy…) that are missing, or still empty from
 *   an older seed, get their starting text.
 * - Missing settings (homepage, notifications, payments) are added.
 * Safe to run more than once.
 */
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as s from "./schema.js";
import { defaultContentSettings, defaultPageRows } from "./content-defaults.js";
import { databaseUrl } from "./url.js";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local.");
    process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl() });
const db = drizzle(pool, { schema: s });

async function main() {
    const report = { added: [], filled: [], kept: [], settings: [] };
    await db.transaction(async (tx) => {
        for (const row of defaultPageRows()) {
            const [existing] = await tx.select().from(s.pages).where(eq(s.pages.slug, row.slug)).limit(1);
            if (!existing) {
                await tx.insert(s.pages).values(row);
                report.added.push(row.slug);
            } else if (!existing.intro && !(existing.blocks ?? []).length) {
                // Created by an older seed with no content yet.
                await tx
                    .update(s.pages)
                    .set({ title: row.title, intro: row.intro, blocks: row.blocks, status: "published", updatedAt: new Date() })
                    .where(eq(s.pages.id, existing.id));
                report.filled.push(row.slug);
            } else {
                report.kept.push(row.slug);
            }
        }
        for (const [key, value] of Object.entries(defaultContentSettings)) {
            const r = await tx.insert(s.siteSettings).values({ key, value }).onConflictDoNothing().returning({ key: s.siteSettings.key });
            if (r.length) report.settings.push(key);
        }
    });
    console.log("Pages added:      ", report.added.join(", ") || "none");
    console.log("Pages filled in:  ", report.filled.join(", ") || "none");
    console.log("Pages left as-is: ", report.kept.join(", ") || "none");
    console.log("Settings added:   ", report.settings.join(", ") || "none");
}

main()
    .catch((err) => {
        console.error("Failed:", err.message);
        if (/column .* does not exist|relation .* does not exist/i.test(err.message)) {
            console.error("Run `npm run db:push` first so the database has the new columns.");
        }
        process.exitCode = 1;
    })
    .finally(() => pool.end());