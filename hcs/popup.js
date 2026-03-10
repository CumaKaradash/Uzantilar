/**
 * High-Contrast Sovereign — popup.js
 */

const i18n = {
  en: {
    toggleTitle: 'High Contrast',
    toggleSub:   'WCAG AAA on every page',
    statusOn:    'Active',
    statusOff:   'Inactive',
    modeLabel:   'Contrast mode',
    modeYB:      'Yellow / Black',
    modeInv:     'Inverted',
    modeInvSub:  'Colors reversed',
    modeGs:      'Grayscale',
    modeGsSub:   '+25% contrast',
    footerText:  'See every page, clearly.',
  },
  tr: {
    toggleTitle: 'Yüksek Kontrast',
    toggleSub:   'Her sayfada WCAG AAA',
    statusOn:    'Aktif',
    statusOff:   'Pasif',
    modeLabel:   'Kontrast modu',
    modeYB:      'Sarı / Siyah',
    modeInv:     'Ters Çevrilmiş',
    modeInvSub:  'Renkler tersine döndü',
    modeGs:      'Gri Tonlama',
    modeGsSub:   '+%25 kontrast',
    footerText:  'Her sayfayı net gör.',
  },
};

let state = { enabled: false, mode: 'yellow-black', theme: 'light', lang: 'en' };

const body       = document.body;
const mainToggle = document.getElementById('mainToggle');
const statusPill = document.getElementById('statusPill');
const statusText = statusPill.querySelector('.status-text');
const themeBtn   = document.getElementById('themeToggle');
const langBtn    = document.getElementById('langToggle');
const langLabel  = document.getElementById('langLabel');
const modeGroup  = document.getElementById('modeGroup');
const modeBtns   = modeGroup.querySelectorAll('.mode-btn');

// ─── APPLY ────────────────────────────────────────────────────────────────────

function applyTheme(t) { body.setAttribute('data-theme', t); }

function applyLang(lang) {
  body.setAttribute('data-lang', lang);
  langLabel.textContent = lang === 'en' ? 'TR' : 'EN';
  const s = i18n[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key === 'statusOn' || key === 'statusOff') return;
    if (s[key]) el.textContent = s[key];
  });
  applyToggleUI(state.enabled, lang);
}

function applyToggleUI(enabled, lang = state.lang) {
  const s = i18n[lang];
  mainToggle.classList.toggle('active', enabled);
  statusPill.classList.toggle('off', !enabled);
  statusText.textContent = enabled ? s.statusOn : s.statusOff;
  modeGroup.style.opacity       = enabled ? '1'    : '0.45';
  modeGroup.style.pointerEvents = enabled ? 'auto' : 'none';
}

function applyMode(mode) {
  modeBtns.forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.mode === mode));
  });
}

function applyAll() {
  applyTheme(state.theme);
  applyLang(state.lang);
  applyToggleUI(state.enabled);
  applyMode(state.mode);
}

// ─── CONTENT SCRIPT MESAJLARI ─────────────────────────────────────────────────

async function sendToContent(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('about:')    || url.startsWith('edge://')) return;

  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      setTimeout(() => chrome.tabs.sendMessage(tab.id, msg).catch(() => {}), 300);
    } catch (_) {}
  }
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

function save(notifyMsg) {
  chrome.storage.local.set({
    enabled: state.enabled, mode: state.mode,
    theme: state.theme, lang: state.lang,
  });
  if (notifyMsg) sendToContent(notifyMsg);
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

mainToggle.addEventListener('click', () => {
  state.enabled = !state.enabled;
  applyToggleUI(state.enabled);
  save(state.enabled
    ? { type: 'HCS_ENABLE', mode: state.mode }
    : { type: 'HCS_DISABLE' });
});

themeBtn.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  chrome.storage.local.set({ theme: state.theme });
});

langBtn.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'tr' : 'en';
  applyLang(state.lang);
  chrome.storage.local.set({ lang: state.lang });
});

modeGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  state.mode = btn.dataset.mode;
  applyMode(state.mode);
  save(state.enabled ? { type: 'HCS_SET_MODE', mode: state.mode } : null);
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
chrome.storage.local.get(['enabled', 'mode', 'theme', 'lang'], (r) => {
  state.enabled = r.enabled === true;
  state.mode    = r.mode   || 'yellow-black';
  state.theme   = r.theme  || 'light';
  state.lang    = r.lang   || 'en';
  applyAll();
});
