// Local Vault — content.js
// Listens for Ctrl+C (and Cmd+C on Mac) on every page.
// Sends the selected text to background.js for session storage.

(function () {
  'use strict';

  // Avoid double-injecting if content script runs more than once
  if (window.__localVaultInjected) return;
  window.__localVaultInjected = true;

  document.addEventListener('copy', async () => {
    // Small delay to allow the browser to finalize clipboard content
    await new Promise(r => setTimeout(r, 30));

    const selected = window.getSelection()?.toString()?.trim();
    if (!selected) return;

    try {
      chrome.runtime.sendMessage({
        type: 'SAVE_ENTRY',
        text: selected
      });
    } catch (_) {
      // Extension context may be invalid after reload — silently ignore
    }
  });

})();
