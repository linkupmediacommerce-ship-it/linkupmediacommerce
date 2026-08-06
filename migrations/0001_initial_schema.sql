-- Brooks Showroom Reservation System - Initial Schema

-- Users (회원)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Showrooms (쇼룸 지점)
CREATE TABLE IF NOT EXISTS showrooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Time slots (쇼룸별 예약 가능 시간대)
CREATE TABLE IF NOT EXISTS time_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  showroom_id INTEGER NOT NULL,
  slot_date TEXT NOT NULL,   -- 'YYYY-MM-DD'
  start_time TEXT NOT NULL,  -- 'HH:MM'
  end_time TEXT NOT NULL,    -- 'HH:MM'
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (showroom_id) REFERENCES showrooms(id),
  UNIQUE (showroom_id, slot_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_time_slots_showroom_date ON time_slots(showroom_id, slot_date);

-- Reservations (예약)
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  showroom_id INTEGER NOT NULL,
  time_slot_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (showroom_id) REFERENCES showrooms(id),
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_showroom ON reservations(showroom_id);
CREATE INDEX IF NOT EXISTS idx_reservations_time_slot ON reservations(time_slot_id);

-- Prevent double-booking: only one confirmed reservation per time slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_reservation
  ON reservations(time_slot_id)
  WHERE status = 'confirmed';
