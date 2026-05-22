import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as users from "./schema/users.js";
import * as emailVerification from "./schema/email-verification.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const schema = { ...users, ...emailVerification };

export const sql = postgres(url, { max: 10 });
export const db = drizzle(sql, { schema });
export type DB = typeof db;
