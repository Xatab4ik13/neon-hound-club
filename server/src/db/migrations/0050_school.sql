-- Школа HELLHOUND: инструкторы, чаты, счета, недельные выплаты.
-- Ученик видит student_amount = instructor_amount * 1.2 (наценка 20% скрыта).
-- Hell Pass discount на школу НЕ распространяется — цена всегда как есть.

CREATE TABLE IF NOT EXISTS "school_instructors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "slug" varchar(64) NOT NULL,
  "display_name" varchar(120) NOT NULL,
  "bio" text NOT NULL DEFAULT '',
  "city" varchar(120) NOT NULL DEFAULT '',
  "moto" varchar(200) NOT NULL DEFAULT '',
  "avatar_url" text,
  -- базовая почасовая ставка (что инструктор получает; ученик видит +20%).
  "hourly_rate_rub" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "school_instr_user_uq" ON "school_instructors" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "school_instr_slug_uq" ON "school_instructors" ("slug");

CREATE TABLE IF NOT EXISTS "school_chats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" uuid NOT NULL REFERENCES "school_instructors"("id") ON DELETE CASCADE,
  "student_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "last_message_at" timestamptz NOT NULL DEFAULT now(),
  "last_message_preview" varchar(200) NOT NULL DEFAULT '',
  "last_message_role" varchar(16) NOT NULL DEFAULT 'student',
  "student_unread" integer NOT NULL DEFAULT 0,
  "instructor_unread" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "sc_pair_uq" ON "school_chats" ("instructor_id", "student_id");
CREATE INDEX IF NOT EXISTS "sc_instr_last_idx" ON "school_chats" ("instructor_id", "last_message_at" DESC);
CREATE INDEX IF NOT EXISTS "sc_student_last_idx" ON "school_chats" ("student_id", "last_message_at" DESC);

CREATE TABLE IF NOT EXISTS "school_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "chat_id" uuid NOT NULL REFERENCES "school_chats"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  -- 'student' | 'instructor' | 'system'
  "sender_role" varchar(16) NOT NULL,
  "text" text,
  "image_url" text,
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "sm_chat_created_idx" ON "school_messages" ("chat_id", "created_at");

-- Счёт от инструктора ученику.
-- instructor_amount_rub — что видит и получит инструктор (до налога/комиссии).
-- student_amount_rub   — сумма, которую платит ученик (instructor_amount * 1.2).
-- Hell Pass discount не применяется.
CREATE TABLE IF NOT EXISTS "school_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "chat_id" uuid NOT NULL REFERENCES "school_chats"("id") ON DELETE CASCADE,
  "instructor_id" uuid NOT NULL REFERENCES "school_instructors"("id") ON DELETE CASCADE,
  "student_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "instructor_amount_rub" integer NOT NULL,
  "student_amount_rub" integer NOT NULL,
  "commission_rub" integer NOT NULL,
  -- 'draft' | 'invoiced' | 'paid' | 'cancelled' | 'refunded'
  "status" varchar(24) NOT NULL DEFAULT 'invoiced',
  "payment_id" uuid REFERENCES "payments"("id") ON DELETE SET NULL,
  "scheduled_at" timestamptz,
  "paid_at" timestamptz,
  "cancelled_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "so_chat_idx" ON "school_orders" ("chat_id");
CREATE INDEX IF NOT EXISTS "so_instr_idx" ON "school_orders" ("instructor_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "so_student_idx" ON "school_orders" ("student_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "so_status_idx" ON "school_orders" ("status");

-- Недельная пачка выплат инструктору.
-- gross_rub    = сумма instructor_amount_rub по paid-заказам за период
-- tax_rub      = налог с урока (считаем на общую выручку с ученика по правилам admin-settings)
-- commission_rub = наша маржа 20% (сумма commission_rub из school_orders)
-- payout_rub   = что переводим инструктору (обычно = gross_rub, налоги/комиссия — уже минус)
CREATE TABLE IF NOT EXISTS "school_payouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" uuid NOT NULL REFERENCES "school_instructors"("id") ON DELETE CASCADE,
  "period_start" timestamptz NOT NULL,
  "period_end" timestamptz NOT NULL,
  "gross_rub" integer NOT NULL DEFAULT 0,
  "tax_rub" integer NOT NULL DEFAULT 0,
  "commission_rub" integer NOT NULL DEFAULT 0,
  "payout_rub" integer NOT NULL DEFAULT 0,
  -- 'pending' | 'paid'
  "status" varchar(24) NOT NULL DEFAULT 'pending',
  "paid_at" timestamptz,
  "note" text NOT NULL DEFAULT '',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "sp_instr_period_idx" ON "school_payouts" ("instructor_id", "period_start" DESC);
CREATE INDEX IF NOT EXISTS "sp_status_idx" ON "school_payouts" ("status");
