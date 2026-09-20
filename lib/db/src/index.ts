import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export const pool = hasDatabase
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : undefined;

export const db = hasDatabase
  ? drizzle(pool!, { schema })
  : new Proxy(
      {},
      {
        get() {
          throw new Error(
            "DATABASE_URL is not set. The API should use its in-memory demo store.",
          );
        },
      },
    ) as ReturnType<typeof drizzle>;

export * from "./schema";
