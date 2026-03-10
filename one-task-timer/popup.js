// One-Task Timer — popup.js

// ─── i18n ────────────────────────────────────────────────────────────────────

const I18N = {
  en: {
    taskLabel:      'Task',
    durationLabel:  'Duration (min)',
    start:          'Start Focus',
    stop:           'Stop',
    tagline:        'One task. One timer. All tabs.',
    done:           'DONE',
    placeholder:    'What are you working on?',
    langSwitch:     'TR',
  },
  tr: {
    taskLabel:      'Görev',
    durationLabel:  'Süre (dakika)',
    start:          'Odaklanmayı Başlat',
    stop:           'Durdur',
    tagline:        'Bir görev. Bir sayaç. Tüm sekmeler.',
    done:           'BİTTİ',
    placeholder:    'Ne üzerinde çalışıyorsun?',
    langSwitch:     'EN',
  }
};

// ─── State ────────────────────────────────────────────────────────────────────

let state = {
  running:   false,
  task:      '',
  remaining: 0,
  totalSecs: 0,
  lang:      'en',
  theme:     'dark',
};

let tickTimer = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const body          = document.body;
const setupView     = document.getElementById('setup-view');
const activeView    = document.getElementById('active-view');
const taskInput     = document.getElementById('task-input');
const durInput      = document.getElementById('dur-input');
const btnStart      = document.getElementById('btn-start');
const btnStop       = document.getElementById('btn-stop');
const btnLang       = document.getElementById('btn-lang');
const langLabel     = document.getElementById('lang-label');
const btnTheme      = document.getElementById('btn-theme');
const iconSun       = document.getElementById('icon-sun');
const iconMoon      = document.getElementById('icon-moon');
const activeTime    = document.getElementById('active-time');
const activeTask    = document.getElementById('active-task-label');
const ringFill      = document.getElementById('ring-fill');
const quickBtns     = document.querySelectorAll('.quick-btn');

const RING_CIRCUMFERENCE = 213.6; // 2π × 34

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  const t = I18N[state.lang];

  // Theme
  body.className = `theme-${state.theme}`;

  // Icons
  iconSun.style.display  = state.theme === 'dark'  ? 'block' : 'none';
  iconMoon.style.display = state.theme === 'light' ? 'block' : 'none';
  langLabel.textContent  = t.langSwitch;

  // Views
  if (state.running || state.remaining > 0) {
    setupView.style.display  = 'none';
    activeView.style.display = 'flex';
    renderActive();
  } else {
    setupView.style.display  = 'flex';
    activeView.style.display = 'none';
    renderSetup();
  }

  // i18n static text
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // Placeholder
  taskInput.placeholder = t.placeholder;
}

function renderActive() {
  const t = I18N[state.lang];
  const rem  = state.remaining;
  const tot  = state.totalSecs;

  activeTask.textContent = state.task || '—';
  activeTime.textContent = rem > 0 ? fmtTime(rem) : t.done;

  // Ring progress
  const pct    = tot > 0 ? rem / tot : 0;
  const offset = RING_CIRCUMFERENCE * (1 - pct);
  ringFill.style.strokeDashoffset = offset;

  // Urgency classes
  activeView.classList.remove('urgent', 'expired');
  if (rem <= 0) activeView.classList.add('expired');
  else if (rem <= 60) activeView.classList.add('urgent');
}

function renderSetup() {
  // Restore last task text
  if (state.task) taskInput.value = state.task;
}

// ─── Local countdown (smooth between background ticks) ────────────────────────

function startLocalTick() {
  stopLocalTick();
  tickTimer = setInterval(() => {
    if (!state.running) { stopLocalTick(); return; }
    if (state.remaining > 0) {
      state.remaining = Math.max(0, state.remaining - 1);
      renderActive();
    } else {
      state.running = false;
      stopLocalTick();
      renderActive();
    }
  }, 1000);
}

function stopLocalTick() {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
}

// ─── Save prefs ───────────────────────────────────────────────────────────────

function savePrefs() {
  chrome.storage.local.set({ lang: state.lang, theme: state.theme });
  chrome.runtime.sendMessage({ type: 'SET_PREFS', lang: state.lang, theme: state.theme });
}

// ─── Quick-time buttons ───────────────────────────────────────────────────────

quickBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    durInput.value = btn.dataset.mins;
    quickBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

durInput.addEventListener('input', () => {
  quickBtns.forEach(b => b.classList.remove('selected'));
  const v = parseInt(durInput.value, 10);
  quickBtns.forEach(b => {
    if (parseInt(b.dataset.mins, 10) === v) b.classList.add('selected');
  });
});

// ─── Events ───────────────────────────────────────────────────────────────────

btnStart.addEventListener('click', () => {
  const task = taskInput.value.trim();
  const mins = parseInt(durInput.value, 10);
  if (!task || isNaN(mins) || mins < 1) return;

  const durationSecs = mins * 60;
  state.task      = task;
  state.running   = true;
  state.remaining = durationSecs;
  state.totalSecs = durationSecs;

  chrome.runtime.sendMessage({ type: 'START', task, durationSecs }, () => {
    render();
    startLocalTick();
  });
});

btnStop.addEventListener('click', () => {
  state.running   = false;
  state.remaining = 0;
  stopLocalTick();
  chrome.runtime.sendMessage({ type: 'STOP' }, () => render());
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

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.runtime.sendMessage({ type: 'GET_STATE' }, (resp) => {
  if (chrome.runtime.lastError || !resp) return;
  state.running   = resp.running;
  state.task      = resp.task;
  state.remaining = resp.remaining;
  state.totalSecs = resp.totalSecs;
  state.lang      = resp.lang;
  state.theme     = resp.theme;

  render();
  if (state.running) startLocalTick();
});
