-- ============================================================
-- تحديث شامل — شغّله في SQL Editor بعد كل ملفات schema السابقة
-- إضافة فقط، آمن على البيانات الموجودة
-- ============================================================

-- ---------- ب. إدارة المستخدمين ----------

alter table profiles add column if not exists email text;

-- تحديث الدالة عشان تسجّل الإيميل مع كل مستخدم جديد
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (new.id, new.email, 'sales', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- الإدارة تقدر تعدّل أي بروفايل (مش بس بروفايلها هي)
drop policy if exists "admin update any profile" on profiles;
create policy "admin update any profile" on profiles for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------- ج. تطوير نموذج السيلز ----------

alter table clients add column if not exists contacts jsonb default '[]'::jsonb;
alter table clients add column if not exists next_follow_up_date text;
alter table clients add column if not exists loss_reason text
  check (loss_reason in ('السعر', 'المنافس', 'التوقيت', 'أخرى'));

-- ---------- د. سجل التدقيق (Audit Log) ----------

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references profiles(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  details jsonb default '{}'::jsonb
);

alter table audit_log enable row level security;

drop policy if exists "audit select admin" on audit_log;
create policy "audit select admin" on audit_log for select to authenticated
  using (public.current_role() = 'admin');

drop policy if exists "audit insert all" on audit_log;
create policy "audit insert all" on audit_log for insert to authenticated
  with check (true);

-- تريجر يسجّل أي تغيير في مرحلة العميل أو حالة المراجعة
create or replace function public.log_client_changes()
returns trigger as $$
begin
  if old.stage is distinct from new.stage then
    insert into audit_log (actor_id, action, target_table, target_id, details)
    values (auth.uid(), 'stage_change', 'clients', new.id,
      jsonb_build_object('client_name', new.name, 'from', old.stage, 'to', new.stage));
  end if;
  if old.review_status is distinct from new.review_status then
    insert into audit_log (actor_id, action, target_table, target_id, details)
    values (auth.uid(), 'review_status_change', 'clients', new.id,
      jsonb_build_object('client_name', new.name, 'from', old.review_status, 'to', new.review_status));
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_log_client_changes on clients;
create trigger trg_log_client_changes
  after update on clients
  for each row execute procedure public.log_client_changes();

-- تريجر يسجّل أي تغيير في دور مستخدم
create or replace function public.log_role_changes()
returns trigger as $$
begin
  if old.role is distinct from new.role then
    insert into audit_log (actor_id, action, target_table, target_id, details)
    values (auth.uid(), 'role_change', 'profiles', new.id,
      jsonb_build_object('user_name', new.full_name, 'from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_log_role_changes on profiles;
create trigger trg_log_role_changes
  after update on profiles
  for each row execute procedure public.log_role_changes();

-- ---------- ج. مرفقات العميل (Supabase Storage) ----------

insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;

drop policy if exists "client files select" on storage.objects;
create policy "client files select" on storage.objects for select to authenticated
  using (bucket_id = 'client-files');

drop policy if exists "client files insert" on storage.objects;
create policy "client files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files');

drop policy if exists "client files delete" on storage.objects;
create policy "client files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'client-files' and public.current_role() in ('admin', 'support'));

-- ---------- تحديث بيانات قديمة (لو عندك مستخدمين اتعملوا قبل التحديث ده) ----------
-- شغّل السطر ده مرة واحدة بس لو عايز تملأ عمود email للمستخدمين الموجودين بالفعل:
-- update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;
