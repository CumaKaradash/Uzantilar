// Color Blind Helper — content.js
// Injects a hidden <svg> with feColorMatrix filters for each CVD type.
// Applies filter via CSS on <html> element — zero layout impact.
// All matrices are derived from the Machado et al. (2009) simulation model.

(function () {
  'use strict';
  if (window.__cbhInjected) return;
  window.__cbhInjected = true;

  // ─── SVG Filter IDs ────────────────────────────────────────────────────────

  const FILTER_ID = {
    none:         null,
    protanopia:   'cbh-protanopia',
    deuteranopia: 'cbh-deuteranopia',
    tritanopia:   'cbh-tritanopia',
    achromatopsia:'cbh-achromatopsia',
  };

  // ─── Color Matrices ────────────────────────────────────────────────────────
  // Format: [R→R, G→R, B→R, A→R, +R,  R→G, G→G, B→G, A→G, +G,  R→B, G→B, B→B, A→B, +B,  0,0,0,1,0]
  // Machado et al. 2009 — severity 1.0 (full simulation)

  const MATRICES = {
    // Protanopia — red cone absent (confuses red/green; red appears dark olive/brown)
    protanopia: `
      0.152286 1.052583 -0.204868 0 0
      0.114503 0.786281  0.099216 0 0
     -0.003882 -0.048116  1.051998 0 0
      0        0         0        1 0`,

    // Deuteranopia — green cone absent (most common; green/red confusion)
    deuteranopia: `
      0.367322  0.860646 -0.227968 0 0
      0.280085  0.672501  0.047413 0 0
     -0.011820  0.042940  0.968881 0 0
      0         0         0        1 0`,

    // Tritanopia — blue cone absent (blue/yellow confusion)
    tritanopia: `
      1.255528 -0.076749 -0.178779 0 0
     -0.078411  0.930809  0.147602 0 0
      0.004733  0.691367  0.303900 0 0
      0         0         0        1 0`,

    // Achromatopsia — complete color blindness (rod monochromacy, grayscale)
    achromatopsia: `
      0.299 0.587 0.114 0 0
      0.299 0.587 0.114 0 0
      0.299 0.587 0.114 0 0
      0     0     0     1 0`,
  };

  // ─── SVG Injection ─────────────────────────────────────────────────────────

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function buildSVG() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.id = '__cbh-filters';
    svg.setAttribute('xmlns', SVG_NS);
    svg.style.cssText = `
      position: absolute !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
      opacity: 0 !important;
    `;
    svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(SVG_NS, 'defs');

    Object.entries(MATRICES).forEach(([type, matrix]) => {
      const filter = document.createElementNS(SVG_NS, 'filter');
      filter.id = FILTER_ID[type];
      filter.setAttribute('color-interpolation-filters', 'linearRGB');
      // x/y/width/height = cover full element area
      filter.setAttribute('x', '0%');
      filter.setAttribute('y', '0%');
      filter.setAttribute('width', '100%');
      filter.setAttribute('height', '100%');

      const cm = document.createElementNS(SVG_NS, 'feColorMatrix');
      cm.setAttribute('type', 'matrix');
      cm.setAttribute('values', matrix.trim().replace(/\n\s+/g, ' '));

      filter.appendChild(cm);
      defs.appendChild(filter);
    });

    svg.appendChild(defs);
    return svg;
  }

  function ensureSVG() {
    if (!document.getElementById('__cbh-filters')) {
      const svg = buildSVG();
      // Append to body — safest location across all sites
      (document.body || document.documentElement).appendChild(svg);
    }
  }

  // ─── Filter Application ────────────────────────────────────────────────────

  const ROOT = document.documentElement; // apply to <html> — no layout impact

  function applyFilter(type) {
    ensureSVG();
    const id = FILTER_ID[type];
    if (id) {
      ROOT.style.setProperty('filter', `url(#${id})`, 'important');
    } else {
      ROOT.style.removeProperty('filter');
    }
  }

  function removeFilter() {
    ROOT.style.removeProperty('filter');
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  let enabled = false;
  let cvdType = 'deuteranopia';

  function syncState() {
    if (enabled) {
      applyFilter(cvdType);
    } else {
      removeFilter();
    }
  }

  // ─── Message Handler ───────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.target !== 'content') return;

    if (message.type === 'SET_STATE') {
      if (message.enabled !== undefined) enabled = message.enabled;
      if (message.cvdType !== undefined) cvdType  = message.cvdType;
      syncState();
      sendResponse({ ok: true });
    }
  });

  // ─── Bootstrap ─────────────────────────────────────────────────────────────

  chrome.storage.local.get({ enabled: false, cvdType: 'deuteranopia' }, (prefs) => {
    enabled = prefs.enabled;
    cvdType = prefs.cvdType;
    syncState();
  });

  // Re-inject SVG if a SPA nukes the DOM (body replacement)
  const bodyObserver = new MutationObserver(() => {
    if (enabled && !document.getElementById('__cbh-filters')) {
      ensureSVG();
      ROOT.style.setProperty('filter', `url(#${FILTER_ID[cvdType]})`, 'important');
    }
  });

  bodyObserver.observe(document.documentElement, {
    childList: true,
    subtree: false,
  });

})();
