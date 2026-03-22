-- =============================================================
-- V3: Seed demo floor plan layout + time-aware reservations
-- Uses NOW() so reservations are always relevant at init time.
-- =============================================================

-- -----------------------------------------------
-- 1. Areas (3 zones on the 20x14 grid)
-- -----------------------------------------------
INSERT INTO restorano.area (id, floor_plan_id, name, color, top_left_col, top_left_row, bottom_right_col, bottom_right_row)
VALUES
  (1, 1, 'Main Hall',    '#3b82f6', 1,  1,  10, 10),
  (2, 1, 'Patio',        '#22c55e', 12, 1,  20,  7),
  (3, 1, 'Private Room', '#a855f7', 12, 9,  20, 14);

SELECT setval('restorano.area_id_seq', 3);

-- -----------------------------------------------
-- 2. Tables (15 tables across the 3 areas)
-- -----------------------------------------------
-- Main Hall (area 1) — 8 tables
INSERT INTO restorano.restaurant_table (id, floor_plan_id, area_id, label, capacity, col, row, width_cells, height_cells, is_fused, parent_fused_id)
VALUES
  (1,  1, 1, 'T1',  2, 2,  2, 1, 1, false, NULL),
  (2,  1, 1, 'T2',  2, 4,  2, 1, 1, false, NULL),
  (3,  1, 1, 'T3',  4, 6,  2, 2, 1, false, NULL),
  (4,  1, 1, 'T4',  4, 2,  5, 2, 1, false, NULL),
  (5,  1, 1, 'T5',  6, 5,  5, 2, 2, false, NULL),
  (6,  1, 1, 'T6',  4, 8,  5, 2, 1, false, NULL),
  (7,  1, 1, 'T7',  8, 2,  8, 3, 2, false, NULL),
  (8,  1, 1, 'T8',  2, 6,  8, 1, 1, false, NULL);

-- Patio (area 2) — 4 tables
INSERT INTO restorano.restaurant_table (id, floor_plan_id, area_id, label, capacity, col, row, width_cells, height_cells, is_fused, parent_fused_id)
VALUES
  (9,  1, 2, 'P1', 2, 13, 2, 1, 1, false, NULL),
  (10, 1, 2, 'P2', 4, 15, 2, 2, 1, false, NULL),
  (11, 1, 2, 'P3', 2, 18, 2, 1, 1, false, NULL),
  (12, 1, 2, 'P4', 6, 14, 5, 2, 2, false, NULL);

-- Private Room (area 3) — 3 tables
INSERT INTO restorano.restaurant_table (id, floor_plan_id, area_id, label, capacity, col, row, width_cells, height_cells, is_fused, parent_fused_id)
VALUES
  (13, 1, 3, 'R1', 4, 13, 10, 2, 1, false, NULL),
  (14, 1, 3, 'R2', 8, 16, 10, 2, 2, false, NULL),
  (15, 1, 3, 'R3', 6, 13, 13, 2, 1, false, NULL);

SELECT setval('restorano.restaurant_table_id_seq', 15);

-- -----------------------------------------------
-- 3. Reservations (relative to NOW())
--    Mix of past, ongoing, and upcoming bookings
--    so the floor plan always shows realistic activity.
-- -----------------------------------------------

-- Ongoing: started 1h ago, ends in 1.5h
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (1, 'Emma Wilson', 2, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '1.5 hours', 'Window seat preferred');
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (1, 1);

-- Ongoing: started 30min ago, ends in 2h
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (2, 'James Chen', 4, NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '2 hours', 'Birthday dinner');
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (2, 5);

-- Ongoing: started 45min ago on patio
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (3, 'Sofia Martinez', 3, NOW() - INTERVAL '45 minutes', NOW() + INTERVAL '1 hour 45 minutes', NULL);
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (3, 10);

-- Upcoming: starts in 1h
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (4, 'Liam Johnson', 6, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3.5 hours', 'Business meeting');
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (4, 7);

-- Upcoming: starts in 2h
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (5, 'Olivia Brown', 2, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4.5 hours', NULL);
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (5, 9);

-- Upcoming: starts in 2h in private room
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (6, 'Noah Davis', 8, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4.5 hours', 'Anniversary party');
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (6, 14);

-- Upcoming: starts in 3h (multi-table booking)
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (7, 'Ava Garcia', 5, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '5.5 hours', 'Team lunch');
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (7, 3);
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (7, 6);

-- Past: ended 2h ago (shows in history, not on floor plan)
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (8, 'Mia Thompson', 4, NOW() - INTERVAL '4.5 hours', NOW() - INTERVAL '2 hours', 'Early brunch');
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (8, 4);

-- Upcoming: tomorrow afternoon (visible when filtering by date)
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (9, 'Ethan Lee', 6, NOW() + INTERVAL '1 day' + INTERVAL '2 hours', NOW() + INTERVAL '1 day' + INTERVAL '4.5 hours', 'Family dinner');
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (9, 15);

-- Upcoming: tomorrow evening in private room
INSERT INTO restorano.reservation (id, guest_name, party_size, starts_at, ends_at, notes)
VALUES (10, 'Isabella White', 4, NOW() + INTERVAL '1 day' + INTERVAL '5 hours', NOW() + INTERVAL '1 day' + INTERVAL '7.5 hours', NULL);
INSERT INTO restorano.reservation_tables (reservation_id, table_id) VALUES (10, 13);

SELECT setval('restorano.reservation_id_seq', 10);
