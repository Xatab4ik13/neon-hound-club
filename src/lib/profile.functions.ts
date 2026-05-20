// Server functions для профиля. Тонкие обёртки: вся логика БД через Drizzle.
// Файл должен содержать ТОЛЬКО createServerFn-декларации и их импорты —
// иначе Vite splitter не сможет отделить server-only код.
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { db } from "@/server/db.server";
import { profiles } from "@/server/schema";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows = await db()
      .select()
      .from(profiles)
      .where(eq(profiles.id, context.userId))
      .limit(1);
    return rows[0] ?? null;
  });

const updateSchema = z.object({
  nick: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
  phone: z.string().max(32).nullable().optional(),
  city: z.string().max(64).nullable().optional(),
  bio: z.string().max(280).nullable().optional(),
  avatarUrl: z.string().url().max(512).nullable().optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.nick !== undefined) patch.nick = data.nick;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.city !== undefined) patch.city = data.city;
    if (data.bio !== undefined) patch.bio = data.bio;
    if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;

    if (Object.keys(patch).length === 0) {
      const rows = await db()
        .select()
        .from(profiles)
        .where(eq(profiles.id, context.userId))
        .limit(1);
      return rows[0] ?? null;
    }

    const rows = await db()
      .update(profiles)
      .set(patch)
      .where(eq(profiles.id, context.userId))
      .returning();
    return rows[0] ?? null;
  });
