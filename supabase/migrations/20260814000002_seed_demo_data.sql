-- ============================================================
-- FoodRush migration 003: seed data
-- Idempotent (on conflict do nothing). Demo auth users are created
-- through the GoTrue Admin API (scripts/seed-demo-users.mjs), never
-- by raw SQL — hand-written auth.users rows break GoTrue login.
-- ============================================================

-- ------------------------------------------------------------
-- DEMO AUTH USERS  (Supabase Auth schema)
-- NOTE: demo users must be created through the GoTrue Admin API, NOT by
-- raw SQL inserts into auth.users — hand-written auth rows break GoTrue
-- login ("Database error querying schema"). Run the seed script instead:
--     node --env-file=.env.local scripts/seed-demo-users.mjs
-- This migration only seeds the matching public profiles below.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- DEMO PROFILES  (public.users)
-- ------------------------------------------------------------
do $$
begin
  insert into public.users (id, email, name, role, password_md5) values
  ('00000000-0000-4000-8000-000000000001', 'admin@cravekart.app', 'Ava Admin', 'admin',    md5('admin123')),
  ('00000000-0000-4000-8000-000000000002', 'priya@cravekart.app', 'Priya Sharma', 'customer', md5('priya123')),
  ('00000000-0000-4000-8000-000000000003', 'alex@cravekart.app', 'Alex Rivera', 'customer', md5('alex123'))
  on conflict (id) do nothing;
  raise notice 'Demo profiles seeded OK';
exception when others then
  raise notice 'Demo profiles NOT seeded: %', sqlerrm;
end $$;

-- ------------------------------------------------------------
-- RESTAURANTS + MENU
-- ------------------------------------------------------------
insert into public.restaurants (id, name, cuisine, rating, eta_min, image_url) values
('00000000-0000-4000-9000-000000000001', 'Pizza Palace',  'Italian',   4.8, '25-35', '🍕'),
('00000000-0000-4000-9000-000000000002', 'Burger Barn',   'American',  4.6, '20-30', '🍔'),
('00000000-0000-4000-9000-000000000003', 'Spice Route',   'Indian',    4.9, '30-40', '🍛')
on conflict (id) do nothing;

insert into public.menu_items (id, restaurant_id, name, description, price, category, image_url) values
('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-9000-000000000001', 'Margherita Pizza',   'Fresh basil, mozzarella, rich tomato sauce.',  189,  'Pizza', '🍕'),
('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-9000-000000000001', 'Pepperoni Feast',    'Double pepperoni with extra cheese.',           329, 'Pizza', '🍕'),
('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-9000-000000000001', 'Garlic Breadsticks', 'Buttery garlic bread with marinara dip.',        129,  'Sides', '🥖'),
('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-9000-000000000001', 'Tiramisu',           'Classic Italian coffee-soaked dessert.',        149,  'Dessert', '🍰'),
('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-9000-000000000002', 'Classic Cheeseburger','Smash patty, cheddar, pickles, secret sauce.',  139,  'Burgers', '🍔'),
('00000000-0000-4000-a000-000000000006', '00000000-0000-4000-9000-000000000002', 'Bacon BBQ Burger',   'Crispy bacon, onion rings, smoky BBQ.',         179, 'Burgers', '🍔'),
('00000000-0000-4000-a000-000000000007', '00000000-0000-4000-9000-000000000002', 'Crispy Fries',       'Golden fries with a chipotle dip.',             89,  'Sides', '🍟'),
('00000000-0000-4000-a000-000000000008', '00000000-0000-4000-9000-000000000002', 'Chocolate Shake',    'Thick and creamy, topped with whipped cream.',  119,  'Drinks', '🥤'),
('00000000-0000-4000-a000-000000000009', '00000000-0000-4000-9000-000000000003', 'Butter Chicken',     'Creamy tomato gravy with tandoori chicken.',    399, 'Curries', '🍛'),
('00000000-0000-4000-a000-000000000010', '00000000-0000-4000-9000-000000000003', 'Paneer Tikka',       'Smoky grilled paneer with mint chutney.',       329,  'Starters', '🧆'),
('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-9000-000000000003', 'Garlic Naan',        'Soft, pillowy naan brushed with garlic butter.', 50,  'Breads', '🫓'),
('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-9000-000000000003', 'Gulab Jamun',        'Warm milk dumplings in rose syrup.',            89,  'Dessert', '🍮')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- COUPONS
-- ------------------------------------------------------------
insert into public.coupons (code, discount, uses, max_uses) values
('FRESH10',   10,  0, 100),
('WELCOME20', 20,  0, 100),
('HACKME99',  99,  0, 5)
on conflict (code) do nothing;

-- ------------------------------------------------------------
-- SAMPLE ORDERS
-- ------------------------------------------------------------
insert into public.orders (id, user_id, restaurant_name, items, total, status, cc_number) values
('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-8000-000000000002', 'Pizza Palace',
 '[{"name":"Margherita Pizza","price":189,"qty":2},{"name":"Garlic Breadsticks","price":129,"qty":1}]',
 507, 'delivered', '4111111111111111'),
('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-8000-000000000002', 'Burger Barn',
 '[{"name":"Bacon BBQ Burger","price":179,"qty":1}]',
 179, 'on_the_way', '5500000000000004'),
('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-8000-000000000003', 'Spice Route',
 '[{"name":"Butter Chicken","price":399,"qty":1},{"name":"Garlic Naan","price":50,"qty":2}]',
 499, 'pending', '4111111111111111')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- SAMPLE REVIEWS  (one already contains stored XSS — A03)
-- ------------------------------------------------------------
insert into public.reviews (product_id, user_id, author, content, rating) values
('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-8000-000000000002', 'Priya', 'Absolutely divine! The cheese pull is unreal. 😍', 5),
('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-8000-000000000003', 'Alex', 'Smash patty, melty cheddar, that sauce — this one never misses.', 5),
('00000000-0000-4000-a000-000000000009', '00000000-0000-4000-8000-000000000002', 'Priya', 'Rich, buttery, perfect with naan.', 5)
on conflict (id) do nothing;
