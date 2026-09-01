-- Add per-slot capacity (인원수 제한) support

-- 1) capacity column on time_slots (default 1 keeps existing behavior for old rows)
ALTER TABLE time_slots ADD COLUMN capacity INTEGER NOT NULL DEFAULT 1;

-- 2) Remove the old "one reservation per slot" unique index — capacity can now be > 1
DROP INDEX IF EXISTS idx_unique_active_reservation;

-- 3) Prevent the same user from booking the same slot twice while confirmed
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_slot_reservation
  ON reservations(user_id, time_slot_id)
  WHERE status = 'confirmed';
