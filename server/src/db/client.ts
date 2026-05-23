import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as users from "./schema/users.js";
import * as emailVerification from "./schema/email-verification.js";
import * as news from "./schema/news.js";
import * as referrals from "./schema/referrals.js";
import * as xp from "./schema/xp.js";
import * as badges from "./schema/badges.js";
import * as posts from "./schema/posts.js";
import * as economy from "./schema/economy.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const schema = { ...users, ...emailVerification, ...news, ...referrals, ...xp, ...badges, ...posts, ...economy };

export const sql = postgres(url, { max: 10 });
export const db = drizzle(sql, { schema });
export type DB = typeof db;
