-- Bootstrap главного админа Hell. Идемпотентно: если email уже есть — апгрейдим
-- роль до admin, помечаем email подтверждённым и обновляем хеш пароля.
-- Email: ez4boost@gmail.com, пароль: Ez360811632 (bcrypt cost 12).
-- Профиль создаётся лениво при первом GET /profile/me, тут не трогаем.

INSERT INTO users (email, password_hash, nick, role, email_verified, email_verified_at)
VALUES (
  'ez4boost@gmail.com',
  '$2b$12$M.561DK05VKhKWFijsIaiOg0OKlhHosUczGsHCdASW8urdCyIG1p2',
  'hell',
  'admin',
  true,
  now()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash     = EXCLUDED.password_hash,
  role              = 'admin',
  email_verified    = true,
  email_verified_at = COALESCE(users.email_verified_at, now()),
  blocked           = false,
  updated_at        = now();
