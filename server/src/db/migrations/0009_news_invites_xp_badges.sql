-- News (CMS)
CREATE TABLE "news" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(160) NOT NULL UNIQUE,
  "title" varchar(240) NOT NULL,
  "excerpt" text NOT NULL DEFAULT '',
  "body" text NOT NULL DEFAULT '',
  "tag" varchar(40) NOT NULL DEFAULT 'Клуб',
  "cover_url" text,
  "meta_title" varchar(240) NOT NULL DEFAULT '',
  "meta_description" text NOT NULL DEFAULT '',
  "og_image" text,
  "status" varchar(16) NOT NULL DEFAULT 'draft',
  "published_at" timestamptz,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "news_status_published_idx" ON "news" ("status", "published_at" DESC);

-- Referrals: каждому юзеру свой реф-код (lowercase nick по умолчанию), плюс лог приглашённых.
CREATE TABLE "referral_codes" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "code" varchar(40) NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "referrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "referrer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "invited_user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "code" varchar(40) NOT NULL,
  -- 'joined' (зарегистрировался) | 'active' (подтвердил email или совершил действие)
  "status" varchar(16) NOT NULL DEFAULT 'joined',
  "tickets_rewarded" integer NOT NULL DEFAULT 0,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  "activated_at" timestamptz
);
CREATE INDEX "referrals_referrer_idx" ON "referrals" ("referrer_id");

-- XP events (append-only). Ранг считается из SUM(amount).
CREATE TABLE "xp_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" integer NOT NULL,
  "source" varchar(40) NOT NULL,
  "reason" text NOT NULL,
  "ref_type" varchar(40),
  "ref_id" uuid,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "xp_user_idx" ON "xp_events" ("user_id");
CREATE INDEX "xp_user_created_idx" ON "xp_events" ("user_id", "created_at" DESC);
CREATE INDEX "xp_ref_idx" ON "xp_events" ("ref_type", "ref_id");

-- Badges catalog + ownership
CREATE TABLE "badges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(64) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "rarity" varchar(16) NOT NULL DEFAULT 'common',
  "category" varchar(24) NOT NULL DEFAULT 'club',
  "issue" varchar(16),
  "minted_of" integer,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "user_badges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "badge_id" uuid NOT NULL REFERENCES "badges"("id") ON DELETE CASCADE,
  "pinned" boolean NOT NULL DEFAULT false,
  "awarded_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "badge_id")
);
CREATE INDEX "user_badges_user_idx" ON "user_badges" ("user_id");
