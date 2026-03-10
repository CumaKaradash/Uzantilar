// Reading Mask — content.js
// Injects a full-viewport overlay with a transparent "spotlight" window
// that follows the hovered paragraph. Uses clip-path for smooth GPU-animated
// transitions with zero jank. pointer-events: none so the mask never
// interferes with page interaction.

(function () {
  'use strict';
  if (window.__readingMaskInjected) return;
  window.__readingMaskInjected = true;

  // ─── Opacity levels ──────────────────────────────────────────────────────

  const OPACITY_MAP = {
    light:  0.50,
    medium: 0.72,
    dark:   0.88,
  };

  // ─── State ───────────────────────────────────────────────────────────────

  let enabled    = false;
  let opacity    = OPACITY_MAP.medium;
  let maskColor  = '0,0,0';     // RGB string for the overlay
  let rafId      = null;
  let targetRect = null;        // The paragraph bounding rect we're tracking
  let currentY   = { top: 0, bottom: window.innerHeight }; // animated window
  let animating  = false;

  // ─── Build DOM elements ──────────────────────────────────────────────────

  const overlay = document.createElement('div');
  overlay.id = '__reading-mask-overlay';
  Object.assign(overlay.style, {
    position:       'fixed',
    inset:          '0',
    zIndex:         '2147483646',
    pointerEvents:  'none',
    transition:     'opacity 0.25s ease',
    opacity:        '0',
    willChange:     'clip-path',
  });
  document.documentElement.appendChild(overlay);

  // ─── clip-path helpers ───────────────────────────────────────────────────

  // Creates a clip-path that shows a horizontal band (top..bottom)
  // and masks everything outside it. The band spans full viewport width.
  // We use a polygon path that cuts a rectangular hole in the overlay.
  function makeClipPath(top, bottom) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8; // px padding around the spotlight band
    const t = Math.max(0, top - pad);
    const b = Math.min(vh, bottom + pad);

    // Full rect with a rectangular cutout
    return `polygon(
      0px 0px,
      ${vw}px 0px,
      ${vw}px ${t}px,
      0px ${t}px,
      0px ${b}px,
      ${vw}px ${b}px,
      ${vw}px ${vh}px,
      0px ${vh}px
    )`;
  }

  function applyColor() {
    overlay.style.background = `rgba(${maskColor},${opacity})`;
  }

  // ─── Smooth animation ─────────────────────────────────────────────────────

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animateTo(targetTop, targetBottom) {
    if (animating) return; // already animating, target will be reached naturally
    animating = true;

    function step() {
      const speed = 0.18; // higher = faster catch-up
      currentY.top    = lerp(currentY.top,    targetTop,    speed);
      currentY.bottom = lerp(currentY.bottom, targetBottom, speed);

      overlay.style.clipPath = makeClipPath(currentY.top, currentY.bottom);

      const doneTop    = Math.abs(currentY.top    - targetTop)    < 0.5;
      const doneBottom = Math.abs(currentY.bottom - targetBottom) < 0.5;

      if (doneTop && doneBottom) {
        currentY.top    = targetTop;
        currentY.bottom = targetBottom;
        overlay.style.clipPath = makeClipPath(currentY.top, currentY.bottom);
        animating = false;
      } else {
        rafId = requestAnimationFrame(step);
      }
    }

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(step);
  }

  // ─── Element targeting ────────────────────────────────────────────────────

  // Tags we consider "readable blocks"
  const BLOCK_TAGS = new Set([
    'P','H1','H2','H3','H4','H5','H6',
    'LI','BLOCKQUOTE','TD','TH','FIGCAPTION',
    'ARTICLE','SECTION','PRE','CODE','DT','DD',
    'LABEL','CAPTION','SUMMARY',
  ]);

  function findReadableAncestor(el) {
    let node = el;
    while (node && node !== document.body) {
      if (BLOCK_TAGS.has(node.tagName)) return node;
      node = node.parentElement;
    }
    return null;
  }

  // ─── Mouse tracking ───────────────────────────────────────────────────────

  let lastTarget = null;

  function onMouseMove(e) {
    if (!enabled) return;

    // Find readable element under cursor
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlay) return;

    const readable = findReadableAncestor(el);
    if (readable === lastTarget) return;
    lastTarget = readable;

    if (readable) {
      const rect = readable.getBoundingClientRect();
      animateTo(rect.top, rect.bottom);
    } else {
      // No readable block — spotlight the cursor's horizontal band (~line height)
      const band = 28;
      animateTo(e.clientY - band, e.clientY + band);
    }
  }

  // On scroll: recompute position for same element
  function onScroll() {
    if (!enabled || !lastTarget) return;
    const rect = lastTarget.getBoundingClientRect();
    animateTo(rect.top, rect.bottom);
  }

  // ─── Enable / Disable ─────────────────────────────────────────────────────

  function enable() {
    enabled = true;
    applyColor();
    overlay.style.opacity = '1';
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('scroll',    onScroll,    { passive: true });
  }

  function disable() {
    enabled = false;
    overlay.style.opacity = '0';
    lastTarget = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('scroll',    onScroll);
    cancelAnimationFrame(rafId);
    animating = false;
  }

  // ─── Message handler (from popup / background) ────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.target !== 'content') return;

    switch (message.type) {
      case 'SET_STATE':
        if (message.enabled !== undefined) {
          message.enabled ? enable() : disable();
        }
        if (message.opacity !== undefined) {
          opacity = OPACITY_MAP[message.opacity] ?? OPACITY_MAP.medium;
          applyColor();
        }
        sendResponse({ ok: true });
        break;

      case 'GET_STATE':
        sendResponse({ enabled, ok: true });
        break;
    }
  });

  // ─── Bootstrap from saved prefs ───────────────────────────────────────────

  chrome.storage.local.get({ enabled: false, maskOpacity: 'medium' }, (prefs) => {
    opacity = OPACITY_MAP[prefs.maskOpacity] ?? OPACITY_MAP.medium;
    if (prefs.enabled) enable();
  });

})();
