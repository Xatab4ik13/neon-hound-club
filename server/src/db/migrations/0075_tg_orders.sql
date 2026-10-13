-- Заказы со страницы Telegram (tg.hhr.pro): билеты + предзаказ футболок.
CREATE TABLE IF NOT EXISTS tg_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint,
  telegram_username varchar(64),
  telegram_name varchar(128),
  phone varchar(16) NOT NULL,
  recipient_name varchar(128),
  tickets integer NOT NULL DEFAULT 0,
  tickets_rub integer NOT NULL DEFAULT 0,
  shirts jsonb NOT NULL DEFAULT '[]'::jsonb,
  shirts_rub integer NOT NULL DEFAULT 0,
  shipping_rub integer NOT NULL DEFAULT 0,
  cdek_city_code integer,
  cdek_city_name varchar(128),
  cdek_pvz_code varchar(32),
  cdek_pvz_address varchar(300),
  total_rub integer NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  provider_payment_id varchar(64),
  payment_url varchar(500),
  raw_last_notification jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tg_orders_status_idx ON tg_orders (status);
CREATE INDEX IF NOT EXISTS tg_orders_phone_idx ON tg_orders (phone);
CREATE INDEX IF NOT EXISTS tg_orders_provider_payment_idx ON tg_orders (provider_payment_id);
