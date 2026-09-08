-- Adds manual display ordering for showrooms on the mixed public feed.
-- Initial values preserve the existing registration-order (id ASC) behavior;
-- gaps of 10 leave room for future re-ordering without renumbering everything.
ALTER TABLE showrooms ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
UPDATE showrooms SET display_order = id * 10;
CREATE INDEX IF NOT EXISTS idx_showrooms_display_order ON showrooms(display_order);
