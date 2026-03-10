/**
 * Ssh! Search — popup.js
 * Toggle, dil, tema, storage sync ve content.js'e mesaj iletimi.
 */

// ─── i18n ─────────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    toggleTitle:  'Clean Search',
    toggleSub:    'Hide ads & AI noise',
    statusOn:     'Active',
    statusOff:    'Inactive',
    filtersLabel: 'Filtered out',
    f1:           'Sponsored ads',
    f2:           'AI Overview / Copilot',
    f3:           'People Also Ask & noise',
    f4:           'Shopping carousels',
    footerText:   'Just the results you came for.',
  },
  tr: {
    toggleTitle:  'Temiz Arama',
    toggleSub:    'Reklam ve AI gürültüsünü gizle',
    statusOn:     'Aktif',
    statusOff:    'Pasif',
    filtersLabel: 'Filtrelenenler',
    f1:           'Sponsorlu reklamlar',
    f2:           'AI Özeti / Copilot',
    f3:           '"Bunları da sordu" ve gürültü',
    f4:           'Alışveriş karuselları',
    footerText:   'Sadece aradığın sonuçlar.',
  },
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = { enabled: true, theme: 'light', lang: 'en' };

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

// ─── SAVE + NOTIFY CONTENT SCRIPT ────────────────────────────────────────────

async function save() {
  chrome.storage.local.set({
    enabled: state.enabled,
    theme:   state.theme,
    lang:    state.lang,
  });

  // Aktif sekmedeki content.js'e toggle mesajı gönder
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const url = tab.url || '';
  const isSearchPage = url.includes('google.com/search') ||
                       url.includes('bing.com/search');
  if (!isSearchPage) return;

  chrome.tabs.sendMessage(tab.id, {
    type: state.enabled ? 'SSH_ENABLE' : 'SSH_DISABLE',
  }).catch(() => {
    // Content script yüklü değilse inject et
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files:  ['content.js'],
    });
  });
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
  state.enabled = r.enabled !== false;
  state.theme   = r.theme   || 'light';
  state.lang    = r.lang    || 'en';
  applyAll();
});
