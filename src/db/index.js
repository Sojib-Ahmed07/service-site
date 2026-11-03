import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
/**
 * Usage in a Server Component or Server Action:
 *   import { db } from "@/db";
 *   const rows = await db.select().from(schema.categories);
 */
export const db = drizzle(neon(process.env.DATABASE_URL ?? "postgresql://placeholder"), { schema });
export { schema };
