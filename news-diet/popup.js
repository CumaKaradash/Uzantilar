// News Diet — popup.js

// ─── i18n ────────────────────────────────────────────────────────────────────

const I18N = {
  en: {
    statusOn:       'Active · diet on',
    statusOff:      'Inactive',
    cleanedTitle:   'Filtered on this page',
    pillSidebar:    'Sidebars',
    pillRelated:    'Related',
    pillTrending:   'Trending',
    pillBreaking:   'Breaking banners',
    pillAds:        'Ads / Sponsored',
    pillNewsletters:'Newsletters',
    pillComments:   'Comments',
    pillHeadlines:  'Headline typography',
    footnote:       'Reload already-open tabs to apply.',
    langSwitch:     'TR',
  },
  tr: {
    statusOn:       'Aktif · diyet açık',
    statusOff:      'Pasif',
    cleanedTitle:   'Bu sayfada filtreler',
    pillSidebar:    'Yan sütunlar',
    pillRelated:    'İlgili haberler',
    pillTrending:   'Gündem',
    pillBreaking:   'Son dakika bantları',
    pillAds:        'Reklamlar',
    pillNewsletters:'Bülten talepleri',
    pillComments:   'Yorumlar',
    pillHeadlines:  'Başlık yazı tipi',
    footnote:       'Açık sekmelere uygulamak için yenileyin.',
    langSwitch:     'EN',
  }
};

// ─── State ────────────────────────────────────────────────────────────────────

let state = {
  enabled: true,
  lang:    'en',
  theme:   'dark',
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const body        = document.body;
const btnPower    = document.getElementById('btn-power');
const powerRing   = document.getElementById('power-ring');
const powerStatus = document.getElementById('power-status');
const btnLang     = document.getElementById('btn-lang');
const langLabel   = document.getElementById('lang-label');
const btnTheme    = document.getElementById('btn-theme');
const iconSun     = document.getElementById('icon-sun');
const iconMoon    = document.getElementById('icon-moon');

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  const t = I18N[state.lang];

  // Theme
  body.className = [
    `theme-${state.theme}`,
    !state.enabled ? 'is-off' : '',
  ].filter(Boolean).join(' ');

  // Theme icons
  iconSun.style.display  = state.theme === 'dark'  ? 'block' : 'none';
  iconMoon.style.display = state.theme === 'light' ? 'block' : 'none';

  // Lang
  langLabel.textContent = t.langSwitch;

  // Power
  btnPower.classList.toggle('is-on', state.enabled);
  powerRing.classList.toggle('is-on', state.enabled);
  powerStatus.textContent = state.enabled ? t.statusOn : t.statusOff;
  powerStatus.classList.toggle('is-on', state.enabled);

  // i18n all elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el === powerStatus) return; // already set above
    if (t[key] !== undefined) el.textContent = t[key];
  });
}

// ─── Persist ─────────────────────────────────────────────────────────────────

function save() {
  chrome.storage.local.set({
    enabled: state.enabled,
    lang:    state.lang,
    theme:   state.theme,
  });
}

// ─── Tell content script ──────────────────────────────────────────────────────

function syncContent() {
  chrome.runtime.sendMessage({
    target:  'content',
    type:    'SET_ENABLED',
    enabled: state.enabled,
  }, () => { /* fire and forget */ });
}

// ─── Events ───────────────────────────────────────────────────────────────────

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

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get({ enabled: true, lang: 'en', theme: 'dark' }, (stored) => {
  state = { ...state, ...stored };
  render();
});
