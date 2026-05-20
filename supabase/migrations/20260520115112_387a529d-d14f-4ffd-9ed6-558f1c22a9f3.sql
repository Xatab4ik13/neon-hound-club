-- ============================================================
-- HELLHOUND Club — Profiles
-- ============================================================

-- Profiles table linked 1:1 to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nick TEXT NOT NULL UNIQUE,
  phone TEXT,
  city TEXT,
  avatar_url TEXT,
  bio TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nick_format CHECK (nick ~ '^[a-zA-Z0-9_]{3,32}$'),
  CONSTRAINT referral_code_format CHECK (referral_code ~ '^[a-zA-Z0-9_]{3,32}$')
);

CREATE INDEX profiles_nick_idx ON public.profiles (lower(nick));
CREATE INDEX profiles_referral_code_idx ON public.profiles (lower(referral_code));

-- Touch updated_at on every update
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
-- Default nick = sanitized local part of email + 4 random chars to avoid collisions.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_nick TEXT;
  candidate TEXT;
  attempts INT := 0;
BEGIN
  -- Build a starting nick from email local-part, keep only [a-zA-Z0-9_], trim to 24 chars
  base_nick := regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  base_nick := substring(base_nick FROM 1 FOR 24);
  IF base_nick IS NULL OR length(base_nick) < 3 THEN
    base_nick := 'rider';
  END IF;

  -- Try base_nick, then base_nick + 4 random hex chars until unique
  candidate := base_nick;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(nick) = lower(candidate)) LOOP
    candidate := base_nick || '_' || substring(md5(random()::text), 1, 4);
    attempts := attempts + 1;
    EXIT WHEN attempts > 8;
  END LOOP;

  INSERT INTO public.profiles (id, nick, referral_code)
  VALUES (NEW.id, candidate, candidate);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read any profile (for public profile pages /club/u/<nick>)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Owner-only update
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No client-side INSERT/DELETE (handled by trigger / cascade)