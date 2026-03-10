// Anti-Clickbait — popup.js

// ─── i18n ─────────────────────────────────────────────────────────────────────

const I18N = {
  en: {
    statusOn:        'Active · calming headlines',
    statusOff:       'Inactive',
    calmedLabel:     ' calmed',
    modeLabel:       'Intensity',
    modeCaseTitle:   'Gentle',
    modeCaseSub:     'Fix ALL-CAPS only',
    modeFullTitle:   'Full',
    modeFullSub:     'Punctuation + emojis + caps',
    rulesLabel:      'Rules active',
    ruleAllCaps:     'ALL-CAPS → Sentence case',
    rulePunct:       '!!! → !  and  ??? → ?',
    ruleEmoji:       'Emoji clusters removed',
    ruleDeco:        'Decorative symbols stripped',
    ruleClickbait:   'BREAKING / SON DAKİKA calmed',
    footnote:        'Reload tab to re-apply after changes.',
    langSwitch:      'TR',
  },
  tr: {
    statusOn:        'Aktif · başlıklar yatıştırılıyor',
    statusOff:       'Pasif',
    calmedLabel:     ' yatıştırıldı',
    modeLabel:       'Şiddet',
    modeCaseTitle:   'Hafif',
    modeCaseSub:     'Yalnızca BÜYÜK HARF düzelt',
    modeFullTitle:   'Tam',
    modeFullSub:     'Noktalama + emoji + büyük harf',
    rulesLabel:      'Aktif kurallar',
    ruleAllCaps:     'BÜYÜK HARF → Cümle harfi',
    rulePunct:       '!!! → !  ve  ??? → ?',
    ruleEmoji:       'Emoji yığınları kaldırılır',
    ruleDeco:        'Dekoratif semboller silinir',
    ruleClickbait:   'SON DAKİKA / BREAKING yatıştırılır',
    footnote:        'Değişiklikler için sekmeyi yenileyin.',
    langSwitch:      'EN',
  }
};

// ─── State ────────────────────────────────────────────────────────────────────

let state = {
  enabled: true,
  mode:    'full',
  lang:    'en',
  theme:   'dark',
};

let calmedCount = 0;

// ─── DOM ─────────────────────────────────────────────────────────────────────

const body         = document.body;
const masterToggle = document.getElementById('master-toggle');
const statusDot    = document.getElementById('status-dot');
const statusText   = document.getElementById('status-text');
const calmedBadge  = document.getElementById('calmed-badge');
const calmedEl     = document.getElementById('calmed-count');
const btnLang      = document.getElementById('btn-lang');
const langLabel    = document.getElementById('lang-label');
const btnTheme     = document.getElementById('btn-theme');
const iconSun      = document.getElementById('icon-sun');
const iconMoon     = document.getElementById('icon-moon');
const modeBtns     = document.querySelectorAll('.mode-btn');

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  const t = I18N[state.lang];

  // Body classes
  body.className = [
    `theme-${state.theme}`,
    !state.enabled ? 'is-off' : '',
    `mode-${state.mode}`,
  ].filter(Boolean).join(' ');

  // Theme icons
  iconSun.style.display  = state.theme === 'dark'  ? 'block' : 'none';
  iconMoon.style.display = state.theme === 'light' ? 'block' : 'none';

  // Lang
  langLabel.textContent = t.langSwitch;

  // Toggle
  masterToggle.checked = state.enabled;

  // Status
  statusText.textContent = state.enabled ? t.statusOn : t.statusOff;
  statusDot.classList.toggle('off', !state.enabled);

  // Calmed badge
  calmedEl.textContent = calmedCount;

  // Mode buttons
  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === state.mode);
  });

  // i18n all elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el === statusText) return; // handled above
    if (t[key] !== undefined) el.textContent = t[key];
  });
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function save() {
  chrome.storage.local.set({
    enabled: state.enabled,
    mode:    state.mode,
    lang:    state.lang,
    theme:   state.theme,
  });
}

// ─── Content sync ─────────────────────────────────────────────────────────────

function syncContent(fields = {}) {
  chrome.runtime.sendMessage({
    target:  'content',
    type:    'SET_STATE',
    enabled: state.enabled,
    mode:    state.mode,
    ...fields,
  }, (resp) => {
    if (resp && resp.count !== undefined) {
      calmedCount = resp.count;
      calmedEl.textContent = calmedCount;
    }
  });
}

function fetchStats() {
  chrome.runtime.sendMessage({
    target: 'content',
    type:   'GET_STATS',
  }, (resp) => {
    if (resp && resp.count !== undefined) {
      calmedCount = resp.count;
      calmedEl.textContent = calmedCount;
    }
  });
}

// ─── Events ───────────────────────────────────────────────────────────────────

masterToggle.addEventListener('change', () => {
  state.enabled = masterToggle.checked;
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

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    state.mode = btn.dataset.value;
    render();
    save();
    syncContent();
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get({
  enabled: true,
  mode:    'full',
  lang:    'en',
  theme:   'dark',
}, (stored) => {
  state = { ...state, ...stored };
  render();
  fetchStats();
});

// Listen for live stat updates from content.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATS' && message.count !== undefined) {
    calmedCount = message.count;
    calmedEl.textContent = calmedCount;
  }
});
