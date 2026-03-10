// Privacy Shield — background.js (Manifest V3 Service Worker)

const STATIC_RULESET_ID = 'tracker_rules';

// ─── Enable / Disable static ruleset ────────────────────────────────────────

async function setShieldEnabled(enabled) {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds:  enabled ? [STATIC_RULESET_ID] : [],
      disableRulesetIds: enabled ? [] : [STATIC_RULESET_ID]
    });
    console.log(`[Privacy Shield] Ruleset ${enabled ? 'ENABLED' : 'DISABLED'}`);
  } catch (err) {
    console.error('[Privacy Shield] Failed to update ruleset:', err);
  }
}

// ─── Message listener (from popup) ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SET_ENABLED') {
    setShieldEnabled(message.enabled).then(() => {
      sendResponse({ ok: true });
    });
    return true; // keep channel open for async response
  }

  if (message.type === 'GET_STATUS') {
    chrome.declarativeNetRequest.getEnabledRulesets((rulesets) => {
      sendResponse({ enabled: rulesets.includes(STATIC_RULESET_ID) });
    });
    return true;
  }
});

// ─── On install: apply saved state ──────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    setShieldEnabled(enabled);
  });
});

// ─── On startup: re-apply saved state ───────────────────────────────────────

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    setShieldEnabled(enabled);
  });
});
