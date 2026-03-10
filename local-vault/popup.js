// Local Vault — popup.js

// ─── i18n ────────────────────────────────────────────────────────────────────

const I18N = {
  en: {
    statusOn:    'Vault active · capturing',
    statusOff:   'Vault paused',
    emptyHint:   'Copy text anywhere to save it here.',
    sessionNote: '🔒 Cleared on exit · RAM only',
    clearAll:    'Clear all',
    copied:      'Copied!',
    cleared:     'Vault cleared',
    langSwitch:  'TR',
  },
  tr: {
    statusOn:    'Kasa aktif · kaydediyor',
    statusOff:   'Kasa duraklatıldı',
    emptyHint:   'Herhangi bir yerden metin kopyalayın.',
    sessionNote: '🔒 Çıkışta silinir · Yalnızca RAM',
    clearAll:    'Tümünü sil',
    copied:      'Kopyalandı!',
    cleared:     'Kasa temizlendi',
    langSwitch:  'EN',
  }
};

// ─── State ───────────────────────────────────────────────────────────────────

let state = {
  enabled: true,
  lang:    'en',
  theme:   'dark',
};

let entries = [];

// ─── DOM refs ────────────────────────────────────────────────────────────────

const body          = document.body;
const masterToggle  = document.getElementById('master-toggle');
const btnLang       = document.getElementById('btn-lang');
const langLabel     = document.getElementById('lang-label');
const btnTheme      = document.getElementById('btn-theme');
const iconSun       = document.getElementById('icon-sun');
const iconMoon      = document.getElementById('icon-moon');
const statusDot     = document.getElementById('status-dot');
const statusText    = document.getElementById('status-text');
const countBadge    = document.getElementById('count-badge');
const entryList     = document.getElementById('entry-list');
const emptyState    = document.getElementById('empty-state');
const btnClear      = document.getElementById('btn-clear');
const toast         = document.getElementById('toast');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function timeAgoTR(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)  return 'az önce';
  if (s < 60) return `${s}sn önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  return `${h}sa önce`;
}

let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function msg(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, (resp) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(resp);
    });
  });
}

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  const t = I18N[state.lang];

  // Theme
  body.className = `theme-${state.theme}${!state.enabled ? ' is-disabled' : ''}`;

  // Theme icons
  iconSun.style.display  = state.theme === 'dark'  ? 'block' : 'none';
  iconMoon.style.display = state.theme === 'light' ? 'block' : 'none';

  // Lang button
  langLabel.textContent  = t.langSwitch;

  // Master toggle
  masterToggle.checked = state.enabled;

  // Status bar
  statusText.textContent = state.enabled ? t.statusOn : t.statusOff;
  statusDot.classList.toggle('off', !state.enabled);

  // i18n static strings
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined && el !== statusText) el.textContent = t[key];
  });

  // Entries
  renderEntries();
}

function renderEntries() {
  const t = I18N[state.lang];
  const ago = state.lang === 'tr' ? timeAgoTR : timeAgo;

  countBadge.textContent = entries.length;

  if (entries.length === 0) {
    emptyState.style.display = 'flex';
    entryList.style.display  = 'none';
    emptyState.querySelector('p').textContent = t.emptyHint;
    return;
  }

  emptyState.style.display = 'none';
  entryList.style.display  = 'block';
  entryList.innerHTML = '';

  entries.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'entry-item';
    li.dataset.id = entry.id;

    li.innerHTML = `
      <div class="entry-body">
        <div class="entry-text">${escHtml(entry.preview)}${entry.text.length > 120 ? '…' : ''}</div>
        <div class="entry-meta">${escHtml(ago(entry.timestamp))} · ${entry.text.length} chars</div>
      </div>
      <div class="entry-actions">
        <button class="entry-btn copy-btn" title="Copy" data-id="${entry.id}">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="entry-btn delete delete-btn" title="Delete" data-id="${entry.id}">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5l.5-9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;

    // Click row → copy
    li.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) return;
      copyEntry(entry, li);
    });

    // Delete button
    li.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await msg('DELETE_ENTRY', { id: entry.id });
      entries = entries.filter(en => en.id !== entry.id);
      renderEntries();
    });

    entryList.appendChild(li);
  });
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function copyEntry(entry, li) {
  try {
    await navigator.clipboard.writeText(entry.text);
    li.classList.add('copied');
    setTimeout(() => li.classList.remove('copied'), 800);
    showToast(I18N[state.lang].copied);
  } catch {
    // Fallback for strict clipboard policies
    const ta = document.createElement('textarea');
    ta.value = entry.text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(I18N[state.lang].copied);
  }
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function savePrefs() {
  chrome.storage.local.set({
    enabled: state.enabled,
    lang:    state.lang,
    theme:   state.theme
  });
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

masterToggle.addEventListener('change', () => {
  state.enabled = masterToggle.checked;
  render();
  savePrefs();
});

btnLang.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'tr' : 'en';
  render();
  savePrefs();
});

btnTheme.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  render();
  savePrefs();
});

btnClear.addEventListener('click', async () => {
  await msg('CLEAR_ALL');
  entries = [];
  renderEntries();
  showToast(I18N[state.lang].cleared);
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load persisted prefs (NOT entry data — that lives in session storage)
  const prefs = await new Promise(resolve =>
    chrome.storage.local.get({ enabled: true, lang: 'en', theme: 'dark' }, resolve)
  );
  state = { ...state, ...prefs };

  // Load entries from session (background service worker)
  const resp = await msg('GET_ENTRIES');
  entries = resp?.entries || [];

  render();
}

init();

// Refresh entries every 2s while popup is open (catches background captures)
setInterval(async () => {
  const resp = await msg('GET_ENTRIES');
  if (!resp) return;
  const newEntries = resp.entries || [];
  if (JSON.stringify(newEntries.map(e => e.id)) !== JSON.stringify(entries.map(e => e.id))) {
    entries = newEntries;
    renderEntries();
  }
}, 2000);
