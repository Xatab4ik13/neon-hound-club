-- Лента клуба: посты блогеров, опросы, лайки, комменты.
-- Роль 'blogger' хранится в users.role (varchar, без enum). Назначает админ.

CREATE TABLE IF NOT EXISTS posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        text NOT NULL DEFAULT '',
  image_url   text,
  pinned      boolean NOT NULL DEFAULT false,
  -- {question, anonymous, multi, closed, options:[{id,text}]}
  poll        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX IF NOT EXISTS posts_feed_idx       ON posts (deleted_at, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_idx     ON posts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_likes_user_idx ON post_likes (user_id);

CREATE TABLE IF NOT EXISTS post_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       text NOT NULL,
  likes      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON post_comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS post_poll_votes (
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id  varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, option_id)
);
CREATE INDEX IF NOT EXISTS post_poll_votes_post_idx ON post_poll_votes (post_id);
