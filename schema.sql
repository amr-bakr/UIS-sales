-- ============================================================
-- شغّل الكود ده كامل مرة واحدة في Supabase: SQL Editor → New query → Run
-- ============================================================

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client text,
  phone text,
  sales text,
  activity text,
  branches text,
  users_count text,
  warehouse text,
  warehouse_count text,
  contact text,
  visit_date text,
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
  status text not null default 'بانتظار المراجعة'
);

-- تفعيل الحماية على مستوى الصفوف
alter table entries enable row level security;

-- أي حد (حتى من غير تسجيل دخول) يقدر يضيف نموذج جديد بس مش يشوف الموجود
drop policy if exists "public can insert" on entries;
create policy "public can insert"
  on entries for insert
  to anon
  with check (true);

-- بس اللي عامل تسجيل دخول (أنت) يقدر يشوف النماذج
drop policy if exists "authenticated can select" on entries;
create policy "authenticated can select"
  on entries for select
  to authenticated
  using (true);

-- بس اللي عامل تسجيل دخول (أنت) يقدر يعدّل الحالة
drop policy if exists "authenticated can update" on entries;
create policy "authenticated can update"
  on entries for update
  to authenticated
  using (true)
  with check (true);
