ALTER TABLE orders ADD COLUMN IF NOT EXISTS spin_winner_id uuid REFERENCES spin_winners(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_spin_winner_idx ON orders (spin_winner_id);
