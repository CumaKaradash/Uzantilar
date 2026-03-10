// Privacy Shield — popup.js

// ─── i18n ────────────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    statusOn:  'Protected',
    statusOff: 'Unprotected',
    subOn:     'Trackers are being blocked',
    subOff:    'Tracking is allowed',
    blocking:  'Blocking',
    footnote:  '20 tracker domains blocked via declarativeNetRequest.',
  },
  tr: {
    statusOn:  'Korunuyor',
    statusOff: 'Korumasız',
    subOn:     'İzleyiciler engelleniyor',
    subOff:    'İzlemeye izin veriliyor',
    blocking:  'Engelleniyor',
    footnote:  '20 izleyici domain, declarativeNetRequest ile engelleniyor.',
  }
};

// ─── State ───────────────────────────────────────────────────────────────────

let state = {
  enabled: true,
  lang:    'en',
  theme:   'dark'
};

// ─── DOM refs ────────────────────────────────────────────────────────────────

const body         = document.body;
const btnPower     = document.getElementById('btn-power');
const shieldWrap   = document.getElementById('shield-wrap');
const shieldStatus = document.getElementById('shield-status');
const shieldSub    = document.getElementById('shield-sub');
const btnLang      = document.getElementById('btn-lang');
const langLabel    = document.getElementById('lang-label');
const btnTheme     = document.getElementById('btn-theme');
const iconSun      = document.getElementById('icon-sun');
const iconMoon     = document.getElementById('icon-moon');

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  const t = TRANSLATIONS[state.lang];

  // Theme
  body.className = `theme-${state.theme}`;
  body.classList.toggle('is-disabled', !state.enabled);

  // Theme icon swap
  iconSun.style.display  = state.theme === 'dark'  ? 'block' : 'none';
  iconMoon.style.display = state.theme === 'light' ? 'block' : 'none';

  // Power / shield
  btnPower.classList.toggle('is-on', state.enabled);
  btnPower.classList.toggle('is-off', !state.enabled);
  shieldWrap.classList.toggle('is-on', state.enabled);

  shieldStatus.textContent = state.enabled ? t.statusOn  : t.statusOff;
  shieldStatus.classList.toggle('is-off', !state.enabled);
  shieldSub.textContent    = state.enabled ? t.subOn     : t.subOff;

  // Lang
  langLabel.textContent = state.lang.toUpperCase();

  // i18n all data-i18n elements (except power status which is set above)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    // Skip dynamic status elements already handled
    if (['statusOn','statusOff','subOn','subOff'].includes(key)) return;
    if (t[key]) el.textContent = t[key];
  });

  // Footnote
  const fn = document.querySelector('[data-i18n="footnote"]');
  if (fn) fn.textContent = t.footnote;

  const bl = document.querySelector('[data-i18n="blocking"]');
  if (bl) bl.textContent = t.blocking;
}

// ─── Persist ─────────────────────────────────────────────────────────────────

function saveState() {
  chrome.storage.local.set({
    enabled: state.enabled,
    lang:    state.lang,
    theme:   state.theme
  });
}

// ─── Tell background to toggle ruleset ───────────────────────────────────────

function syncBackground() {
  chrome.runtime.sendMessage(
    { type: 'SET_ENABLED', enabled: state.enabled },
    (resp) => {
      if (chrome.runtime.lastError) {
        console.warn('[Privacy Shield] background unreachable:', chrome.runtime.lastError.message);
      }
    }
  );
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

btnPower.addEventListener('click', () => {
  state.enabled = !state.enabled;
  render();
  saveState();
  syncBackground();
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

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get({ enabled: true, lang: 'en', theme: 'dark' }, (stored) => {
  state = { ...state, ...stored };
  render();
});
