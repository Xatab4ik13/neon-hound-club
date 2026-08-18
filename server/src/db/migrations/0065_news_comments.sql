-- Комментарии под новостными постами (лента NEWS в /club).
CREATE TABLE IF NOT EXISTS news_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES news_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES news_post_comments(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS news_post_comments_post_idx
  ON news_post_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS news_post_comments_parent_idx
  ON news_post_comments (post_id, parent_id, created_at);

CREATE TABLE IF NOT EXISTS news_comment_likes (
  comment_id uuid NOT NULL REFERENCES news_post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS news_comment_likes_comment_idx
  ON news_comment_likes (comment_id);
