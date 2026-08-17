-- ============================================================
-- Restaurant Owner role support
-- Extends existing tables + adds new tables for the full
-- restaurant-owner feature set.
-- ============================================================

-- 1. Extend restaurants table with owner link and profile fields
alter table public.restaurants add column if not exists owner_id uuid references public.users(id);
alter table public.restaurants add column if not exists address text;
alter table public.restaurants add column if not exists hours jsonb default '{"open":"09:00","close":"22:00","days":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]}'::jsonb;
alter table public.restaurants add column if not exists contact_phone text;
alter table public.restaurants add column if not exists contact_email text;
alter table public.restaurants add column if not exists description text;
alter table public.restaurants add column if not exists is_open boolean default true;
alter table public.restaurants add column if not exists banner_url text;

-- 2. Extend menu_items with availability toggle and sort order
alter table public.menu_items add column if not exists available boolean default true;
alter table public.menu_items add column if not exists sort_order int default 0;

-- 3. Extend orders with restaurant_id FK (for proper filtering)
--    Keep restaurant_name for display; add restaurant_id for joins.
alter table public.orders add column if not exists restaurant_id uuid references public.restaurants(id);

-- 4. Restaurant-specific food categories
create table if not exists public.food_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.food_categories disable row level security;
grant all on table public.food_categories to anon, authenticated, service_role;

-- 5. Restaurant-specific offers / discounts
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null,
  description text,
  discount_type text not null default 'percentage',  -- 'percentage' or 'flat'
  discount_value numeric(8,2) not null,
  min_order numeric(8,2) default 0,
  max_discount numeric(8,2),
  code text,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.offers disable row level security;
grant all on table public.offers to anon, authenticated, service_role;

-- 6. In-app notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',     -- 'info', 'order', 'review', 'offer'
  link text,
  read boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications disable row level security;
grant all on table public.notifications to anon, authenticated, service_role;

-- 7. Restaurant owner replies to reviews
create table if not exists public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  owner_id uuid not null references public.users(id),
  content text not null,
  created_at timestamptz default now()
);
alter table public.review_replies disable row level security;
grant all on table public.review_replies to anon, authenticated, service_role;

-- 8. Backfill restaurant_id on existing orders by matching restaurant_name
--    Pizza Palace -> first restaurant, Burger Barn -> second, Spice Route -> third
update public.orders o
set restaurant_id = r.id
from public.restaurants r
where o.restaurant_name = r.name
  and o.restaurant_id is null;

-- 9. Seed demo restaurant owner user
--    Uses a deterministic UUID so the profile row matches the auth user.
insert into public.users (id, email, name, role, password_md5, phone, created_at)
values (
  '00000000-0000-4000-8000-000000000004',
  'owner@cravekart.app',
  'Riya Patel',
  'restaurant_owner',
  md5('owner123'),
  '+91-9876543210',
  now()
)
on conflict (id) do update set role = 'restaurant_owner', name = 'Riya Patel';

-- 10. Link owner to Pizza Palace
update public.restaurants
set owner_id = '00000000-0000-4000-8000-000000000004'
where name = 'Pizza Palace';

-- 11. Add address/description to Pizza Palace
update public.restaurants
set address = '42 MG Road, Sector 5, Pune 411001',
    description = 'Authentic Italian pizzas baked in a traditional wood-fired oven. Family-owned since 2018.',
    contact_phone = '+91-9876543210',
    contact_email = 'owner@cravekart.app'
where name = 'Pizza Palace';

-- 12. Seed food categories for Pizza Palace
insert into public.food_categories (restaurant_id, name, sort_order)
select r.id, 'Pizzas', 1 from public.restaurants r where r.name = 'Pizza Palace'
on conflict do nothing;
insert into public.food_categories (restaurant_id, name, sort_order)
select r.id, 'Sides', 2 from public.restaurants r where r.name = 'Pizza Palace'
on conflict do nothing;
insert into public.food_categories (restaurant_id, name, sort_order)
select r.id, 'Beverages', 3 from public.restaurants r where r.name = 'Pizza Palace'
on conflict do nothing;
insert into public.food_categories (restaurant_id, name, sort_order)
select r.id, 'Desserts', 4 from public.restaurants r where r.name = 'Pizza Palace'
on conflict do nothing;

-- 13. Seed a demo offer for Pizza Palace
insert into public.offers (restaurant_id, title, description, discount_type, discount_value, min_order, code, starts_at, expires_at, is_active)
select r.id, 'Pizza Festival', 'Flat ₹50 off on orders above ₹200', 'flat', 50, 200, 'PIZZA50', now(), now() + interval '30 days', true
from public.restaurants r where r.name = 'Pizza Palace'
on conflict do nothing;

-- 14. Link all Pizza Palace menu_items to food_categories
update public.menu_items
set category = 'Pizzas'
where category is null
  and restaurant_id in (select id from public.restaurants where name = 'Pizza Palace')
  and lower(name) like '%pizza%';

update public.menu_items
set category = 'Beverages'
where restaurant_id in (select id from public.restaurants where name = 'Pizza Palace')
  and lower(name) like '%cola%' or lower(name) like '%drink%';

update public.menu_items
set category = 'Sides'
where restaurant_id in (select id from public.restaurants where name = 'Pizza Palace')
  and lower(name) like '%garlic%' or lower(name) like '%bread%';
