-- ============================================================
-- تصحيح: أعمدة اتنسيت لما اتقال "تجاهل schema_v4.sql"
-- الملف ده كان فيه فعلاً أعمدة العقد والتجديد ضمن كود التذاكر اللي اتشال،
-- فلما اتجاهلته بالكامل، الأعمدة دي معملتش. الملف ده بيصلّح الموضوع.
-- إضافة فقط، آمن تشغّله في أي وقت.
-- ============================================================

alter table clients add column if not exists contract_start_date text;
alter table clients add column if not exists renewal_date text;
alter table clients add column if not exists renewal_value numeric default 0;

-- عمود تاريخ إنشاء لكل بروفايل، كان ناقص من البداية
alter table profiles add column if not exists created_at timestamptz default now();
