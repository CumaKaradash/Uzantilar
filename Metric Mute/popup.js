/**
 * Metric Mute — popup.js
 * Handles: main toggle, theme switcher, language switcher, chrome.storage.local sync.
 */

// ─── i18n STRINGS ─────────────────────────────────────────────────────────────
const i18n = {
  en: {
    toggleTitle:     'Hide Metrics',
    toggleSubtitle:  'Numbers on social media',
    statusOn:        'Active',
    statusOff:       'Inactive',
    platformsLabel:  'Supported platforms',
    footerText:      'Focus on content, not numbers.',
  },
  tr: {
    toggleTitle:     'Metrikleri Gizle',
    toggleSubtitle:  'Sosyal medyadaki rakamlar',
    statusOn:        'Aktif',
    statusOff:       'Pasif',
    platformsLabel:  'Desteklenen platformlar',
    footerText:      'İçeriğe odaklan, rakamlara değil.',
  },
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
  enabled: true,
  theme:   'light',
  lang:    'en',
};

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const body        = document.body;
const mainToggle  = document.getElementById('mainToggle');
const statusPill  = document.getElementById('statusPill');
const statusText  = statusPill.querySelector('.status-text');
const themeToggle = document.getElementById('themeToggle');
const langToggle  = document.getElementById('langToggle');
const langLabel   = document.getElementById('langLabel');

// ─── APPLY FUNCTIONS ──────────────────────────────────────────────────────────

function applyTheme(theme) {
  body.setAttribute('data-theme', theme);
}

function applyLang(lang) {
  body.setAttribute('data-lang', lang);
  langLabel.textContent = lang === 'en' ? 'TR' : 'EN'; // show OTHER lang as action label

  const strings = i18n[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (strings[key]) {
      // Status text needs to reflect enabled state too
      if (key === 'statusOn' || key === 'statusOff') return;
      el.textContent = strings[key];
    }
  });

  // Update status text with correct language
  applyToggleUI(state.enabled, lang);
}

function applyToggleUI(enabled, lang = state.lang) {
  const strings = i18n[lang];

  if (enabled) {
    mainToggle.classList.add('active');
    statusPill.classList.remove('off');
    statusText.textContent = strings.statusOn;
    statusText.setAttribute('data-i18n', 'statusOn');
  } else {
    mainToggle.classList.remove('active');
    statusPill.classList.add('off');
    statusText.textContent = strings.statusOff;
    statusText.setAttribute('data-i18n', 'statusOff');
  }
}

function applyState() {
  applyTheme(state.theme);
  applyLang(state.lang);
  applyToggleUI(state.enabled);
}

// ─── SAVE TO STORAGE ─────────────────────────────────────────────────────────

function saveState() {
  chrome.storage.local.set({
    enabled: state.enabled,
    theme:   state.theme,
    lang:    state.lang,
  });
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────

// Main toggle
mainToggle.addEventListener('click', () => {
  state.enabled = !state.enabled;
  applyToggleUI(state.enabled);
  saveState();
});

// Theme toggle
themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  saveState();
});

// Language toggle
langToggle.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'tr' : 'en';
  applyLang(state.lang);
  saveState();
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
// Load saved preferences on popup open

chrome.storage.local.get(['enabled', 'theme', 'lang'], (result) => {
  state.enabled = result.enabled !== false;  // default: true
  state.theme   = result.theme   || 'light'; // default: light
  state.lang    = result.lang    || 'en';    // default: en

  applyState();
});
