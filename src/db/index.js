// src/db/index.js
/**
 * Database client (server only). Uses node-postgres over TCP, which works with
 * Neon's pooled connection string and with any local Postgres.
 *
 * Usage in a Server Component, Server Action or route handler:
 *   import { db, schema } from "@/db";
 *   const rows = await db.select().from(schema.categories);
 */
import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

if (!process.env.DATABASE_URL) {
    console.error("[db] DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.");
}

function createPool() {
    const pool = new Pool({
        connectionString: databaseUrl(),
        max: 5,
        idleTimeoutMillis: 20_000,
        connectionTimeoutMillis: 10_000,
    });
    // Neon closes idle connections when the compute sleeps. Without this listener
    // that would throw an unhandled "error" event and crash the server.
    pool.on("error", (err) => console.error("[db] idle client error:", err.message));
    return pool;
}

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis;
const pool = globalForDb.__sortedPgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.__sortedPgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };