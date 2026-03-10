/**
 * Static World — popup.js
 */

const i18n = {
  en: {
    toggleTitle: 'Freeze All Motion',
    toggleSub:   'Stop animations, videos & GIFs',
    statusOn:    'Active — Page is frozen',
    statusOff:   'Inactive',
    frozenLabel: 'What gets frozen',
    f1: 'CSS animations & transitions',
    f2: 'Videos & audio (auto-paused)',
    f3: 'Animated GIFs (first frame only)',
    f4: 'Marquees & SVG animations',
    footerText: 'Calm web. Clear mind.',
  },
  tr: {
    toggleTitle: 'Tüm Hareketi Dondur',
    toggleSub:   'Animasyon, video ve GIF\'leri durdur',
    statusOn:    'Aktif — Sayfa donduruldu',
    statusOff:   'Pasif',
    frozenLabel: 'Neler dondurulur',
    f1: 'CSS animasyonları ve geçişler',
    f2: 'Videolar ve sesler (otomatik duraklatılır)',
    f3: 'Hareketli GIF\'ler (ilk kare gösterilir)',
    f4: 'Marquee ve SVG animasyonları',
    footerText: 'Sakin web. Net zihin.',
  },
};

let state = { enabled: false, theme: 'light', lang: 'en' };

const body       = document.body;
const mainToggle = document.getElementById('mainToggle');
const statusPill = document.getElementById('statusPill');
const statusText = statusPill.querySelector('.status-text');
const themeBtn   = document.getElementById('themeToggle');
const langBtn    = document.getElementById('langToggle');
const langLabel  = document.getElementById('langLabel');

function applyTheme(t) { body.setAttribute('data-theme', t); }

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

async function notifyContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('about:')    || url.startsWith('edge://')) return;

  const msg = { type: state.enabled ? 'SW_ENABLE' : 'SW_DISABLE' };
  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
      setTimeout(() => chrome.tabs.sendMessage(tab.id, msg).catch(() => {}), 300);
    } catch (_) {}
  }
}

function save() {
  chrome.storage.local.set({ enabled: state.enabled, theme: state.theme, lang: state.lang });
  notifyContent();
}

mainToggle.addEventListener('click', () => {
  state.enabled = !state.enabled;
  applyToggleUI(state.enabled);
  save();
});

themeBtn.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  chrome.storage.local.set({ theme: state.theme });
});

langBtn.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'tr' : 'en';
  applyLang(state.lang);
  chrome.storage.local.set({ lang: state.lang });
});

chrome.storage.local.get(['enabled', 'theme', 'lang'], (r) => {
  state.enabled = r.enabled === true;
  state.theme   = r.theme   || 'light';
  state.lang    = r.lang    || 'en';
  applyAll();
});
