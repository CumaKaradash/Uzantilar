/**
 * Tremor-Safe Click — popup.js
 * Toggle, boyut seçici, dil, tema ve content.js mesaj iletimi.
 */

// ─── i18n ─────────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    toggleTitle: 'Expand Click Areas',
    toggleSub:   'Larger targets, no layout change',
    statusOn:    'Active',
    statusOff:   'Inactive',
    sizeLabel:   'Expansion size',
    sizeSm:      'Small',
    sizeMd:      'Medium',
    sizeLg:      'Large',
    footerText:  'Every tap counts. Make it easier.',
  },
  tr: {
    toggleTitle: 'Tıklama Alanlarını Genişlet',
    toggleSub:   'Büyük hedefler, düzen bozulmaz',
    statusOn:    'Aktif',
    statusOff:   'Pasif',
    sizeLabel:   'Genişleme boyutu',
    sizeSm:      'Küçük',
    sizeMd:      'Orta',
    sizeLg:      'Büyük',
    footerText:  'Her dokunuş önemli. Kolaylaştır.',
  },
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = { enabled: false, size: 'md', theme: 'light', lang: 'en' };

// ─── DOM ──────────────────────────────────────────────────────────────────────
const body       = document.body;
const mainToggle = document.getElementById('mainToggle');
const statusPill = document.getElementById('statusPill');
const statusText = statusPill.querySelector('.status-text');
const themeBtn   = document.getElementById('themeToggle');
const langBtn    = document.getElementById('langToggle');
const langLabel  = document.getElementById('langLabel');
const sizeGroup  = document.getElementById('sizeGroup');
const sizeBtns   = sizeGroup.querySelectorAll('.size-btn');

// ─── APPLY ────────────────────────────────────────────────────────────────────

function applyTheme(t) {
  body.setAttribute('data-theme', t);
}

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

  // Boyut butonlarını etkin/pasif duruma göre göster
  sizeGroup.style.opacity      = enabled ? '1' : '0.45';
  sizeGroup.style.pointerEvents = enabled ? 'auto' : 'none';
}

function applySize(size) {
  sizeBtns.forEach(btn => {
    const active = btn.dataset.size === size;
    btn.setAttribute('aria-pressed', String(active));
  });
}

function applyAll() {
  applyTheme(state.theme);
  applyLang(state.lang);
  applyToggleUI(state.enabled);
  applySize(state.size);
}

// ─── CONTENT SCRIPT MESAJLARI ─────────────────────────────────────────────────

async function sendToContent(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('about:')    || url.startsWith('edge://')) return;

  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    // Content script yüklü değilse inject et
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
      setTimeout(() => chrome.tabs.sendMessage(tab.id, msg).catch(() => {}), 300);
    } catch (_) {}
  }
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

function save(notify = true) {
  chrome.storage.local.set({
    enabled: state.enabled,
    size:    state.size,
    theme:   state.theme,
    lang:    state.lang,
  });

  if (!notify) return;

  if (state.enabled) {
    sendToContent({ type: 'TS_ENABLE', size: state.size });
  } else {
    sendToContent({ type: 'TS_DISABLE' });
  }
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

mainToggle.addEventListener('click', () => {
  state.enabled = !state.enabled;
  applyToggleUI(state.enabled);
  save();
});

themeBtn.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  save(false); // tema sadece popup'u etkiler, content'e mesaj gönderme
});

langBtn.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'tr' : 'en';
  applyLang(state.lang);
  save(false);
});

// Boyut butonları — seçim değişince content'e anında gönder
sizeGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.size-btn');
  if (!btn) return;

  state.size = btn.dataset.size;
  applySize(state.size);

  // Aktifse boyutu anında güncelle
  if (state.enabled) {
    sendToContent({ type: 'TS_UPDATE_SIZE', size: state.size });
  }
  save(false); // zaten yukarıda gönderdik
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
chrome.storage.local.get(['enabled', 'size', 'theme', 'lang'], (r) => {
  state.enabled = r.enabled === true;
  state.size    = r.size    || 'md';
  state.theme   = r.theme   || 'light';
  state.lang    = r.lang    || 'en';
  applyAll();
});
