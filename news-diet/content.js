// News Diet — content.js
// Applies noise-reduction by toggling a data attribute on <body>.
// All visual rules live in content.css (scoped to [data-news-diet="on"]).
// MutationObserver re-applies attribute after SPA/infinite-scroll DOM resets.

(function () {
  'use strict';
  if (window.__newsDietInjected) return;
  window.__newsDietInjected = true;

  const ATTR      = 'data-news-diet';
  const ATTR_ON   = 'on';
  const ATTR_OFF  = 'off';

  let enabled = false;
  let observer = null;

  // ─── Apply / remove the attribute ─────────────────────────────────────────

  function applyDiet(on) {
    document.body.setAttribute(ATTR, on ? ATTR_ON : ATTR_OFF);
    enabled = on;
  }

  // ─── MutationObserver — defend against SPA body replacement ──────────────

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!enabled) return;
      for (const m of mutations) {
        // If body attr got wiped (rare but happens on SPAs)
        if (
          m.type === 'attributes' &&
          m.attributeName === ATTR &&
          m.target === document.body &&
          document.body.getAttribute(ATTR) !== ATTR_ON
        ) {
          document.body.setAttribute(ATTR, ATTR_ON);
        }
        // New nodes added (infinite scroll) — attribute is already on body,
        // so CSS catches them automatically. Nothing extra needed.
      }
    });

    observer.observe(document.body, {
      childList:  true,
      subtree:    false,
      attributes: true,
      attributeFilter: [ATTR],
    });
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
  }

  // ─── Enable / disable ─────────────────────────────────────────────────────

  function enable() {
    applyDiet(true);
    startObserver();
  }

  function disable() {
    stopObserver();
    applyDiet(false);
  }

  // ─── Message handler (from popup via background) ──────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.target !== 'content') return;

    if (message.type === 'SET_ENABLED') {
      message.enabled ? enable() : disable();
      sendResponse({ ok: true });
    }
  });

  // ─── Bootstrap from saved prefs ───────────────────────────────────────────

  chrome.storage.local.get({ enabled: true }, (prefs) => {
    if (prefs.enabled) enable();
  });

})();
