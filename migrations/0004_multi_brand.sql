-- Multi-brand (all4run) platform support
-- Adds brands table + brand scoping to users and showrooms.

-- Brands (tenants)
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed the first brand: BROOKS
INSERT OR IGNORE INTO brands (id, slug, name, description) VALUES
  (1, 'brooks', 'BROOKS', 'BROOKS 쇼룸 예약');

-- Users: role + optional brand scoping
-- role: 'user' (default, regular member) | 'brand_admin' (scoped to brand_id) | 'super_admin' (platform-wide)
-- (No REFERENCES clause here: SQLite's ALTER TABLE ADD COLUMN rejects a
-- REFERENCES + DEFAULT combination. FK relationship is enforced at the app level.)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN brand_id INTEGER;

-- Migrate existing is_admin=1 users to super_admin role for backward compatibility
UPDATE users SET role = 'super_admin' WHERE is_admin = 1;

CREATE INDEX IF NOT EXISTS idx_users_brand_id ON users(brand_id);

-- Showrooms: which brand owns this showroom/post
ALTER TABLE showrooms ADD COLUMN brand_id INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_showrooms_brand_id ON showrooms(brand_id);
