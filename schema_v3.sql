-- ============================================================
-- Phase 3 — الماليات والتوقعات
-- شغّله في SQL Editor بعد schema.sql و schema_v2.sql
-- إضافة فقط، مش هيمسح ولا يعدّل أي بيانات موجودة
-- ============================================================

alter table clients add column if not exists deal_value numeric default 0;
alter table clients add column if not exists currency text default 'EGP' check (currency in ('EGP','KWD','OMR'));
alter table clients add column if not exists expected_close_date text;

create table if not exists sales_targets (
  id uuid primary key default gen_random_uuid(),
  sales_id uuid references profiles(id) on delete cascade,
  month date not null,
  target_amount numeric not null default 0,
  currency text not null default 'EGP' check (currency in ('EGP','KWD','OMR')),
  created_at timestamptz not null default now(),
  unique (sales_id, month)
);

alter table sales_targets enable row level security;

drop policy if exists "targets select" on sales_targets;
create policy "targets select" on sales_targets for select to authenticated
  using (sales_id = auth.uid() or public.current_role() in ('admin','support'));

drop policy if exists "targets insert admin" on sales_targets;
create policy "targets insert admin" on sales_targets for insert to authenticated
  with check (public.current_role() = 'admin');

drop policy if exists "targets update admin" on sales_targets;
create policy "targets update admin" on sales_targets for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
