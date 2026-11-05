// src/server/errors.js
/** Logs a server error with a plain-English hint for the usual setup mistakes. */
import "server-only";

export function logError(tag, err) {
    const code = err?.cause?.code ?? err?.code;
    let hint = "";
    if (code === "42P01") hint = "A database table is missing. Run `npm run db:push` and restart `npm run dev`.";
    else if (code === "42703") hint = "A database column is missing. Run `npm run db:push` and restart `npm run dev`.";
    else if (code === "ECONNREFUSED" || code === "ENOTFOUND") hint = "Can't reach the database. Check DATABASE_URL in .env.local.";
    console.error(`[${tag}]`, err);
    if (hint) console.error(`[${tag}] HINT: ${hint}`);
}