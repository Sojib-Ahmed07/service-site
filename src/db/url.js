// src/db/url.js
/**
 * Normalises the Postgres connection string before handing it to `pg`.
 *
 * Neon gives URLs with `sslmode=require`. Current `pg` already treats that as
 * `verify-full` (full certificate check) but prints a SECURITY WARNING on every
 * start. Writing `verify-full` explicitly keeps the same secure behaviour and
 * removes the warning. Local URLs without sslmode are left untouched.
 *
 * Plain JS with no Next.js imports, so drizzle.config.js and seed.js can use it too.
 */
export function databaseUrl(raw = process.env.DATABASE_URL) {
    if (!raw) return raw;
    try {
        const url = new URL(raw);
        const mode = url.searchParams.get("sslmode");
        if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
            url.searchParams.set("sslmode", "verify-full");
        }
        // `pg` does not understand Neon's channel_binding option; Neon works without it.
        url.searchParams.delete("channel_binding");
        return url.toString();
    } catch {
        return raw; // not a URL we can parse; let pg report the problem
    }
}