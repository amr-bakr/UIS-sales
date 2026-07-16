-- ============================================================
-- Phase 2 — شغّله في SQL Editor بعد الـ schema.sql الأساسي
-- إضافة فقط، مش هيلمس أي بيانات موجودة في clients أو profiles أو debriefs
-- ============================================================

create table if not exists implementation_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  engineer_name text,
  activation_date text,
  hardware_notes text,
  installation_checklist jsonb default '[]'::jsonb,
  training_summary text,
  issues jsonb default '[]'::jsonb,
  go_live_status text not null default 'قيد المراجعة'
    check (go_live_status in ('قيد المراجعة','جاهز','غير جاهز')),
  field_engineer_recommendation text,
  signed_by_engineer text,
  signed_by_client text,
  sign_off_date text,
  created_by uuid references profiles(id)
);

alter table implementation_reports enable row level security;

drop policy if exists "impl select" on implementation_reports;
create policy "impl select" on implementation_reports for select to authenticated
  using (
    public.current_role() in ('admin','support')
    or exists (select 1 from clients c where c.id = client_id and c.sales_id = auth.uid())
  );

drop policy if exists "impl insert" on implementation_reports;
create policy "impl insert" on implementation_reports for insert to authenticated
  with check (public.current_role() in ('admin','support'));

drop policy if exists "impl update" on implementation_reports;
create policy "impl update" on implementation_reports for update to authenticated
  using (public.current_role() in ('admin','support'))
  with check (public.current_role() in ('admin','support'));

-- تحديث updated_at تلقائي عند أي تعديل
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_impl_updated_at on implementation_reports;
create trigger trg_impl_updated_at
  before update on implementation_reports
  for each row execute procedure public.set_updated_at();
