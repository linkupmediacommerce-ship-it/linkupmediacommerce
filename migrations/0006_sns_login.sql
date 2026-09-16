-- Adds SNS login support (Kakao/Naver/Google) alongside existing email+password signup.
--
-- NOTE: we intentionally do NOT touch email/password_hash's NOT NULL constraints here.
-- An earlier version of this migration tried to rebuild the "users" table (DROP + RENAME)
-- to make those columns nullable, but that fails on Cloudflare's remote D1 with
-- "FOREIGN KEY constraint failed" — D1 does not honor PRAGMA foreign_keys=OFF /
-- defer_foreign_keys=ON the way local SQLite does, so a referenced table (reservations.user_id
-- -> users.id) can't be dropped even mid-migration. Simple ADD COLUMN (this migration) is safe
-- on both local and remote D1.
--
-- Instead, SNS accounts store application-level placeholder values that satisfy the existing
-- constraints without any real meaning:
--   - email: placeholder like 'kakao_<id>@no-email.all4run.local' when the provider didn't
--     supply (or we can't safely attach) a real email. The app recognizes this pattern and
--     displays it as "-" everywhere (see frontend lib/email.ts).
--   - password_hash: a normal PBKDF2 hash of a random, never-revealed value — so the account
--     satisfies NOT NULL but password login can never succeed for it (there's no real password).
--
-- Login identity for SNS users is (auth_provider, provider_user_id), NOT email.
-- auth_provider: 'local' (existing email+password accounts) | 'kakao' | 'naver' | 'google'.

ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN provider_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_identity
  ON users(auth_provider, provider_user_id) WHERE provider_user_id IS NOT NULL;
