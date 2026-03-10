// Tab Sovereign — popup.js

// ─── i18n ────────────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    statusOn:     'Active',
    statusOff:    'Inactive',
    statTotal:    'Total',
    statSleeping: 'Sleeping',
    statActive:   'Active',
    labelTimeout: 'Sleep after',
    opt15:        '15 min',
    opt30:        '30 min',
    opt60:        '1 hour',
    footnote:     'Pinned & audio tabs are never slept.',
  },
  tr: {
    statusOn:     'Aktif',
    statusOff:    'Pasif',
    statTotal:    'Toplam',
    statSleeping: 'Uyuyan',
    statActive:   'Açık',
    labelTimeout: 'Uyutma süresi',
    opt15:        '15 dk',
    opt30:        '30 dk',
    opt60:        '1 saat',
    footnote:     'İğneli & sesli sekmeler uyutulmaz.',
  }
};

// ─── State ───────────────────────────────────────────────────────────────────

let state = {
  enabled: true,
  timeoutMinutes: 30,
  lang: 'en',
  theme: 'dark'
};

// ─── DOM refs ────────────────────────────────────────────────────────────────

const body           = document.body;
const btnPower       = document.getElementById('btn-power');
const powerRing      = document.getElementById('power-ring');
const powerStatus    = document.getElementById('power-status');
const btnLang        = document.getElementById('btn-lang');
const langLabel      = document.getElementById('lang-label');
const btnTheme       = document.getElementById('btn-theme');
const iconSun        = document.getElementById('icon-sun');
const iconMoon       = document.getElementById('icon-moon');
const selectTimeout  = document.getElementById('select-timeout');
const statTotal      = document.getElementById('stat-total');
const statSleeping   = document.getElementById('stat-sleeping');
const statActive     = document.getElementById('stat-active');

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  const t = TRANSLATIONS[state.lang];

  // Theme
  body.className = `theme-${state.theme}`;
  body.classList.toggle('is-disabled', !state.enabled);

  // Theme icons
  if (state.theme === 'dark') {
    iconSun.style.display  = 'block';
    iconMoon.style.display = 'none';
  } else {
    iconSun.style.display  = 'none';
    iconMoon.style.display = 'block';
  }

  // Power button
  btnPower.classList.toggle('is-on', state.enabled);
  powerRing.classList.toggle('is-on', state.enabled);
  powerStatus.textContent = state.enabled ? t.statusOn : t.statusOff;
  powerStatus.classList.toggle('is-on', state.enabled);

  // Lang label
  langLabel.textContent = state.lang.toUpperCase();

  // Timeout select
  selectTimeout.value = String(state.timeoutMinutes);

  // i18n text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });

  // i18n select options
  document.querySelectorAll('[data-i18n-opt]').forEach(el => {
    const key = el.getAttribute('data-i18n-opt');
    if (t[key]) el.textContent = t[key];
  });
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function loadStats() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      statTotal.textContent    = '–';
      statSleeping.textContent = '–';
      statActive.textContent   = '–';
      return;
    }
    statTotal.textContent    = response.total;
    statSleeping.textContent = response.sleeping;
    statActive.textContent   = response.active;
  });
}

// ─── Save ─────────────────────────────────────────────────────────────────────

function saveState() {
  chrome.storage.local.set({
    enabled:        state.enabled,
    timeoutMinutes: state.timeoutMinutes,
    lang:           state.lang,
    theme:          state.theme
  });
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

btnPower.addEventListener('click', () => {
  state.enabled = !state.enabled;
  render();
  saveState();
});

btnLang.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'tr' : 'en';
  render();
  saveState();
});

btnTheme.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  render();
  saveState();
});

selectTimeout.addEventListener('change', () => {
  state.timeoutMinutes = parseInt(selectTimeout.value, 10);
  saveState();
  // Reset alarm so new timeout takes effect immediately
  chrome.runtime.sendMessage({ type: 'RESET_ALARM' });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get({
  enabled:        true,
  timeoutMinutes: 30,
  lang:           'en',
  theme:          'dark'
}, (stored) => {
  state = { ...state, ...stored };
  render();
  loadStats();
});
