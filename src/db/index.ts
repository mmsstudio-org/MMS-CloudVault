import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as PgPool } from "pg";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://sabbirmms@localhost:5432/mms_studio_storage";

const isNeon = connectionString.includes("neon.tech");

let dbInstance: ReturnType<typeof drizzlePg<typeof schema>>;

if (isNeon) {
  // Production Neon Serverless
  neonConfig.fetchConnectionCache = true;
  const pool = new NeonPool({ connectionString });
  dbInstance = drizzleNeon(pool, { schema }) as unknown as ReturnType<
    typeof drizzlePg<typeof schema>
  >;
} else {
  // Local or Standard PostgreSQL
  const pool = new PgPool({ connectionString });
  dbInstance = drizzlePg(pool, { schema });
}

export const db = dbInstance;
export { schema };
