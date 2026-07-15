// ============================================================
// الوضع الليلي (Dark Mode) — بيتطبق فورًا في كل صفحة قبل أي حاجة تانية
// ملحوظة: بعض المتصفحات (زي Edge مع Tracking Prevention) بتمنع الوصول
// لـ localStorage تمامًا، فلازم نتعامل مع ده بحذر عشان ميوقفش باقي الكود
// ============================================================
function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* تجاهل بهدوء */ }
}

(function applySavedTheme() {
  const saved = safeStorageGet('uis-theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    safeStorageSet('uis-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    safeStorageSet('uis-theme', 'dark');
  }
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️ الوضع النهاري' : '🌙 الوضع الليلي';
}

// ============================================================
// بعد ما تعمل مشروع على supabase.com، هات القيمتين دول من:
// Project Settings → API → Project URL / anon public key
// ============================================================
const APP_BUILD_VERSION = 'v15';
const SUPABASE_URL = "https://lndacyhcjrpybbsjwupw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGFjeWhjanJweWJic2p3dXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODE3NzAsImV4cCI6MjA5OTE1Nzc3MH0.qHjpDh4Qk3Plau6_412hRwSl5qclIKG3cGPmoTqi3KU";

// ---------- تحميل مكتبة Supabase ديناميكيًا مع أكتر من مصدر بديل ----------
// (بدون document.write عشان الكروم مش يتجاهله على النت البطيء)
const SUPABASE_LIB_SOURCES = [
  'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
];

function loadScriptTag(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('failed to load ' + src));
    document.head.appendChild(el);
  });
}

let _libLoadPromise = null;
function loadSupabaseLib() {
  if (typeof supabase !== 'undefined') return Promise.resolve();
  if (_libLoadPromise) return _libLoadPromise;
  _libLoadPromise = SUPABASE_LIB_SOURCES.reduce(
    (chain, src) => chain.catch(() => loadScriptTag(src)),
    Promise.reject()
  );
  return _libLoadPromise;
}

// ---------- تحميل مكتبة Chart.js ديناميكيًا (مستخدمة في لوحة الإدارة بس) ----------
let _chartLibPromise = null;
function loadChartLib() {
  if (typeof Chart !== 'undefined') return Promise.resolve();
  if (_chartLibPromise) return _chartLibPromise;
  const sources = [
    'https://unpkg.com/chart.js@4.4.4/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  ];
  _chartLibPromise = sources.reduce(
    (chain, src) => chain.catch(() => loadScriptTag(src)),
    Promise.reject()
  );
  return _chartLibPromise;
}

let sb = null;
let _sbReadyPromise = null;
function ensureSb() {
  if (sb) return Promise.resolve(sb);
  if (_sbReadyPromise) return _sbReadyPromise;
  _sbReadyPromise = loadSupabaseLib().then(() => {
    if (typeof supabase === 'undefined') {
      throw new Error('مكتبة الاتصال بالسيرفر (Supabase) متحمّلتش من أي مصدر. تأكد من اتصال الإنترنت.');
    }
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return sb;
  }).catch((e) => {
    showLibraryError(e.message);
    throw e;
  });
  return _sbReadyPromise;
}

function showLibraryError(message) {
  const show = () => {
    if (document.getElementById('lib-error-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'lib-error-banner';
    banner.textContent = 'تعذر الاتصال بالسيرفر: ' + message;
    banner.style.cssText = 'background:#96281B;color:#fff;padding:12px;text-align:center;font-family:Tajawal,sans-serif;font-size:14px;';
    document.body.insertBefore(banner, document.body.firstChild);
  };
  if (document.body) show();
  else document.addEventListener('DOMContentLoaded', show);
}

// نبدأ التحميل فورًا من غير ما نستنى حد يطلبها
ensureSb();

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

// ---------- الأمان: تنظيف أي نص المستخدم كتبه قبل حقنه في الصفحة ----------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

// ---------- تجربة الاستخدام: تنبيهات Toast بدل alert() ----------
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ---------- تجربة الاستخدام: قفل أي Modal بزرار Escape أو بالضغط برّه ----------
(function wireModalDismiss() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = '';
    }
  });
  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = '';
    }
  });
})();

// ---------- تجربة الاستخدام: تعطيل زرار وقت العملية عشان يمنع ضغط مزدوج ----------
async function withButtonLoading(button, label, fn) {
  const original = button.textContent;
  button.disabled = true;
  button.innerHTML = label + '<span class="spinner"></span>';
  try {
    await fn();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

// ---------- Phase 4: تتبّع مرحلة التنفيذ بعد كسب الصفقة ----------
const IMPLEMENTATION_STAGES = [
  'العقد موقّع',
  'تركيب الهاردوير',
  'إدخال البيانات',
  'التدريب',
  'اختبار تجريبي',
  'Go-Live فعلي',
];

function implementationBadgeClass(stage) {
  if (stage === 'Go-Live فعلي') return 'badge-received';
  if (!stage) return 'badge-pending';
  return 'badge-stage';
}

// ---------- Phase 6: مصادر العملاء ----------
const LEAD_SOURCES = ['إحالة عميل', 'معرض / فعالية', 'اتصال بارد', 'موقع الشركة', 'سوشيال ميديا', 'أخرى'];

// ---------- الشريط الجانبي الموحد ----------
function renderSidebar(activeKey, profile) {
  const root = document.getElementById('sidebar-root');
  if (!root) return;
  const links = [];
  if (profile.role === 'admin') {
    links.push({ key: 'dashboard', href: 'management.html', label: 'لوحة الإدارة' });
    links.push({ key: 'users', href: 'users.html', label: 'المستخدمون' });
  }
  if (profile.role === 'sales') {
    links.push({ key: 'pipeline', href: 'sales.html', label: 'عملائي' });
  }
  if (profile.role === 'support') {
    links.push({ key: 'review', href: 'support.html', label: 'مراجعة النماذج' });
  }
  root.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-mark">UIS</div>
      <div>
        <div class="brand-title" style="font-size:14px;">نظام إدارة العملاء</div>
        <div class="sidebar-user">${escapeHtml(profile.full_name || profile.email || '')}</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${links.map(l => `<a class="sidebar-link${l.key === activeKey ? ' active' : ''}" href="${l.href}">${l.label}</a>`).join('')}
    </nav>
    <div class="sidebar-foot">
      <button class="theme-toggle" id="theme-toggle-btn" onclick="toggleTheme()">${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️ الوضع النهاري' : '🌙 الوضع الليلي'}</button>
      <div style="text-align:center; font-size:10px; color:var(--ink-muted); margin-top:6px;">نسخة الكود: ${APP_BUILD_VERSION}</div>
    </div>
  `;
}

// ---------- رابط واتساب سريع ----------
function whatsappLink(phone) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return null;
  return 'https://wa.me/' + digits;
}

// ---------- أسباب الخسارة ----------
const LOSS_REASONS = ['السعر', 'المنافس', 'التوقيت', 'أخرى'];

// ---------- مرفقات العميل (Supabase Storage) ----------
async function uploadClientFile(clientId, file) {
  const path = clientId + '/' + Date.now() + '_' + file.name.replace(/[^\w.\-]/g, '_');
  const { error } = await sb.storage.from('client-files').upload(path, file);
  if (error) throw error;
  return path;
}

async function listClientFiles(clientId) {
  const { data, error } = await sb.storage.from('client-files').list(clientId, { sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return [];
  return data || [];
}

async function getClientFileUrl(clientId, filename) {
  const { data, error } = await sb.storage.from('client-files').createSignedUrl(clientId + '/' + filename, 3600);
  if (error) return null;
  return data.signedUrl;
}

async function deleteClientFile(clientId, filename) {
  await sb.storage.from('client-files').remove([clientId + '/' + filename]);
}

function reviewBadgeClass(status) {
  if (status === 'تم الاستلام') return 'badge-received';
  if (status === 'يحتاج استكمال') return 'badge-needs';
  return 'badge-pending';
}

// ---------- Auth helpers ----------
async function getCurrentProfile() {
  try {
    await ensureSb();
  } catch (e) {
    return null;
  }
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
  try { await ensureSb(); if (sb) await sb.auth.signOut(); } catch (e) {}
  window.location.href = 'login.html';
}

// ---------- Summary builder (used everywhere a client record is displayed) ----------
function buildClientSummary(d) {
  const e = escapeHtml;
  let lines = [];
  lines.push('العميل: ' + e(d.name || '-') + ' | رقم التواصل: ' + e(d.phone || '-'));
  lines.push('النشاط: ' + e(d.activity || '-') + ' | عدد الفروع: ' + e(d.branches || '-') + ' | المستخدمين: ' + e(d.users_count || '-'));
  lines.push('مطبخ / مصنع مركزي: ' + e(d.warehouse || '-') + ' | عدد المخازن: ' + e(d.warehouse_count || '-'));
  lines.push('المسؤول: ' + e(d.contact || '-') + ' | الدولة: ' + e(d.country || '-'));
  lines.push('');
  lines.push('النظام الحالي: ' + e(d.has_system || '-') + (d.sys_name ? (' — ' + e(d.sys_name)) : '') + (d.sys_age ? (' — منذ ' + e(d.sys_age)) : '') + (d.sys_type ? (' — ' + e(d.sys_type)) : ''));
  lines.push('');
  const problems = d.problems || [];
  lines.push('المشاكل:');
  if (problems.length === 0) lines.push('  (لا يوجد)');
  problems.forEach((p, i) => lines.push('  ' + (i + 1) + '. ' + e(p.issue) + (p.detail ? (' — ' + e(p.detail)) : '') + (p.priority ? (' [' + e(p.priority) + ']') : '')));
  lines.push('');
  lines.push('الاحتياجات والتقارير: ' + e(d.needs || '-'));
  lines.push('');
  const modules = d.modules || [];
  lines.push('الموديولات المطلوبة: ' + (modules.length ? e(modules.join('، ')) : '-'));
  lines.push('');
  lines.push('حضور الديمو: ' + e(d.attendees || '-') + ' | صاحب القرار: ' + e(d.decision || '-'));
  lines.push('الإدارة المالية: ' + e(d.finance || '-') + ' | التشغيل: ' + e(d.ops || '-'));
  lines.push('');
  lines.push('الديمو المقترح: ' + e(d.demo_date || '-') + ' ' + e(d.demo_time || '') + ' — ' + e(d.demo_place || '-'));
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
