// Drizzle connection. ВАЖНО: .server.ts → import-protection блокирует попадание в клиентский бандл.
// Все запросы к БД должны идти через эту обёртку. При переезде на VPS меняется только
// строка подключения (SUPABASE_DB_URL → DATABASE_URL).
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function db() {
  if (_db) return _db;
  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("SUPABASE_DB_URL (или DATABASE_URL) не задан");
  const client = postgres(url, { prepare: false, max: 1 });
  _db = drizzle(client, { schema });
  return _db;
}
