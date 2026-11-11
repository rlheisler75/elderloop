-- Seating chart "Table layout" view: each dining table is drawn as a square,
-- round, horseshoe, or L-shaped table with seat 1 at the top, clockwise.
alter table public.dining_tables
  add column if not exists shape text not null default 'square'
  check (shape in ('square', 'round', 'horseshoe', 'l_right', 'l_left'));
