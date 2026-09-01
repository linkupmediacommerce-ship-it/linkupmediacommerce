-- Brooks Showroom Reservation System - Seed Data

-- Admin user (password: admin1234), Test user (password: user1234)
-- password_hash uses legacy 'sha256:<hex>' format for seed simplicity (app also supports PBKDF2 salted hashes for new signups)
INSERT OR IGNORE INTO users (email, password_hash, name, phone, is_admin) VALUES
  ('admin@brooks.com', 'sha256:ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270', '관리자', '010-0000-0000', 1),
  ('user@brooks.com', 'sha256:831c237928e6212bedaa4451a514ace3174562f6761f6a157a2fe5082b36e2fb', '테스트유저', '010-1111-2222', 0);

-- Showrooms (쇼룸 지점)
INSERT OR IGNORE INTO showrooms (id, name, address, description, image_url) VALUES
  (1, '상수점', '서울특별시 마포구 상수동 92-1', '한강이 보이는 프리미엄 쇼룸, 넓은 주차공간 제공', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'),
  (2, '올림픽공원점', '서울특별시 송파구 올림픽로 240', '올림픽공원 인근의 모던한 쇼룸, 대중교통 접근성 우수', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800'),
  (3, '한남점', '서울특별시 용산구 한남대로 42', '플래그십 스토어, VIP 상담 전용 공간 운영', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800');

-- Time slots for the next 7 days (showroom 1, 2, 3) - 10:00 ~ 19:00, 1-hour slots
-- Showroom 1 (상수점)
INSERT OR IGNORE INTO time_slots (showroom_id, slot_date, start_time) VALUES
  (1, date('now'), '10:00'),
  (1, date('now'), '11:00'),
  (1, date('now'), '13:00'),
  (1, date('now'), '14:00'),
  (1, date('now'), '15:00'),
  (1, date('now'), '16:00'),
  (1, date('now', '+1 day'), '10:00'),
  (1, date('now', '+1 day'), '11:00'),
  (1, date('now', '+1 day'), '13:00'),
  (1, date('now', '+1 day'), '14:00'),
  (1, date('now', '+1 day'), '15:00'),
  (1, date('now', '+2 day'), '10:00'),
  (1, date('now', '+2 day'), '11:00'),
  (1, date('now', '+2 day'), '14:00'),
  (1, date('now', '+2 day'), '15:00');

-- Showroom 2 (올림픽공원점)
INSERT OR IGNORE INTO time_slots (showroom_id, slot_date, start_time) VALUES
  (2, date('now'), '10:00'),
  (2, date('now'), '11:00'),
  (2, date('now'), '13:00'),
  (2, date('now'), '15:00'),
  (2, date('now'), '16:00'),
  (2, date('now', '+1 day'), '10:00'),
  (2, date('now', '+1 day'), '13:00'),
  (2, date('now', '+1 day'), '14:00'),
  (2, date('now', '+1 day'), '16:00'),
  (2, date('now', '+2 day'), '11:00'),
  (2, date('now', '+2 day'), '13:00'),
  (2, date('now', '+2 day'), '15:00');

-- Showroom 3 (한남점)
INSERT OR IGNORE INTO time_slots (showroom_id, slot_date, start_time) VALUES
  (3, date('now'), '11:00'),
  (3, date('now'), '14:00'),
  (3, date('now'), '16:00'),
  (3, date('now', '+1 day'), '10:00'),
  (3, date('now', '+1 day'), '11:00'),
  (3, date('now', '+1 day'), '15:00'),
  (3, date('now', '+2 day'), '10:00'),
  (3, date('now', '+2 day'), '13:00'),
  (3, date('now', '+2 day'), '17:00');
