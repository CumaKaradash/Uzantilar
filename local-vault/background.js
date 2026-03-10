// Local Vault — background.js (Manifest V3 Service Worker)
// All clipboard entries live in chrome.storage.session (RAM only).
// Chrome clears session storage automatically when the browser closes.

const SESSION_KEY = 'vault_entries';
const MAX_ENTRIES = 50;
const CONTEXT_MENU_ID = 'local-vault-save';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getEntries() {
  return new Promise((resolve) => {
    chrome.storage.session.get({ [SESSION_KEY]: [] }, (result) => {
      resolve(result[SESSION_KEY] || []);
    });
  });
}

async function saveEntry(text) {
  if (!text || !text.trim()) return;

  const trimmed = text.trim();
  let entries = await getEntries();

  // De-duplicate: remove existing identical entry so it bubbles to top
  entries = entries.filter(e => e.text !== trimmed);

  // Prepend new entry
  entries.unshift({
    id:        Date.now(),
    text:      trimmed,
    preview:   trimmed.slice(0, 120),
    timestamp: Date.now()
  });

  // Cap at MAX_ENTRIES
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(0, MAX_ENTRIES);
  }

  await chrome.storage.session.set({ [SESSION_KEY]: entries });
}

async function deleteEntry(id) {
  let entries = await getEntries();
  entries = entries.filter(e => e.id !== id);
  await chrome.storage.session.set({ [SESSION_KEY]: entries });
}

async function clearAll() {
  await chrome.storage.session.set({ [SESSION_KEY]: [] });
}

async function isEnabled() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ enabled: true }, (r) => resolve(r.enabled));
  });
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id:       CONTEXT_MENU_ID,
      title:    'Save to Local Vault',
      contexts: ['selection']
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  if (!(await isEnabled())) return;
  if (info.selectionText) {
    await saveEntry(info.selectionText);
  }
});

// ─── Message Listener (from content.js and popup.js) ─────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {

      case 'SAVE_ENTRY': {
        if (await isEnabled()) {
          await saveEntry(message.text);
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, reason: 'disabled' });
        }
        break;
      }

      case 'GET_ENTRIES': {
        const entries = await getEntries();
        sendResponse({ entries });
        break;
      }

      case 'DELETE_ENTRY': {
        await deleteEntry(message.id);
        sendResponse({ ok: true });
        break;
      }

      case 'CLEAR_ALL': {
        await clearAll();
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ ok: false, reason: 'unknown message type' });
    }
  })();
  return true; // keep message channel open for async
});

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});
