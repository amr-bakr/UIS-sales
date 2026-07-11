// ============================================================
// بعد ما تعمل مشروع على supabase.com، هات القيمتين دول من:
// Project Settings → API → Project URL / anon public key
// ============================================================
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STAGES = [
  { key: 'discovery', label: 'الاكتشاف' },
  { key: 'demo_scheduled', label: 'الديمو مجدول' },
  { key: 'demo_done', label: 'تم الديمو' },
  { key: 'proposal', label: 'عرض السعر' },
  { key: 'negotiation', label: 'التفاوض' },
  { key: 'won', label: 'تم الإغلاق - فوز' },
  { key: 'lost', label: 'تم الإغلاق - خسارة' },
];

function stageLabel(key) {
  const s = STAGES.find(s => s.key === key);
  return s ? s.label : key;
}

// ---------- Phase 3: الماليات والتوقعات ----------
// احتمالية الإغلاق التلقائية حسب المرحلة — تقدر تعدّل النسب دي براحتك
const STAGE_PROBABILITY = {
  discovery: 0.10, demo_scheduled: 0.25, demo_done: 0.40,
  proposal: 0.60, negotiation: 0.75, won: 1, lost: 0,
};

// سعر الصرف التقريبي لكل عملة مقابل الدولار — عدّل الأرقام دي لما الأسعار تتغيّر
const CURRENCY_TO_USD = { EGP: 1 / 49, KWD: 3.25, OMR: 2.6 };

function weightedValue(client) {
  const val = Number(client.deal_value) || 0;
  const prob = STAGE_PROBABILITY[client.stage] ?? 0;
  return val * prob;
}

function toUSD(amount, currency) {
  const rate = CURRENCY_TO_USD[currency] || 1;
  return (Number(amount) || 0) * rate;
}

function formatMoney(amount, currency) {
  const n = Number(amount) || 0;
  return Math.round(n).toLocaleString('ar-EG') + (currency ? (' ' + currency) : '');
}

function monthKey(dateStr) {
  if (!dateStr) return null;
  return dateStr.slice(0, 7); // "2026-07-15" → "2026-07"
}

function reviewBadgeClass(status) {
  if (status === 'تم الاستلام') return 'badge-received';
  if (status === 'يحتاج استكمال') return 'badge-needs';
  return 'badge-pending';
}

// ---------- Auth helpers ----------
async function getCurrentProfile() {
  try {
    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData || !sessionData.session) return null;
    const userId = sessionData.session.user.id;
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  } catch (e) {
    console.error('getCurrentProfile failed:', e);
    return null;
  }
}

async function requireRole(allowedRoles) {
  const profile = await getCurrentProfile();
  if (!profile) {
    window.location.href = 'login.html';
    return null;
  }
  if (!allowedRoles.includes(profile.role)) {
    window.location.href = 'login.html';
    return null;
  }
  return profile;
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = 'login.html';
}

// ---------- Summary builder (used everywhere a client record is displayed) ----------
function buildClientSummary(d) {
  let lines = [];
  lines.push('العميل: ' + (d.name || '-') + ' | رقم التواصل: ' + (d.phone || '-'));
  lines.push('النشاط: ' + (d.activity || '-') + ' | عدد الفروع: ' + (d.branches || '-') + ' | المستخدمين: ' + (d.users_count || '-'));
  lines.push('مطبخ / مصنع مركزي: ' + (d.warehouse || '-') + ' | عدد المخازن: ' + (d.warehouse_count || '-'));
  lines.push('المسؤول: ' + (d.contact || '-') + ' | الدولة: ' + (d.country || '-'));
  lines.push('');
  lines.push('النظام الحالي: ' + (d.has_system || '-') + (d.sys_name ? (' — ' + d.sys_name) : '') + (d.sys_age ? (' — منذ ' + d.sys_age) : '') + (d.sys_type ? (' — ' + d.sys_type) : ''));
  lines.push('');
  const problems = d.problems || [];
  lines.push('المشاكل:');
  if (problems.length === 0) lines.push('  (لا يوجد)');
  problems.forEach((p, i) => lines.push('  ' + (i + 1) + '. ' + p.issue + (p.detail ? (' — ' + p.detail) : '') + (p.priority ? (' [' + p.priority + ']') : '')));
  lines.push('');
  lines.push('الاحتياجات والتقارير: ' + (d.needs || '-'));
  lines.push('');
  const modules = d.modules || [];
  lines.push('الموديولات المطلوبة: ' + (modules.length ? modules.join('، ') : '-'));
  lines.push('');
  lines.push('حضور الديمو: ' + (d.attendees || '-') + ' | صاحب القرار: ' + (d.decision || '-'));
  lines.push('الإدارة المالية: ' + (d.finance || '-') + ' | التشغيل: ' + (d.ops || '-'));
  lines.push('');
  lines.push('الديمو المقترح: ' + (d.demo_date || '-') + ' ' + (d.demo_time || '') + ' — ' + (d.demo_place || '-'));
  return lines.join('\n');
}

function collectProblemsFromDom(containerId) {
  const rows = document.querySelectorAll('#' + containerId + ' .problem-row');
  const out = [];
  rows.forEach(r => {
    const idPrefix = r.getAttribute('data-id');
    const issue = document.getElementById(idPrefix + '_issue').value.trim();
    const detail = document.getElementById(idPrefix + '_detail').value.trim();
    const priority = document.getElementById(idPrefix + '_priority').value;
    if (issue || detail) out.push({ issue, detail, priority });
  });
  return out;
}
