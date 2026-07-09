// ============================================================
// بعد ما تعمل مشروع على supabase.com، هات القيمتين دول من:
// Project Settings → API → Project URL / anon public key
// ============================================================
const SUPABASE_URL = "https://lndacyhcjrpybbsjwupw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGFjeWhjanJweWJic2p3dXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODE3NzAsImV4cCI6MjA5OTE1Nzc3MH0.qHjpDh4Qk3Plau6_412hRwSl5qclIKG3cGPmoTqi3KU";

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
