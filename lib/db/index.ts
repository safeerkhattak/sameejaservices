import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL;
  return Boolean(url && !url.includes("[YOUR-PASSWORD]") && !url.includes("your-project"));
}

export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!isDatabaseConfigured() || !url) throw new Error("The Supabase database is not configured.");

  if (!client) {
    client = postgres(url, {
      max: 2,
      prepare: false,
      ssl: "require",
      idle_timeout: 20,
      connect_timeout: 15,
    });
    database = drizzle(client, { schema });
  }

  return database!;
}
