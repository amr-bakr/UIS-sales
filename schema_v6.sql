-- ============================================================
-- Phase 5 — نشاط الفريق (زيارات، مكالمات، متابعات)
-- شغّله في SQL Editor بعد باقي ملفات schema
-- إضافة فقط، آمن على البيانات الموجودة
-- ============================================================

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  sales_id uuid references profiles(id),
  activity_type text not null default 'زيارة' check (activity_type in ('زيارة','مكالمة','متابعة')),
  notes text,
  activity_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table activities enable row level security;

drop policy if exists "activities select" on activities;
create policy "activities select" on activities for select to authenticated
  using (sales_id = auth.uid() or public.current_role() in ('admin','support'));

drop policy if exists "activities insert" on activities;
create policy "activities insert" on activities for insert to authenticated
  with check (sales_id = auth.uid() or public.current_role() in ('admin','support'));
