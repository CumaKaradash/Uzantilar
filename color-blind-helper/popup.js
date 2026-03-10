// Color Blind Helper — popup.js

// ─── i18n ────────────────────────────────────────────────────────────────────

const I18N = {
  en: {
    statusOff:        'Filter off',
    statusOn:         'Simulating',
    previewLabel:     'Color sample preview',
    filterLabel:      'Vision type',
    typeProtan:       'Protanopia',
    typeProtanDesc:   'Red blind',
    typeDeuteran:     'Deuteranopia',
    typeDeuteranDesc: 'Green blind',
    typeTritan:       'Tritanopia',
    typeTritanDesc:   'Blue blind',
    typeAchroma:      'Achromatopsia',
    typeAchromaDesc:  'No color',
    footnote:         'Matrices from Machado et al. (2009). Zero layout impact.',
    langSwitch:       'TR',
  },
  tr: {
    statusOff:        'Filtre kapalı',
    statusOn:         'Simülasyon aktif',
    previewLabel:     'Renk örneği önizlemesi',
    filterLabel:      'Görme tipi',
    typeProtan:       'Protanopi',
    typeProtanDesc:   'Kırmızı körlüğü',
    typeDeuteran:     'Deuteranopi',
    typeDeuteranDesc: 'Yeşil körlüğü',
    typeTritan:       'Tritanopi',
    typeTritanDesc:   'Mavi körlüğü',
    typeAchroma:      'Akromatopsi',
    typeAchromaDesc:  'Renksizlik',
    footnote:         'Matrisler: Machado ve ark. (2009). Sayfa düzenine sıfır etki.',
    langSwitch:       'EN',
  }
};

// ─── SVG matrices (same as content.js) ───────────────────────────────────────

const MATRICES = {
  protanopia: `0.152286 1.052583 -0.204868 0 0 0.114503 0.786281 0.099216 0 0 -0.003882 -0.048116 1.051998 0 0 0 0 0 1 0`,
  deuteranopia: `0.367322 0.860646 -0.227968 0 0 0.280085 0.672501 0.047413 0 0 -0.011820 0.042940 0.968881 0 0 0 0 0 1 0`,
  tritanopia: `1.255528 -0.076749 -0.178779 0 0 -0.078411 0.930809 0.147602 0 0 0.004733 0.691367 0.303900 0 0 0 0 0 1 0`,
  achromatopsia: `0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0`,
};

// Inject an inline SVG into the popup document for live preview filtering
function injectPopupSVG() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id = 'cbh-popup-svg';
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');

  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');

  Object.entries(MATRICES).forEach(([type, matrix]) => {
    const filter = document.createElementNS('http://www.w3.org/2000/svg','filter');
    filter.id = `popup-${type}`;
    filter.setAttribute('color-interpolation-filters','linearRGB');
    filter.setAttribute('x','0%'); filter.setAttribute('y','0%');
    filter.setAttribute('width','100%'); filter.setAttribute('height','100%');

    const cm = document.createElementNS('http://www.w3.org/2000/svg','feColorMatrix');
    cm.setAttribute('type','matrix');
    cm.setAttribute('values', matrix);
    filter.appendChild(cm);
    defs.appendChild(filter);
  });

  svg.appendChild(defs);
  document.body.appendChild(svg);
}

// ─── State ────────────────────────────────────────────────────────────────────

let state = {
  enabled: false,
  cvdType: 'deuteranopia',
  lang:    'en',
  theme:   'dark',
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const body              = document.body;
const masterToggle      = document.getElementById('master-toggle');
const statusDot         = document.getElementById('status-dot');
const statusText        = document.getElementById('status-text');
const activeFilterLabel = document.getElementById('active-filter-label');
const previewStrip      = document.getElementById('preview-strip');
const btnLang           = document.getElementById('btn-lang');
const langLabel         = document.getElementById('lang-label');
const btnTheme          = document.getElementById('btn-theme');
const iconSun           = document.getElementById('icon-sun');
const iconMoon          = document.getElementById('icon-moon');
const typeCards         = document.querySelectorAll('.type-card');

// ─── Render ───────────────────────────────────────────────────────────────────

const TYPE_LABEL = {
  protanopia:    ['Protanopia',   'Protanopi'],
  deuteranopia:  ['Deuteranopia', 'Deuteranopi'],
  tritanopia:    ['Tritanopia',   'Tritanopi'],
  achromatopsia: ['Achromatopsia','Akromatopsi'],
};

function render() {
  const t   = I18N[state.lang];
  const idx = state.lang === 'en' ? 0 : 1;

  // Body class
  body.className = [
    `theme-${state.theme}`,
    !state.enabled ? 'is-off' : '',
  ].filter(Boolean).join(' ');

  // Icons
  iconSun.style.display  = state.theme === 'dark'  ? 'block' : 'none';
  iconMoon.style.display = state.theme === 'light' ? 'block' : 'none';
  langLabel.textContent  = t.langSwitch;

  // Toggle
  masterToggle.checked = state.enabled;

  // Status
  statusDot.classList.toggle('on', state.enabled);
  statusText.textContent = state.enabled ? t.statusOn : t.statusOff;

  // Active filter badge
  if (state.enabled) {
    activeFilterLabel.textContent = TYPE_LABEL[state.cvdType]?.[idx] ?? state.cvdType;
    activeFilterLabel.classList.add('visible');
  } else {
    activeFilterLabel.classList.remove('visible');
  }

  // Preview strip filter
  previewStrip.setAttribute('data-filter', state.enabled ? state.cvdType : 'none');

  // Type cards
  typeCards.forEach(card => {
    const val = card.dataset.value;
    card.classList.toggle('active', val === state.cvdType);
    // Check the hidden radio
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = (val === state.cvdType);
  });

  // i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el === statusText) return;
    if (t[key] !== undefined) el.textContent = t[key];
  });
}

// ─── Persist + sync ──────────────────────────────────────────────────────────

function save() {
  chrome.storage.local.set({
    enabled: state.enabled,
    cvdType: state.cvdType,
    lang:    state.lang,
    theme:   state.theme,
  });
}

function syncContent() {
  chrome.runtime.sendMessage({
    target:  'content',
    type:    'SET_STATE',
    enabled: state.enabled,
    cvdType: state.cvdType,
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

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

typeCards.forEach(card => {
  card.addEventListener('click', () => {
    state.cvdType = card.dataset.value;
    render();
    save();
    if (state.enabled) syncContent();
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

injectPopupSVG();

chrome.storage.local.get({
  enabled: false,
  cvdType: 'deuteranopia',
  lang:    'en',
  theme:   'dark',
}, (stored) => {
  state = { ...state, ...stored };
  render();
});
