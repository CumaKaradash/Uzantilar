// One-Task Timer — background.js
// The timer source of truth lives here.
// State stored in chrome.storage.local so content scripts and popup can read it.

const ALARM_NAME   = 'one-task-tick';
const TICK_MS      = 1000; // 1-second resolution via alarm + storage timestamp

// ─── Storage schema ───────────────────────────────────────────────────────────
// {
//   task:       string   — task label
//   running:    bool     — is countdown active
//   endTime:    number   — Date.now() ms when timer will hit zero
//   totalSecs:  number   — original duration in seconds
//   lang:       string   — 'en' | 'tr'
//   theme:      string   — 'dark' | 'light'
// }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getState() {
  return new Promise(resolve =>
    chrome.storage.local.get({
      task: '', running: false, endTime: 0, totalSecs: 0, lang: 'en', theme: 'dark'
    }, resolve)
  );
}

// Broadcast current state to ALL tabs so banners update immediately
async function broadcastTick() {
  const state = await getState();
  const remaining = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));

  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type:      'TICK',
        running:   state.running,
        task:      state.task,
        remaining, // seconds left
        totalSecs: state.totalSecs,
        lang:      state.lang,
        theme:     state.theme,
      }).catch(() => {}); // ignore tabs that can't receive messages
    });
  });
}

// ─── Alarm tick handler ───────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const state = await getState();
  if (!state.running) return;

  const remaining = Math.round((state.endTime - Date.now()) / 1000);

  if (remaining <= 0) {
    // Timer expired — stop it
    await chrome.storage.local.set({ running: false });
    chrome.alarms.clear(ALARM_NAME);
  }

  await broadcastTick();
});

// ─── Message handler (from popup) ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {

      case 'START': {
        const endTime = Date.now() + message.durationSecs * 1000;
        await chrome.storage.local.set({
          task:      message.task,
          running:   true,
          endTime,
          totalSecs: message.durationSecs,
        });
        // Create alarm that fires every second
        chrome.alarms.create(ALARM_NAME, {
          delayInMinutes:  1 / 60,       // fire almost immediately
          periodInMinutes: 1 / 60,       // then every ~1 second
        });
        await broadcastTick();
        sendResponse({ ok: true });
        break;
      }

      case 'STOP': {
        await chrome.storage.local.set({ running: false });
        chrome.alarms.clear(ALARM_NAME);
        await broadcastTick();
        sendResponse({ ok: true });
        break;
      }

      case 'GET_STATE': {
        const state = await getState();
        const remaining = state.running
          ? Math.max(0, Math.round((state.endTime - Date.now()) / 1000))
          : 0;
        sendResponse({ ...state, remaining });
        break;
      }

      case 'SET_PREFS': {
        const update = {};
        if (message.lang  !== undefined) update.lang  = message.lang;
        if (message.theme !== undefined) update.theme = message.theme;
        await chrome.storage.local.set(update);
        await broadcastTick();
        sendResponse({ ok: true });
        break;
      }
    }
  })();
  return true; // async
});

// On startup / install restore alarm if timer was running
async function restoreAlarm() {
  const state = await getState();
  if (state.running && state.endTime > Date.now()) {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes:  1 / 60,
      periodInMinutes: 1 / 60,
    });
  } else if (state.running) {
    // was running but expired while browser was closed
    await chrome.storage.local.set({ running: false });
  }
}

chrome.runtime.onInstalled.addListener(restoreAlarm);
chrome.runtime.onStartup.addListener(restoreAlarm);
