-- ============================================================
-- شغّل الكود ده كامل مرة واحدة في Supabase: SQL Editor → New query → Run
-- ============================================================

-- ---------- الجداول ----------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'sales' check (role in ('admin','sales','support'))
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  country text,
  activity text,
  branches text,
  users_count text,
  warehouse text,
  warehouse_count text,
  contact text,
  sales_id uuid references profiles(id),
  stage text not null default 'discovery'
    check (stage in ('discovery','demo_scheduled','demo_done','proposal','negotiation','won','lost')),
  has_system text,
  sys_name text,
  sys_age text,
  sys_type text,
  problems jsonb default '[]'::jsonb,
  needs text,
  modules jsonb default '[]'::jsonb,
  attendees text,
  decision text,
  finance text,
  ops text,
  demo_date text,
  demo_time text,
  demo_place text,
  visit_date text,
  review_status text not null default 'بانتظار المراجعة'
    check (review_status in ('بانتظار المراجعة','تم الاستلام','يحتاج استكمال'))
);

create table if not exists debriefs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  went_well text,
  objections text,
  next_step text
);

-- ---------- إنشاء بروفايل تلقائي لأي مستخدم جديد ----------
-- الدور الافتراضي "sales"، وبعدين إنت (الإدارة) تغيّره يدويًا من Table Editor
-- لأي حساب لازم يبقى "admin" أو "support"

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.email, 'sales');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- دالة مساعدة لمعرفة دور المستخدم الحالي ----------
create or replace function public.current_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- ---------- تفعيل الحماية ----------
alter table profiles enable row level security;
alter table clients enable row level security;
alter table debriefs enable row level security;

-- profiles: أي مستخدم مسجّل دخول يقدر يشوف كل البروفايلات (عشان تظهر أسماء السيلز)
drop policy if exists "read all profiles" on profiles;
create policy "read all profiles" on profiles for select to authenticated using (true);

drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- clients: السيلز يشوف/يعدّل عملاءه بس، الإدارة والتيكنيكال سبورت يشوفوا/يعدّلوا الكل
drop policy if exists "clients insert" on clients;
create policy "clients insert" on clients for insert to authenticated
  with check (sales_id = auth.uid() or public.current_role() in ('admin','support'));

drop policy if exists "clients select" on clients;
create policy "clients select" on clients for select to authenticated
  using (sales_id = auth.uid() or public.current_role() in ('admin','support'));

drop policy if exists "clients update" on clients;
create policy "clients update" on clients for update to authenticated
  using (sales_id = auth.uid() or public.current_role() in ('admin','support'))
  with check (sales_id = auth.uid() or public.current_role() in ('admin','support'));

-- debriefs: أي مستخدم مسجّل دخول يقدر يشوف ويضيف (الجدول أصلاً محمي عن طريق حماية clients)
drop policy if exists "debriefs select" on debriefs;
create policy "debriefs select" on debriefs for select to authenticated using (true);

drop policy if exists "debriefs insert" on debriefs;
create policy "debriefs insert" on debriefs for insert to authenticated with check (true);
