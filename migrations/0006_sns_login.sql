-- Adds SNS login support (Kakao/Naver/Google) alongside existing email+password signup.
--
-- email and password_hash must become nullable: SNS users don't set a password, and
-- Kakao in particular may not provide an email at all (email is an optional consent item).
-- SQLite can't ALTER a column's NOT NULL constraint in place, so we rebuild the table.
--
-- Login identity for SNS users is (auth_provider, provider_user_id), NOT email.
-- auth_provider: 'local' (existing email+password accounts) | 'kakao' | 'naver' | 'google'.

PRAGMA foreign_keys=OFF;

CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  password_hash TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'user',
  brand_id INTEGER,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  provider_user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users_new (id, email, password_hash, name, phone, is_admin, role, brand_id, auth_provider, provider_user_id, created_at)
SELECT id, email, password_hash, name, phone, is_admin, role, brand_id, 'local', NULL, created_at FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Unique only among non-null emails (local accounts still can't share an email;
-- multiple SNS users with no email, or a user with an email but a different provider
-- than an existing row, are both fine).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_identity ON users(auth_provider, provider_user_id) WHERE provider_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_brand_id ON users(brand_id);

PRAGMA foreign_keys=ON;
