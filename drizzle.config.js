// drizzle.config.js
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/db/url.js";

// Load .env.local the same way Next.js does, so `npm run db:push` sees DATABASE_URL.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl() },
});