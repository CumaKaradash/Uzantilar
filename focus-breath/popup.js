/**
 * Focus Breath — popup.js
 * Ana toggle, mola sıklığı, dil, tema, storage sync ve alarm kontrolü.
 */

// ─── i18n ─────────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    enableTitle:   'Focus Mode',
    enableSub:     'Scheduled breathing reminders',
    statusOn:      'Active',
    statusOff:     'Inactive',
    intervalLabel: 'Break frequency',
    testBtn:       'Preview break',
    footerText:    'Breathe. Reset. Continue.',
    footerDev:     'Developed by Cuma Karadaş',
    footerCoffee:  'Buy me a coffee',
  },
  tr: {
    enableTitle:   'Odak Modu',
    enableSub:     'Zamanlanmış nefes hatırlatıcıları',
    statusOn:      'Aktif',
    statusOff:     'Pasif',
    intervalLabel: 'Mola sıklığı',
    testBtn:       'Molayı önizle',
    footerText:    'Nefes al. Sıfırla. Devam et.',
    footerDev:     'Cuma Karadaş tarafından geliştirildi',
    footerCoffee:  'Bir kahve ısmarlayın',
  },
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = { enabled: true, interval: 30, theme: 'light', lang: 'en' };

// ─── DOM ──────────────────────────────────────────────────────────────────────
const body         = document.body;
const mainToggle   = document.getElementById('mainToggle');
const statusPill   = document.getElementById('statusPill');
const statusText   = statusPill.querySelector('.status-text');
const themeToggle  = document.getElementById('themeToggle');
const langToggle   = document.getElementById('langToggle');
const langLabel    = document.getElementById('langLabel');
const intervalGrid = document.getElementById('intervalGrid');
const testBtn      = document.getElementById('testBtn');
const githubBtn    = document.getElementById('githubBtn');
const coffeeBtn    = document.getElementById('coffeeBtn');
const footerText   = document.querySelector('.footer-text');
const coffeeBtnText = coffeeBtn.querySelector('span:last-child') || coffeeBtn;

// ─── APPLY ────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  body.setAttribute('data-theme', theme);
}

function applyLang(lang) {
  body.setAttribute('data-lang', lang);
  langLabel.textContent = lang === 'en' ? 'TR' : 'EN';
  
  // Update footer texts
  const texts = i18n[lang];
  footerText.textContent = texts.footerDev;
  
  // Update coffee button text
  const coffeeSpan = coffeeBtn.querySelector('span');
  if (coffeeSpan) {
    coffeeSpan.textContent = texts.footerCoffee;
  }

  const s = i18n[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key === 'statusOn' || key === 'statusOff') return; // toggle ile birlikte güncellenir
    if (s[key]) el.textContent = s[key];
  });
  applyToggleUI(state.enabled, lang); // status metnini de güncelle
}

function applyToggleUI(enabled, lang = state.lang) {
  const s = i18n[lang];
  if (enabled) {
    mainToggle.classList.add('active');
    statusPill.classList.remove('off');
    statusText.textContent = s.statusOn;
  } else {
    mainToggle.classList.remove('active');
    statusPill.classList.add('off');
    statusText.textContent = s.statusOff;
  }
}

function applyInterval(value) {
  intervalGrid.querySelectorAll('.interval-chip').forEach(chip => {
    chip.classList.toggle('active', parseInt(chip.dataset.value) === parseInt(value));
  });
}

function applyAll() {
  applyTheme(state.theme);
  applyLang(state.lang);
  applyToggleUI(state.enabled);
  applyInterval(state.interval);
}

// ─── SAVE & NOTIFY BACKGROUND ─────────────────────────────────────────────────

function save() {
  chrome.storage.local.set({
    enabled:  state.enabled,
    interval: state.interval,
    theme:    state.theme,
    lang:     state.lang,
  });
  // Background'a alarmı yeniden kurmasını söyle
  chrome.runtime.sendMessage({ type: 'SETUP_ALARM' });
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

mainToggle.addEventListener('click', () => {
  state.enabled = !state.enabled;
  applyToggleUI(state.enabled);
  save();
});

themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  save();
});

langToggle.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'tr' : 'en';
  applyLang(state.lang);
  save();
});

// Interval chip seçimi
intervalGrid.addEventListener('click', (e) => {
  const chip = e.target.closest('.interval-chip');
  if (!chip) return;
  state.interval = parseInt(chip.dataset.value);
  applyInterval(state.interval);
  save();
});

// Önizleme — aktif sekmedeki content.js'e mesaj gönder
testBtn.addEventListener('click', async () => {
  testBtn.style.opacity = '0.5';
  testBtn.style.pointerEvents = 'none';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_BREATH' });
    } catch {
      // Content script yoksa inject et
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      setTimeout(() => chrome.tabs.sendMessage(tab.id, { type: 'SHOW_BREATH' }).catch(() => {}), 400);
    }
  }

  // Popup'ı kapat
  setTimeout(() => window.close(), 300);
});

// Footer button event handlers
githubBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://github.com/cumakaradas' });
});

coffeeBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.buymeacoffee.com/cumakaradas' });
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
chrome.storage.local.get(['enabled', 'interval', 'theme', 'lang'], (result) => {
  state.enabled  = result.enabled  !== false   ? result.enabled  : true;
  state.interval = result.interval || 30;
  state.theme    = result.theme    || 'light';
  state.lang     = result.lang     || 'en';
  applyAll();
});
