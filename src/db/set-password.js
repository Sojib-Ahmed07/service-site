// src/db/set-password.js
/**
 * Set a password for a user, and optionally make them an admin. Creates the user if needed.
 *
 *   npm run user:password -- --email you@example.com --password "a-long-password" --admin --name "Your Name"
 *   npm run user:password -- --email sophie.m@example.com --password "testpass123"
 *
 * --admin  makes the user an admin (role = admin). Admins can't be created any other way.
 * --name   only used when the user doesn't exist yet.
 */
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import * as s from "./schema.js";
import { databaseUrl } from "./url.js";

loadEnvConfig(process.cwd());

function arg(name) {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : undefined;
}
const email = String(arg("email") ?? "")
    .trim()
    .toLowerCase();
const password = String(arg("password") ?? "");
const makeAdmin = process.argv.includes("--admin");
const name = arg("name");

if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) {
    console.error(
        'Usage: npm run user:password -- --email you@example.com --password "at least 8 chars" [--admin] [--name "Name"]',
    );
    process.exit(1);
}
if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local.");
    process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl() });
const db = drizzle(pool, { schema: s });

async function main() {
    const hash = await hashPassword(password);
    await db.transaction(async (tx) => {
        let [user] = await tx
            .select()
            .from(s.users)
            .where(eq(sql`lower(${s.users.email})`, email))
            .limit(1);
        if (!user) {
            [user] = await tx
                .insert(s.users)
                .values({
                    id: randomUUID(),
                    name: name || email.split("@")[0],
                    email,
                    emailVerified: true,
                    role: makeAdmin ? "admin" : "customer",
                    teamRole: makeAdmin ? "Owner" : null,
                })
                .returning();
            console.log(`Created ${user.role} ${user.email}`);
        } else if (makeAdmin && user.role !== "admin") {
            await tx
                .update(s.users)
                .set({ role: "admin", teamRole: user.teamRole ?? "Operations", updatedAt: new Date() })
                .where(eq(s.users.id, user.id));
            console.log(`${user.email} is now an admin`);
        }
        if (user.blocked) {
            console.warn("Note: this account is blocked, so it still can't log in. Unblock it in Admin › Customers.");
        }

        const [cred] = await tx
            .select()
            .from(s.accounts)
            .where(and(eq(s.accounts.userId, user.id), eq(s.accounts.providerId, "credential")))
            .limit(1);
        if (cred) {
            await tx.update(s.accounts).set({ password: hash, updatedAt: new Date() }).where(eq(s.accounts.id, cred.id));
        } else {
            await tx
                .insert(s.accounts)
                .values({ id: randomUUID(), userId: user.id, accountId: user.id, providerId: "credential", password: hash });
        }
        // Sign the user out everywhere so the new password takes effect.
        await tx.delete(s.sessions).where(eq(s.sessions.userId, user.id));
    });
    console.log(`Password set for ${email}. Log in at /login.`);
}

main()
    .catch((err) => {
        console.error("Failed:", err.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());