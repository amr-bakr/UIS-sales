-- ============================================================
-- بيانات ديمو واقعية لعرض المنصة على الشركة
-- شغّله في SQL Editor بعد كل ملفات schema (لازم يكون عندك سيلز واحد
-- على الأقل متعمل بالفعل من users.html أو Authentication قبل ما تشغّله)
-- ============================================================

do $$
declare
  v_sales_ids uuid[];
  v_count int;
  v_admin_id uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid; c7 uuid; c8 uuid; c9 uuid;
begin
  select array_agg(id order by email) into v_sales_ids from profiles where role = 'sales';
  v_count := coalesce(array_length(v_sales_ids, 1), 0);

  if v_count = 0 then
    raise exception 'مفيش أي مستخدم بدور "sales" في جدول profiles. أنشئ سيلز واحد على الأقل الأول (من users.html) وبعدين شغّل السكريبت ده تاني.';
  end if;

  select id into v_admin_id from profiles where role = 'admin' limit 1;

  -- ================= ١. مطعم الديار — مصر — فوز، في التنفيذ =================
  insert into clients (
    name, phone, country, activity, branches, users_count, warehouse, warehouse_count, contact,
    sales_id, stage, review_status, has_system, sys_name, sys_age, sys_type, problems, needs, modules,
    deal_value, currency, expected_close_date, lead_source, contacts, implementation_stage,
    contract_start_date, renewal_date, renewal_value, visit_date, created_at
  ) values (
    'مطعم الديار', '01012345678', 'مصر', 'سلسلة مطاعم', '4', '12', 'نعم', '2', 'محمود عبد الله - مدير عمليات',
    v_sales_ids[1 + (0 % v_count)], 'won', 'تم الاستلام', 'نعم', 'نظام محلي بسيط', 'سنتين', 'مطوّر خصيصاً',
    '[{"issue":"الجرد مش مظبوط","detail":"فرق كبير وقت الجرد الشهري بين المخازن","priority":"عالية"},{"issue":"تكلفة الوجبات مش واضحة","detail":"مفيش Recipe Cost مربوط بالمخزون","priority":"متوسطة"}]'::jsonb,
    'عايزين تقرير يومي للمبيعات لكل فرع، وتقرير Food Cost أسبوعي',
    '["POS","Inventory","Dashboard"]'::jsonb,
    180000, 'EGP', (current_date - 20)::text, 'إحالة عميل',
    '[{"name":"سارة أحمد","role":"مسؤول مالي","phone":"01099887766"}]'::jsonb,
    'اختبار تجريبي',
    (current_date - 30)::text, (current_date + 330)::text, 190000,
    (current_date - 45)::text, now() - interval '45 days'
  ) returning id into c1;

  insert into debriefs (client_id, created_by, went_well, objections, next_step) values
    (c1, v_sales_ids[1 + (0 % v_count)], 'الإدارة عجبها الـ Dashboard اللحظي وسهولة الجرد', 'قلقانين من فترة تدريب الفريق', 'تحديد موعد تدريب فريق المخازن الأسبوع الجاي');

  insert into activities (client_id, sales_id, activity_type, notes, activity_date) values
    (c1, v_sales_ids[1 + (0 % v_count)], 'زيارة', 'زيارة اكتشاف أولى وجمع بيانات المخازن', current_date - 45),
    (c1, v_sales_ids[1 + (0 % v_count)], 'مكالمة', 'متابعة بعد الديمو وتأكيد الاهتمام', current_date - 30),
    (c1, v_sales_ids[1 + (0 % v_count)], 'متابعة', 'تنسيق موعد زيارة التركيب', current_date - 10);

  insert into implementation_reports (
    client_id, engineer_name, activation_date, hardware_notes, installation_checklist,
    training_summary, issues, go_live_status, field_engineer_recommendation, created_by
  ) values (
    c1, 'أحمد سمير', (current_date - 10)::text, 'تركيب 4 نقاط بيع + طابعتين مطبخ + راوتر شبكة داخلي',
    '[{"item":"تركيب الشبكة الداخلية","done":true},{"item":"تجهيز نقاط البيع","done":true},{"item":"ربط الطابعات بالمطبخ","done":false}]'::jsonb,
    'تدريب أساسي لفريق الكاشير تم بنجاح، متبقي تدريب فريق المخازن على الجرد',
    '[{"issue":"بطء في الشبكة بين الفروع وقت الذروة","action":"تم تركيب راوتر إضافي وتوزيع الحمل","owner":"أحمد سمير"}]'::jsonb,
    'قيد المراجعة', 'محتاج أسبوع إضافي لإتمام تدريب المخازن قبل التفعيل الكامل', coalesce(v_admin_id, v_sales_ids[1])
  );

  -- ================= ٢. كافيه بين الأصدقاء — مصر — اكتشاف، متابعة متأخرة =================
  insert into clients (
    name, phone, country, activity, branches, users_count, warehouse, contact,
    sales_id, stage, review_status, has_system, sys_name, problems, needs, modules,
    deal_value, currency, lead_source, next_follow_up_date, visit_date, created_at
  ) values (
    'كافيه بين الأصدقاء', '01123456789', 'مصر', 'كافيه', '1', '4', 'لا', 'يوسف حسن - المالك',
    v_sales_ids[1 + (1 % v_count)], 'discovery', 'بانتظار المراجعة', 'نعم', 'دفتر وورقي فعليًا',
    '[{"issue":"مفيش أي تتبع للمخزون","detail":"كل حاجة بتتحسب يدوي في دفتر","priority":"عالية"}]'::jsonb,
    'عايزين حاجة بسيطة وسريعة، مش معقدة',
    '["POS","Inventory"]'::jsonb,
    45000, 'EGP', 'سوشيال ميديا', (current_date - 3)::text, (current_date - 6)::text, now() - interval '6 days'
  ) returning id into c2;

  -- ================= ٣. مطاعم الشرق الأوسط — الكويت — ديمو مجدول =================
  insert into clients (
    name, phone, country, activity, branches, users_count, warehouse, warehouse_count, contact,
    sales_id, stage, review_status, has_system, sys_name, sys_age, sys_type, problems, needs, modules,
    deal_value, currency, expected_close_date, lead_source, demo_date, demo_time, demo_place,
    attendees, decision, finance, visit_date, created_at
  ) values (
    'مطاعم الشرق الأوسط', '+96555512345', 'الكويت', 'سلسلة مطاعم', '6', '20', 'نعم', '1', 'فيصل العتيبي - مدير تشغيل',
    v_sales_ids[1 + (2 % v_count)], 'demo_scheduled', 'تم الاستلام', 'نعم', 'Foodics', 'سنة ونص', 'جاهز',
    '[{"issue":"التقارير مش مرنة","detail":"مش بتقدر تعمل تقرير مخصص لكل فرع","priority":"متوسطة"},{"issue":"دعم فني بطيء من المورد الحالي","detail":"بياخد أيام يرد","priority":"عالية"}]'::jsonb,
    'تقارير مخصصة لكل فرع، ودعم فني أسرع',
    '["POS","Dashboard","Purchasing"]'::jsonb,
    25000, 'KWD', (current_date + 25)::text, 'معرض / فعالية',
    (current_date + 5)::text, '12:00', 'مقر الشركة - الكويت',
    'مدير التشغيل + مدير تقنية المعلومات', 'فيصل العتيبي', 'نعم',
    (current_date - 8)::text, now() - interval '8 days'
  ) returning id into c3;

  insert into debriefs (client_id, created_by, went_well, next_step) values
    (c3, v_sales_ids[1 + (2 % v_count)], 'مهتمين جدًا بموضوع التقارير المخصصة', 'تجهيز عرض تقني يركز على Dashboard متعدد الفروع');

  -- ================= ٤. بيتزا فور يو — عُمان — تم الديمو =================
  insert into clients (
    name, phone, country, activity, branches, users_count, warehouse, contact,
    sales_id, stage, review_status, has_system, needs, modules,
    deal_value, currency, expected_close_date, lead_source, visit_date, created_at
  ) values (
    'بيتزا فور يو', '+96892345678', 'عُمان', 'مطعم فرع واحد', '1', '6', 'لا', 'خالد البلوشي - المالك',
    v_sales_ids[1 + (3 % v_count)], 'demo_done', 'تم الاستلام', 'لا',
    'محتاجين نظام Tablet Ordering للطلب من على الطاولة',
    '["POS","Tablet Ordering","Dashboard"]'::jsonb,
    8000, 'OMR', (current_date + 15)::text, 'اتصال بارد',
    (current_date - 15)::text, now() - interval '15 days'
  ) returning id into c4;

  insert into activities (client_id, sales_id, activity_type, notes, activity_date) values
    (c4, v_sales_ids[1 + (3 % v_count)], 'زيارة', 'ديمو في مقر المطعم', current_date - 4);

  -- ================= ٥. مطعم بوابة الشام — الكويت — عرض سعر =================
  insert into clients (
    name, phone, country, activity, branches, users_count, warehouse, warehouse_count, contact,
    sales_id, stage, review_status, has_system, sys_name, sys_type, needs, modules,
    deal_value, currency, expected_close_date, lead_source, contacts,
    attendees, decision, finance, visit_date, created_at
  ) values (
    'مطعم بوابة الشام', '+96566678901', 'الكويت', 'سلسلة مطاعم', '3', '15', 'نعم', '1', 'عمر الحمد - مدير عام',
    v_sales_ids[1 + (4 % v_count)], 'proposal', 'تم الاستلام', 'نعم', 'نظام قديم متوقف عنه الدعم', 'جاهز',
    'يستبدلوا نظام قديم بالكامل، عايزين انتقال سلس للبيانات',
    '["POS","Inventory","Purchasing","Dashboard"]'::jsonb,
    40000, 'KWD', (current_date + 10)::text, 'موقع الشركة',
    '[{"name":"ليلى قاسم","role":"مسؤول مالي","phone":"+96566611122"},{"name":"عمر الحمد","role":"صاحب القرار","phone":"+96566678901"}]'::jsonb,
    'المالك + المدير المالي', 'عمر الحمد', 'نعم',
    (current_date - 18)::text, now() - interval '18 days'
  ) returning id into c5;

  insert into debriefs (client_id, created_by, went_well, objections, next_step) values
    (c5, v_sales_ids[1 + (4 % v_count)], 'إعجاب كبير بسهولة نقل البيانات من النظام القديم', 'قلقانين من فترة التوقف وقت التحويل', 'تجهيز خطة تحويل بيانات بمرحلتين لتقليل التوقف');

  -- ================= ٦. كافيهات المسا — مصر — تفاوض =================
  insert into clients (
    name, phone, country, activity, branches, users_count, warehouse, warehouse_count, contact,
    sales_id, stage, review_status, has_system, sys_name, needs, modules,
    deal_value, currency, expected_close_date, lead_source, next_follow_up_date, visit_date, created_at
  ) values (
    'كافيهات المسا', '01234567890', 'مصر', 'سلسلة فروع', '8', '25', 'نعم', '3', 'نور الدين محمد - المالك',
    v_sales_ids[1 + (5 % v_count)], 'negotiation', 'تم الاستلام', 'نعم', 'نظام منافس محلي',
    'عايزين نظام موحد لكل الفروع مع تقارير مالية مجمّعة',
    '["POS","Inventory","Accounting","Dashboard"]'::jsonb,
    220000, 'EGP', (current_date + 7)::text, 'إحالة عميل', (current_date + 3)::text,
    (current_date - 25)::text, now() - interval '25 days'
  ) returning id into c6;

  -- ================= ٧. مطعم الواحة — عُمان — فوز، Go-Live فعلي =================
  insert into clients (
    name, phone, country, activity, branches, users_count, warehouse, contact,
    sales_id, stage, review_status, has_system, needs, modules,
    deal_value, currency, expected_close_date, lead_source, implementation_stage,
    contract_start_date, renewal_date, renewal_value, visit_date, created_at
  ) values (
    'مطعم الواحة', '+96891122334', 'عُمان', 'مطعم فرع واحد', '1', '8', 'نعم', 'سالم الهنائي - المالك',
    v_sales_ids[1 + (6 % v_count)], 'won', 'تم الاستلام', 'لا',
    'إدارة كاملة للمطعم من الطلب لحد الفاتورة', '["POS","Inventory","Dashboard"]'::jsonb,
    12000, 'OMR', (current_date - 95)::text, 'إحالة عميل', 'Go-Live فعلي',
    (current_date - 90)::text, (current_date + 275)::text, 12500,
    (current_date - 110)::text, now() - interval '110 days'
  ) returning id into c7;

  insert into implementation_reports (
    client_id, engineer_name, activation_date, hardware_notes, installation_checklist,
    training_summary, go_live_status, field_engineer_recommendation, signed_by_engineer, signed_by_client, sign_off_date, created_by
  ) values (
    c7, 'بدر الراشدي', (current_date - 80)::text, 'تركيب نقطة بيع واحدة + طابعة مطبخ',
    '[{"item":"تركيب الشبكة","done":true},{"item":"تجهيز نقطة البيع","done":true},{"item":"ربط الطابعة","done":true}]'::jsonb,
    'تدريب كامل للفريق تم بنجاح على كل الموديولات',
    'جاهز', 'العميل جاهز تمامًا، الأداء مستقر من أول أسبوع', 'بدر الراشدي', 'سالم الهنائي',
    (current_date - 78)::text, coalesce(v_admin_id, v_sales_ids[1])
  );

  insert into activities (client_id, sales_id, activity_type, notes, activity_date) values
    (c7, v_sales_ids[1 + (6 % v_count)], 'زيارة', 'متابعة بعد شهر من التشغيل، كل حاجة تمام', current_date - 50);

  -- ================= ٨. كافيه نور — مصر — خسارة =================
  insert into clients (
    name, phone, country, activity, branches, users_count, contact,
    sales_id, stage, review_status, needs, modules,
    deal_value, currency, lead_source, loss_reason, visit_date, created_at
  ) values (
    'كافيه نور', '01298765432', 'مصر', 'كافيه', '1', '5', 'كريم ماهر - المالك',
    v_sales_ids[1 + (7 % v_count)], 'lost', 'تم الاستلام',
    'نظام بسيط لإدارة الكاشير بس', '["POS"]'::jsonb,
    30000, 'EGP', 'اتصال بارد', 'السعر', (current_date - 40)::text, now() - interval '40 days'
  ) returning id into c8;

  insert into debriefs (client_id, created_by, objections, next_step) values
    (c8, v_sales_ids[1 + (7 % v_count)], 'شاف السعر عالي مقارنة بحل محلي أرخص', 'متابعة بعد 3 شهور لو حابب يراجع القرار');

  -- ================= ٩. مطعم فيوجن كويزين — الكويت — فوز، بداية التنفيذ =================
  insert into clients (
    name, phone, country, activity, branches, users_count, warehouse, contact,
    sales_id, stage, review_status, needs, modules,
    deal_value, currency, expected_close_date, lead_source, implementation_stage,
    contract_start_date, renewal_date, renewal_value, visit_date, created_at
  ) values (
    'مطعم فيوجن كويزين', '+96599887766', 'الكويت', 'مطعم فرع واحد', '1', '10', 'نعم', 'منى العنزي - مديرة عامة',
    v_sales_ids[1 + (8 % v_count)], 'won', 'بانتظار المراجعة',
    'تكامل كامل بين المطبخ والكاشير والمخزون', '["POS","Inventory","Tablet Ordering"]'::jsonb,
    18000, 'KWD', (current_date - 5)::text, 'سوشيال ميديا', 'إدخال البيانات',
    (current_date - 4)::text, (current_date + 361)::text, 19000,
    (current_date - 12)::text, now() - interval '12 days'
  ) returning id into c9;

  -- ================= تارجت شهري لكل سيلز (الشهر الحالي والسابق) =================
  insert into sales_targets (sales_id, month, target_amount, currency)
  select s, date_trunc('month', current_date)::date, 150000, 'EGP'
  from unnest(v_sales_ids) as s
  on conflict (sales_id, month) do nothing;

  insert into sales_targets (sales_id, month, target_amount, currency)
  select s, (date_trunc('month', current_date) - interval '1 month')::date, 140000, 'EGP'
  from unnest(v_sales_ids) as s
  on conflict (sales_id, month) do nothing;

  raise notice 'تم إدخال بيانات الديمو بنجاح: 9 عملاء موزّعين على كل المراحل والدول.';
end $$;
