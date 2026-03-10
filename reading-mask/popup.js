// Reading Mask — popup.js

// ─── i18n ────────────────────────────────────────────────────────────────────

const I18N = {
  en: {
    statusOn:    'Active',
    statusOff:   'Inactive',
    maskDensity: 'Mask density',
    dLight:      'Light',
    dMedium:     'Medium',
    dDark:       'Dark',
    hint:        'Hover over paragraphs after activating.',
    langSwitch:  'TR',
  },
  tr: {
    statusOn:    'Aktif',
    statusOff:   'Pasif',
    maskDensity: 'Maske yoğunluğu',
    dLight:      'Hafif',
    dMedium:     'Orta',
    dDark:       'Koyu',
    hint:        'Etkinleştirdikten sonra paragrafların üzerine gelin.',
    langSwitch:  'EN',
  }
};

// ─── State ───────────────────────────────────────────────────────────────────

let state = {
  enabled:     false,
  maskOpacity: 'medium',
  lang:        'en',
  theme:       'dark',
};

// ─── DOM ─────────────────────────────────────────────────────────────────────

const body       = document.body;
const btnPower   = document.getElementById('btn-power');
const powerRing  = document.getElementById('power-ring');
const powerLabel = document.getElementById('power-label');
const btnLang    = document.getElementById('btn-lang');
const langLabel  = document.getElementById('lang-label');
const btnTheme   = document.getElementById('btn-theme');
const iconSun    = document.getElementById('icon-sun');
const iconMoon   = document.getElementById('icon-moon');
const densityBtns = document.querySelectorAll('.density-btn');

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  const t = I18N[state.lang];

  // Body class
  body.className = `theme-${state.theme}${!state.enabled ? ' is-off' : ''}`;

  // Theme icons
  iconSun.style.display  = state.theme === 'dark'  ? 'block' : 'none';
  iconMoon.style.display = state.theme === 'light' ? 'block' : 'none';

  // Lang
  langLabel.textContent = t.langSwitch;

  // Power button
  btnPower.classList.toggle('is-on', state.enabled);
  powerRing.classList.toggle('is-on', state.enabled);
  powerLabel.textContent = state.enabled ? t.statusOn : t.statusOff;
  powerLabel.classList.toggle('is-on', state.enabled);

  // Density buttons
  densityBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === state.maskOpacity);
    const key = 'd' + btn.dataset.value.charAt(0).toUpperCase() + btn.dataset.value.slice(1);
    btn.textContent = t[key] || btn.dataset.value;
  });

  // i18n static text
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    // Skip power-label (handled above)
    if (el === powerLabel) return;
    if (t[key]) el.textContent = t[key];
  });
}

// ─── Persist ─────────────────────────────────────────────────────────────────

function save() {
  chrome.storage.local.set({
    enabled:     state.enabled,
    maskOpacity: state.maskOpacity,
    lang:        state.lang,
    theme:       state.theme,
  });
}

// ─── Send to content script via background ────────────────────────────────────

function syncContent() {
  chrome.runtime.sendMessage({
    target:  'content',
    type:    'SET_STATE',
    enabled: state.enabled,
    opacity: state.maskOpacity,
  }, () => { /* fire-and-forget */ });
}

// ─── Event handlers ───────────────────────────────────────────────────────────

btnPower.addEventListener('click', () => {
  state.enabled = !state.enabled;
  render();
  save();
  syncContent();
});

btnLang.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'tr' : 'en';
  render();
  save();
});

btnTheme.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  render();
  save();
});

densityBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    state.maskOpacity = btn.dataset.value;
    render();
    save();
    syncContent();
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get({
  enabled:     false,
  maskOpacity: 'medium',
  lang:        'en',
  theme:       'dark',
}, (stored) => {
  state = { ...state, ...stored };
  render();
});
