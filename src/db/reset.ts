import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { db } from "./index";
import { sql } from "drizzle-orm";

export async function resetDatabase() {
  console.log("🧨 Resetting database schema (dropping public schema)...");
  try {
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE;`);
    await db.execute(sql`CREATE SCHEMA public;`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);
    console.log("✅ Public schema freshly recreated!");
  } catch (err) {
    console.error("❌ Failed to reset database:", err);
    throw err;
  }
}

if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log("🚀 Database reset complete. Ready for 'npm run db:push'.");
      process.exit(0);
    })
    .catch(() => process.exit(1));
}
