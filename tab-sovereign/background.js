// Tab Sovereign — background.js (Manifest V3 Service Worker)

const ALARM_NAME = 'tab-sovereign-check';
const CHECK_INTERVAL_MINUTES = 1; // Check every minute

// Default settings
const DEFAULTS = {
  enabled: true,
  timeoutMinutes: 30,
  lang: 'en',
  theme: 'dark'
};

// In-memory map: tabId -> lastActiveTimestamp (ms)
let tabActivity = {};

// ─── Initialization ─────────────────────────────────────────────────────────

async function init() {
  // Populate initial tab activity timestamps
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  tabs.forEach(tab => {
    if (!tabActivity[tab.id]) {
      tabActivity[tab.id] = now;
    }
  });

  // Set up recurring alarm
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: CHECK_INTERVAL_MINUTES,
      periodInMinutes: CHECK_INTERVAL_MINUTES
    });
  }
}

// ─── Tab Event Listeners ─────────────────────────────────────────────────────

// Mark a tab as active right now
function markActive(tabId) {
  tabActivity[tabId] = Date.now();
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  markActive(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // If the tab finished loading or started playing audio, refresh timestamp
  if (changeInfo.status === 'complete' || changeInfo.audible === true) {
    markActive(tabId);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  tabActivity[tab.id] = Date.now();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabActivity[tabId];
});

// ─── Alarm Handler ───────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const settings = await getSettings();
  if (!settings.enabled) return;

  const timeoutMs = settings.timeoutMinutes * 60 * 1000;
  const now = Date.now();

  const tabs = await chrome.tabs.query({});

  // Find the currently active tab in the focused window
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTabId = activeTab ? activeTab.id : null;

  for (const tab of tabs) {
    // Skip: active tab
    if (tab.id === activeTabId || tab.active) continue;

    // Skip: pinned tabs
    if (tab.pinned) continue;

    // Skip: tabs playing audio
    if (tab.audible) continue;

    // Skip: already discarded
    if (tab.discarded) continue;

    // Skip: chrome:// and extension pages
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;

    const lastActive = tabActivity[tab.id] || now;
    const inactiveMs = now - lastActive;

    if (inactiveMs >= timeoutMs) {
      try {
        await chrome.tabs.discard(tab.id);
        console.log(`[Tab Sovereign] Discarded tab ${tab.id}: "${tab.title}" (inactive ${Math.round(inactiveMs / 60000)} min)`);
      } catch (err) {
        console.warn(`[Tab Sovereign] Could not discard tab ${tab.id}:`, err.message);
      }
    }
  }
});

// ─── Settings Helper ─────────────────────────────────────────────────────────

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULTS, (result) => {
      resolve(result);
    });
  });
}

// ─── Message Listener (from popup) ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STATS') {
    chrome.tabs.query({}, (tabs) => {
      const total = tabs.length;
      const discarded = tabs.filter(t => t.discarded).length;
      const active = tabs.filter(t => t.active).length;
      sendResponse({ total, discarded, active, sleeping: discarded });
    });
    return true; // async
  }

  if (message.type === 'RESET_ALARM') {
    chrome.alarms.clear(ALARM_NAME, () => {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: CHECK_INTERVAL_MINUTES,
        periodInMinutes: CHECK_INTERVAL_MINUTES
      });
      sendResponse({ ok: true });
    });
    return true;
  }
});

// ─── Boot ────────────────────────────────────────────────────────────────────

init();
