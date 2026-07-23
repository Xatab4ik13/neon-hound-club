import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as users from "./schema/users.js";
import * as emailVerification from "./schema/email-verification.js";
import * as referrals from "./schema/referrals.js";
import * as xp from "./schema/xp.js";
import * as badges from "./schema/badges.js";
import * as posts from "./schema/posts.js";
import * as economy from "./schema/economy.js";
import * as hellAi from "./schema/hell-ai.js";
import * as homeBanners from "./schema/home-banners.js";
import * as newsPosts from "./schema/news-posts.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const schema = { ...users, ...emailVerification, ...referrals, ...xp, ...badges, ...posts, ...economy, ...hellAi, ...homeBanners, ...newsPosts };

// Пул увеличен с 10 до 40: при пике 200 одновременных Hell AI запросов каждый
// делает ~4-6 коротких SELECT/INSERT, дефолтных 10 не хватает.
const poolMax = Number(process.env.PG_POOL_MAX ?? 40);
export const sql = postgres(url, { max: poolMax });
export const db = drizzle(sql, { schema });
export type DB = typeof db;
