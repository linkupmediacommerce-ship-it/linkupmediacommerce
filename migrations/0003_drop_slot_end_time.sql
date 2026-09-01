-- Remove end_time from time_slots — admin no longer needs to set it,
-- and it was never shown to end users in a meaningful way.
ALTER TABLE time_slots DROP COLUMN end_time;
