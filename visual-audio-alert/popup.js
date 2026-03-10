/**
 * Visual Audio Alert — popup.js
 */

const i18n = {
  en: {
    toggleTitle:  'Visual Flash',
    toggleSub:    'Turn audio into light alerts',
    statusOn:     'Listening…',
    statusOff:    'Inactive',
    sensLabel:    'Sensitivity',
    sensLow:      'Low',
    sensMed:      'Medium',
    sensHigh:     'High',
    sensHintLow:  'Triggers on loud sounds only',
    sensHintMed:  'Triggers on moderate sound',
    sensHintHigh: 'Triggers on quiet sounds',
    legendLabel:  'Flash colors',
    l1:           'Low volume',
    l2:           'Medium volume',
    l3:           'High volume',
    permNote:     'Tab audio permission required when enabling.',
    footerText:   'See every sound. Miss nothing.',
  },
  tr: {
    toggleTitle:  'Görsel Flaş',
    toggleSub:    'Sesi ışık uyarılarına dönüştür',
    statusOn:     'Dinleniyor…',
    statusOff:    'Pasif',
    sensLabel:    'Hassasiyet',
    sensLow:      'Düşük',
    sensMed:      'Orta',
    sensHigh:     'Yüksek',
    sensHintLow:  'Yalnızca yüksek sesler tetikler',
    sensHintMed:  'Orta sesler tetikler',
    sensHintHigh: 'Hafif sesler bile tetikler',
    legendLabel:  'Flaş renkleri',
    l1:           'Düşük ses',
    l2:           'Orta ses',
    l3:           'Yüksek ses',
    permNote:     'Etkinleştirmek için sekme ses izni gerekli.',
    footerText:   'Her sesi gör. Hiçbirini kaçırma.',
  },
};

const SENS_HINTS = {
  low:    { en: 'sensHintLow',  tr: 'sensHintLow'  },
  medium: { en: 'sensHintMed',  tr: 'sensHintMed'  },
  high:   { en: 'sensHintHigh', tr: 'sensHintHigh' },
};

let state = { enabled: false, sensitivity: 'medium', theme: 'light', lang: 'en' };

const body       = document.body;
const mainToggle = document.getElementById('mainToggle');
const statusPill = document.getElementById('statusPill');
const statusText = statusPill.querySelector('.status-text');
const themeBtn   = document.getElementById('themeToggle');
const langBtn    = document.getElementById('langToggle');
const langLabel  = document.getElementById('langLabel');
const sensGroup  = document.getElementById('sensGroup');
const sensBtns   = sensGroup.querySelectorAll('.sens-btn');
const sensHint   = document.getElementById('sensHint');

// ─── APPLY ────────────────────────────────────────────────────────────────────

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
  updateSensHint(state.sensitivity, lang);
}

function applyToggleUI(enabled, lang = state.lang) {
  const s = i18n[lang];
  mainToggle.classList.toggle('active', enabled);
  statusPill.classList.toggle('off', !enabled);
  statusText.textContent = enabled ? s.statusOn : s.statusOff;
  sensGroup.style.opacity       = enabled ? '1'    : '0.5';
  sensGroup.style.pointerEvents = enabled ? 'auto' : 'none';
}

function applySens(sens) {
  sensBtns.forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.sens === sens));
  });
}

function updateSensHint(sens, lang = state.lang) {
  const key = SENS_HINTS[sens]?.[lang] || 'sensHintMed';
  sensHint.textContent = i18n[lang][key] || '';
}

function applyAll() {
  applyTheme(state.theme);
  applyLang(state.lang);
  applyToggleUI(state.enabled);
  applySens(state.sensitivity);
  updateSensHint(state.sensitivity);
}

// ─── BACKGROUND MESAJLARI ─────────────────────────────────────────────────────

function save() {
  chrome.storage.local.set({
    enabled:     state.enabled,
    sensitivity: state.sensitivity,
    theme:       state.theme,
    lang:        state.lang,
  });
}

async function toggle() {
  if (state.enabled) {
    // Kapat
    state.enabled = false;
    applyToggleUI(false);
    save();
    chrome.runtime.sendMessage({ type: 'VAA_DISABLE' });
  } else {
    // Aç
    state.enabled = true;
    applyToggleUI(true);
    save();
    chrome.runtime.sendMessage({
      type:        'VAA_ENABLE',
      sensitivity: state.sensitivity,
    }, (resp) => {
      if (chrome.runtime.lastError) {
        // Hata durumunda geri al
        state.enabled = false;
        applyToggleUI(false);
        save();
      }
    });
  }
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

mainToggle.addEventListener('click', toggle);

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

sensGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.sens-btn');
  if (!btn) return;
  state.sensitivity = btn.dataset.sens;
  applySens(state.sensitivity);
  updateSensHint(state.sensitivity);
  chrome.storage.local.set({ sensitivity: state.sensitivity });
  // Aktif durumdaysa eşiği güncelle
  if (state.enabled) {
    chrome.runtime.sendMessage({ type: 'VAA_SET_SENSITIVITY', sensitivity: state.sensitivity });
  }
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
chrome.storage.local.get(['enabled', 'sensitivity', 'theme', 'lang'], (r) => {
  // Eklenti her açılışta kapalı başlar (tabCapture izni sekme gerektirir)
  state.enabled     = false;
  state.sensitivity = r.sensitivity || 'medium';
  state.theme       = r.theme       || 'light';
  state.lang        = r.lang        || 'en';
  applyAll();
});
