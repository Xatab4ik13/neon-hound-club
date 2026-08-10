-- HellSpin: ежедневная рулетка клуба.
-- Доступ только из PWA + подтверждённый телефон + включённые push.
-- Спины в сутки: без Pass 1, Silver 2, Gold 4, Platinum 7 (use-or-lose, сброс 00:00 МСК).

CREATE TABLE IF NOT EXISTS spin_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key varchar(7) NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  days_total integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS spin_seasons_period_uniq ON spin_seasons (period_key);

CREATE TABLE IF NOT EXISTS spin_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES spin_seasons(id) ON DELETE CASCADE,
  code varchar(32) NOT NULL,
  title varchar(120) NOT NULL,
  rarity varchar(16) NOT NULL,
  reward_kind varchar(16) NOT NULL,
  reward_value integer NOT NULL DEFAULT 0,
  base_chance_ppm integer NOT NULL DEFAULT 0,
  limit_total integer,
  issued integer NOT NULL DEFAULT 0,
  queue_order integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS spin_prizes_season_code_uniq ON spin_prizes (season_id, code);
CREATE INDEX IF NOT EXISTS spin_prizes_season_idx ON spin_prizes (season_id);

CREATE TABLE IF NOT EXISTS spin_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES spin_seasons(id) ON DELETE CASCADE,
  prize_id uuid REFERENCES spin_prizes(id) ON DELETE SET NULL,
  prize_code varchar(32) NOT NULL,
  rarity varchar(16) NOT NULL,
  spin_date date NOT NULL,
  tier varchar(16) NOT NULL DEFAULT 'none',
  bonus boolean NOT NULL DEFAULT false,
  rolled_chance_ppm integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spin_spins_user_idx ON spin_spins (user_id, created_at);
CREATE INDEX IF NOT EXISTS spin_spins_season_idx ON spin_spins (season_id);
CREATE INDEX IF NOT EXISTS spin_spins_user_day_idx ON spin_spins (user_id, spin_date);

CREATE TABLE IF NOT EXISTS spin_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spin_date date NOT NULL,
  allowed integer NOT NULL DEFAULT 1,
  bonus integer NOT NULL DEFAULT 0,
  used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS spin_daily_user_date_uniq ON spin_daily (user_id, spin_date);

CREATE TABLE IF NOT EXISTS spin_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES spin_seasons(id) ON DELETE CASCADE,
  days_count integer NOT NULL DEFAULT 0,
  last_spin_date date,
  claimed_10_at timestamptz,
  claimed_20_at timestamptz,
  claimed_30_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS spin_streaks_user_season_uniq ON spin_streaks (user_id, season_id);

CREATE TABLE IF NOT EXISTS spin_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES spin_seasons(id) ON DELETE CASCADE,
  spin_id uuid REFERENCES spin_spins(id) ON DELETE SET NULL,
  source varchar(16) NOT NULL DEFAULT 'spin',
  prize_code varchar(32) NOT NULL,
  prize_title varchar(120) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  track_number varchar(64),
  admin_note varchar(400),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spin_winners_season_idx ON spin_winners (season_id, created_at);
CREATE INDEX IF NOT EXISTS spin_winners_user_idx ON spin_winners (user_id);
CREATE INDEX IF NOT EXISTS spin_winners_status_idx ON spin_winners (status);
