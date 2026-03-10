// Simple New Tab — newtab.js

// ─── i18n ────────────────────────────────────────────────────────────────────

const I18N = {
  en: {
    placeholder: 'What is your focus today?',
    langLabel:   'TR',   // button shows the OTHER language
  },
  tr: {
    placeholder: 'Bugün neye odaklanıyorsun?',
    langLabel:   'EN',
  }
};

// ─── State ───────────────────────────────────────────────────────────────────

let state = {
  theme: 'dark',
  lang:  'en',
  focus: ''
};

// ─── DOM refs ────────────────────────────────────────────────────────────────

const body           = document.getElementById('body');
const focusInput     = document.getElementById('focus-input');
const focusContainer = document.getElementById('focus-container');
const clock          = document.getElementById('clock');
const dateDisplay    = document.getElementById('date-display');
const btnTheme       = document.getElementById('btn-theme');
const btnLang        = document.getElementById('btn-lang');
const langLabel      = document.getElementById('lang-label');
const iconSun        = document.getElementById('icon-sun');
const iconMoon       = document.getElementById('icon-moon');

// ─── Clock ───────────────────────────────────────────────────────────────────

const DAY_NAMES_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_NAMES_TR = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const MON_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MON_NAMES_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

function pad(n) { return String(n).padStart(2, '0'); }

function updateClock() {
  const now  = new Date();
  const h    = pad(now.getHours());
  const m    = pad(now.getMinutes());
  clock.textContent = `${h}:${m}`;

  if (state.lang === 'tr') {
    const day = DAY_NAMES_TR[now.getDay()];
    const mon = MON_NAMES_TR[now.getMonth()];
    dateDisplay.textContent = `${day}, ${now.getDate()} ${mon}`;
  } else {
    const day = DAY_NAMES_EN[now.getDay()];
    const mon = MON_NAMES_EN[now.getMonth()];
    dateDisplay.textContent = `${day}, ${mon} ${now.getDate()}`;
  }
}

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  const t = I18N[state.lang];

  // Theme
  body.className = `theme-${state.theme}`;

  // Theme icons: in dark mode show sun (click → light), in light show moon (click → dark)
  iconSun.style.display  = state.theme === 'dark'  ? 'block' : 'none';
  iconMoon.style.display = state.theme === 'light' ? 'block' : 'none';

  // Lang button shows the alternate language
  langLabel.textContent = t.langLabel;

  // Placeholder
  focusInput.placeholder = t.placeholder;

  // Restore saved focus text
  focusInput.value = state.focus;
  focusContainer.classList.toggle('has-value', state.focus.length > 0);

  // Update clock date format
  updateClock();
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function save(partial) {
  state = { ...state, ...partial };
  chrome.storage.local.set(partial);
}

// ─── Input auto-resize feel (centering) ──────────────────────────────────────

// We use a hidden mirror span to measure text width so the line always
// matches the content width on very long entries.
const mirror = document.createElement('span');
mirror.style.cssText = `
  position: absolute; visibility: hidden; white-space: pre;
  font-family: 'Cormorant Garamond', serif;
  font-weight: 300; font-style: italic;
  font-size: clamp(1.9rem, 4.5vw, 3.6rem);
  letter-spacing: 0.01em; pointer-events: none;
`;
document.body.appendChild(mirror);

// ─── Event Handlers ──────────────────────────────────────────────────────────

// Focus text input
focusInput.addEventListener('input', () => {
  const val = focusInput.value;
  focusContainer.classList.toggle('has-value', val.length > 0);
  save({ focus: val });
});

// Click anywhere on the page to focus input
document.addEventListener('click', (e) => {
  if (!e.target.closest('.ctrl-btn')) {
    focusInput.focus();
  }
});

// Theme toggle
btnTheme.addEventListener('click', (e) => {
  e.stopPropagation();
  save({ theme: state.theme === 'dark' ? 'light' : 'dark' });
  render();
});

// Language toggle
btnLang.addEventListener('click', (e) => {
  e.stopPropagation();
  save({ lang: state.lang === 'en' ? 'tr' : 'en' });
  render();
});

// Prevent Enter from adding a newline (though it's an input, good practice)
focusInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') e.preventDefault();
});

// ─── Clock tick ──────────────────────────────────────────────────────────────

updateClock();
setInterval(updateClock, 10000); // update every 10s is plenty

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get({ theme: 'dark', lang: 'en', focus: '' }, (stored) => {
  state = { ...state, ...stored };
  render();
  // Auto-focus the input after a brief entrance delay
  setTimeout(() => focusInput.focus(), 600);
});
