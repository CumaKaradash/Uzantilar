/**
 * Dyslexia Beam — popup.js
 * Ana toggle, dil, tema yönetimi ve content.js'e mesaj iletimi.
 */

// ─── i18n ─────────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    toggleTitle:   'Reading Mode',
    toggleSub:     'Font & beam on this page',
    statusOn:      'Active',
    statusOff:     'Inactive',
    featuresLabel: 'What it does',
    feat1:         'OpenDyslexic font on all text',
    feat2:         'Reading beam follows your cursor',
    feat3:         'Wider spacing & line height',
    footerText:    'Read with ease, every page.',
  },
  tr: {
    toggleTitle:   'Okuma Modu',
    toggleSub:     'Bu sayfada font ve ışın aktif',
    statusOn:      'Aktif',
    statusOff:     'Pasif',
    featuresLabel: 'Neler yapıyor',
    feat1:         'Tüm metinlerde OpenDyslexic fontu',
    feat2:         'Okuma ışını imlecinizi izler',
    feat3:         'Geniş harf & satır aralığı',
    footerText:    'Her sayfada rahat oku.',
  },
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = { enabled: false, theme: 'light', lang: 'en' };

// ─── DOM ──────────────────────────────────────────────────────────────────────
const body       = document.body;
const mainToggle = document.getElementById('mainToggle');
const statusPill = document.getElementById('statusPill');
const statusText = statusPill.querySelector('.status-text');
const themeBtn   = document.getElementById('themeToggle');
const langBtn    = document.getElementById('langToggle');
const langLabel  = document.getElementById('langLabel');

// ─── APPLY ────────────────────────────────────────────────────────────────────

function applyTheme(t) {
  body.setAttribute('data-theme', t);
}

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
}

function applyAll() {
  applyTheme(state.theme);
  applyLang(state.lang);
  applyToggleUI(state.enabled);
}

// ─── CONTENT SCRIPT'E MESAJ GÖNDER ───────────────────────────────────────────

async function notifyContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const url = tab.url || '';
  // chrome:// ve benzeri sayfalar inject edilemez
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('about:')    || url.startsWith('edge://')) return;

  const msg = { type: state.enabled ? 'DB_ENABLE' : 'DB_DISABLE' };

  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    // Content script yüklü değilse manuel inject et, sonra mesaj gönder
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
      setTimeout(() => chrome.tabs.sendMessage(tab.id, msg).catch(() => {}), 300);
    } catch (_) {}
  }
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

function save() {
  chrome.storage.local.set({
    enabled: state.enabled,
    theme:   state.theme,
    lang:    state.lang,
  });
  notifyContent();
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

mainToggle.addEventListener('click', () => {
  state.enabled = !state.enabled;
  applyToggleUI(state.enabled);
  save();
});

themeBtn.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  save();
});

langBtn.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'tr' : 'en';
  applyLang(state.lang);
  save();
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
chrome.storage.local.get(['enabled', 'theme', 'lang'], (r) => {
  state.enabled = r.enabled === true; // varsayılan: kapalı (erişilebilirlik tercihi)
  state.theme   = r.theme  || 'light';
  state.lang    = r.lang   || 'en';
  applyAll();
});
