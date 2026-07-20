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
  if (btn) btn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? ICONS.sun + ' الوضع النهاري' : ICONS.moon + ' الوضع الليلي';
}

// ============================================================
// بعد ما تعمل مشروع على supabase.com، هات القيمتين دول من:
// Project Settings → API → Project URL / anon public key
// ============================================================
const APP_BUILD_VERSION = 'v25';
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

// ألوان مميزة لكل مرحلة، تستخدم كخط علوي في أعمدة الـ Kanban
const STAGE_COLORS = {
  discovery: '#8CA0B4', demo_scheduled: '#2C7BD1', demo_done: '#1D63B3',
  proposal: '#B8860B', negotiation: '#8B5CF6', won: '#1E7A4C', lost: '#96281B',
};

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
// دي قيم افتراضية بس — بتتحمّل وتتحدّث فعليًا من جدول app_settings (تعديلها من صفحة المستخدمين → الإعدادات)
const STAGE_PROBABILITY = {
  discovery: 0.10, demo_scheduled: 0.25, demo_done: 0.40,
  proposal: 0.60, negotiation: 0.75, won: 1, lost: 0,
};

const CURRENCY_TO_USD = { EGP: 1 / 49, KWD: 3.25, OMR: 2.6 };

let _settingsLoaded = false;
async function loadAppSettings() {
  if (_settingsLoaded) return;
  try {
    await ensureSb();
    const { data, error } = await sb.from('app_settings').select('*');
    if (error || !data) return;
    data.forEach(row => {
      if (row.key === 'currency_rates' && row.value) Object.assign(CURRENCY_TO_USD, row.value);
      if (row.key === 'stage_probabilities' && row.value) Object.assign(STAGE_PROBABILITY, row.value);
    });
    _settingsLoaded = true;
  } catch (e) {
    console.error('تعذر تحميل الإعدادات، هيتم استخدام القيم الافتراضية:', e);
  }
}

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

// ---------- أيقونات بسيطة (SVG) ----------
const ICONS = {
  dashboard: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.2"/><rect x="11" y="2.5" width="6.5" height="4" rx="1.2"/><rect x="11" y="8.5" width="6.5" height="9" rx="1.2"/><rect x="2.5" y="11" width="6.5" height="6.5" rx="1.2"/></svg>',
  users: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7.5" cy="6.5" r="3"/><path d="M2 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="14.5" cy="7" r="2.3"/><path d="M13 12.2c2.6.3 4.5 2.1 4.5 4.8" stroke-linecap="round"/></svg>',
  pipeline: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.3" y="3" width="4.6" height="14" rx="1"/><rect x="8" y="3" width="4.6" height="9" rx="1"/><rect x="13.7" y="3" width="4.6" height="11" rx="1"/></svg>',
  review: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3.5" width="12" height="14" rx="1.4"/><rect x="7" y="1.8" width="6" height="3" rx="1"/><path d="M6.7 10.3l1.8 1.8 3.3-3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  logout: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 17H4.8A1.8 1.8 0 0 1 3 15.2V4.8A1.8 1.8 0 0 1 4.8 3H8"/><path d="M13 13.5l4-3.5-4-3.5"/><path d="M17 10H8"/></svg>',
  moon: '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M16.5 12.8A7 7 0 0 1 7.2 3.5a7.5 7.5 0 1 0 9.3 9.3z"/></svg>',
  sun: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="3.6" fill="currentColor" stroke="none"/><path d="M10 2.2v2M10 15.8v2M2.2 10h2M15.8 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M4.5 15.5l1.4-1.4M14.1 5.9l1.4-1.4"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/></svg>',
  settings: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3L4.9 4.9"/></svg>',
};

// ---------- الشريط الجانبي الموحد ----------
function renderSidebar(activeKey, profile) {
  const root = document.getElementById('sidebar-root');
  if (!root) return;
  const links = [];
  if (profile.role === 'admin') {
    links.push({ key: 'dashboard', href: 'management.html', label: 'لوحة الإدارة', icon: ICONS.dashboard });
    links.push({ key: 'clients', href: 'clients.html', label: 'العملاء', icon: ICONS.search });
    links.push({ key: 'users', href: 'users.html', label: 'المستخدمون', icon: ICONS.users });
    links.push({ key: 'settings', href: 'settings.html', label: 'الإعدادات', icon: ICONS.settings });
  }
  if (profile.role === 'sales') {
    links.push({ key: 'pipeline', href: 'sales.html', label: 'عملائي', icon: ICONS.pipeline });
    links.push({ key: 'clients', href: 'clients.html', label: 'بحث العملاء', icon: ICONS.search });
  }
  if (profile.role === 'support') {
    links.push({ key: 'review', href: 'support.html', label: 'مراجعة النماذج', icon: ICONS.review });
    links.push({ key: 'clients', href: 'clients.html', label: 'بحث العملاء', icon: ICONS.search });
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
      ${links.map(l => `<a class="sidebar-link${l.key === activeKey ? ' active' : ''}" href="${l.href}"><span class="sidebar-icon">${l.icon}</span>${l.label}</a>`).join('')}
    </nav>
    <div class="sidebar-foot">
      <button class="theme-toggle" id="theme-toggle-btn" onclick="toggleTheme()">${document.documentElement.getAttribute('data-theme') === 'dark' ? ICONS.sun + ' الوضع النهاري' : ICONS.moon + ' الوضع الليلي'}</button>
      <div style="text-align:center; font-size:10px; color:var(--ink-muted); margin-top:6px;">نسخة الكود: ${APP_BUILD_VERSION}</div>
    </div>
  `;
}

function logoutIcon() { return ICONS.logout; }

// ---------- رابط واتساب سريع ----------
const COUNTRY_DIAL_CODES = { 'مصر': '20', 'الكويت': '965', 'عُمان': '968' };

function whatsappLink(phone, country) {
  if (!phone) return null;
  const raw = phone.trim();
  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;

  // الرقم مكتوب بمفتاح دولة صريح (+20، +965...) — يكفي نشيل الرموز بس
  if (raw.startsWith('+')) {
    return 'https://wa.me/' + digits;
  }

  // الرقم محلي (بيبدأ بصفر) — نضيف مفتاح الدولة بناءً على دولة العميل
  if (raw.startsWith('0')) {
    const code = COUNTRY_DIAL_CODES[country];
    if (code) {
      digits = code + digits.replace(/^0+/, '');
      return 'https://wa.me/' + digits;
    }
  }

  // مش عارفين الدولة، نستخدم الأرقام زي ما هي (أفضل من مفيش رابط خالص)
  return 'https://wa.me/' + digits;
}

// ---------- طباعة/تصدير PDF دايمًا بالوضع النهاري (حتى لو الوضع الليلي مفعّل) ----------
function printInLightMode() {
  const wasDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (wasDark) document.documentElement.removeAttribute('data-theme');
  window.print();
  if (wasDark) document.documentElement.setAttribute('data-theme', 'dark');
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
