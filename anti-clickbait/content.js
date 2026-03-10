// Anti-Clickbait — content.js
// Pure regex-based headline sanitiser. No external API needed.
// Works on initial DOM load and dynamically injected content via MutationObserver.

(function () {
  'use strict';
  if (window.__antiClickbaitInjected) return;
  window.__antiClickbaitInjected = true;

  // ─── State ─────────────────────────────────────────────────────────────────

  let enabled  = false;
  let mode     = 'full'; // 'case' = only fix ALL-CAPS | 'full' = everything

  // WeakMap: element → { original, cleaned }
  const processed = new WeakMap();

  // ─── Selectors ─────────────────────────────────────────────────────────────

  const HEADING_SEL = 'h1,h2,h3,h4,h5,h6,[role="heading"]';

  // A tag targets: only short-ish anchor texts that look like titles
  // (skip nav links, buttons, long prose sentences)
  const MAX_ANCHOR_LEN = 160;

  // ─── Regex rulebook ────────────────────────────────────────────────────────

  // Emoji range (broad Unicode coverage)
  const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{200D}\u{20D0}-\u{20FF}]/gu;

  // Repeated punctuation: !!! → !  ??? → ?  !?!? → ?  etc.
  const MULTI_EXCL_RE    = /!{2,}/g;
  const MULTI_QUEST_RE   = /\?{2,}/g;
  const MIXED_PUNCT_RE   = /([!?]){2,}/g;

  // Excessive ellipsis: ...... → ...
  const MULTI_DOT_RE     = /\.{4,}/g;

  // ALL-CAPS word: 3+ consecutive uppercase letters (ignore abbreviations ≤ 2 chars)
  const ALL_CAPS_WORD_RE = /\b[A-ZÇĞİÖŞÜÂÎÛÄÖÜ]{3,}\b/g;

  // Clickbait phrase patterns (English + Turkish)
  // We don't remove these — we just convert them to sentence case so they lose
  // their visual punch while keeping the information.
  const CLICKBAIT_UPPERCASE_PHRASES = [
    /\bBREAKING(?: NEWS)?\b/gi,
    /\bEXCLUSIVE\b/gi,
    /\bSHOCKING\b/gi,
    /\bMUST[\s-]?(?:READ|SEE|WATCH)\b/gi,
    /\bYOU WON['']T BELIEVE\b/gi,
    /\bGÜNDEM\b/gi,
    /\bSON DAKİKA\b/gi,
    /\bFLAŞ\b/gi,
    /\bŞOK\b/gi,
    /\bİNANILMAZ\b/gi,
  ];

  // Surrounding noise: stars, pipes, brackets used for decoration
  const DECORATION_RE  = /^\s*[★☆▶◀■●•|>\-–—*#]+\s*/g;
  const TAIL_DECO_RE   = /\s*[★☆▶◀■●•|*#]+\s*$/g;

  // Leading "REKLAM", "SPONSORED", "AD:" labels
  const AD_LABEL_RE    = /^\s*(?:REKLAM|SPONSORED|AD|ADVERTISEMENT|TANITIM)\s*[:|-]?\s*/i;

  // ─── Core transform ────────────────────────────────────────────────────────

  /**
   * toSentenceCase: only first character uppercase, rest lowercase-ish.
   * We preserve proper-noun patterns only when they're mixed-case already.
   */
  function toSentenceCase(str) {
    if (!str) return str;
    // Lowercase everything, then capitalise the first letter of the whole string
    // and first letters after sentence-ending punctuation.
    const lower = str
      .replace(ALL_CAPS_WORD_RE, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    // Capitalise first char
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  function sanitise(text) {
    let t = text;

    // 1. Trim decorative symbols at edges
    t = t.replace(DECORATION_RE, '').replace(TAIL_DECO_RE, '');

    // 2. Strip ad labels
    t = t.replace(AD_LABEL_RE, '');

    if (mode === 'full') {
      // 3. Collapse repeated punctuation
      t = t.replace(MULTI_EXCL_RE,  '!');
      t = t.replace(MULTI_QUEST_RE, '?');
      t = t.replace(MIXED_PUNCT_RE, (_, p) => p);
      t = t.replace(MULTI_DOT_RE,   '...');

      // 4. Remove emoji clusters (keep single emoji if present, remove stacks)
      let emojiCount = 0;
      t = t.replace(EMOJI_RE, () => {
        emojiCount++;
        return emojiCount <= 1 ? '' : ''; // strip all emojis in full mode
      });

      // 5. Convert clickbait uppercase phrases to sentence-ish form
      CLICKBAIT_UPPERCASE_PHRASES.forEach(re => {
        t = t.replace(re, m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());
      });
    }

    // 6. ALL-CAPS detection and conversion (both modes)
    // Only apply if the headline is "mostly" uppercase (> 60% uppercase letters)
    const letters    = t.match(/[a-zA-ZÇĞİÖŞÜçğışöüâîûäöü]/g) || [];
    const upperCount = (t.match(/[A-ZÇĞİÖŞÜÂÎÛÄÖÜ]/g) || []).length;
    const upperRatio = letters.length > 0 ? upperCount / letters.length : 0;

    if (upperRatio > 0.60) {
      t = toSentenceCase(t);
    } else {
      // Still fix individual ALL-CAPS words (≥ 3 letters) even if headline is mixed
      t = t.replace(ALL_CAPS_WORD_RE, w =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );
    }

    // 7. Collapse extra whitespace
    t = t.replace(/\s{2,}/g, ' ').trim();

    return t;
  }

  // ─── DOM helpers ──────────────────────────────────────────────────────────

  function shouldProcessAnchor(el) {
    const text = el.textContent.trim();
    // Skip: too short, too long, or looks like nav/button
    if (text.length < 10 || text.length > MAX_ANCHOR_LEN) return false;
    if (el.closest('nav,footer,header,[role="navigation"],[role="menubar"]')) return false;
    return true;
  }

  function processElement(el) {
    if (processed.has(el)) return;

    const original = el.textContent;
    if (!original.trim()) return;

    const cleaned  = sanitise(original);
    if (cleaned === original) return;

    processed.set(el, { original, cleaned });
    el.setAttribute('data-acb-original', original);
    el.textContent = cleaned;
    el.style.transition = 'opacity 0.15s ease';
  }

  function restoreElement(el) {
    const data = processed.get(el);
    if (!data) return;
    el.textContent = data.original;
    el.removeAttribute('data-acb-original');
    processed.delete(el);
  }

  // ─── Scan ─────────────────────────────────────────────────────────────────

  let processedCount = 0;

  function scanAll() {
    processedCount = 0;

    // Headings
    document.querySelectorAll(HEADING_SEL).forEach(el => {
      processElement(el);
      processedCount++;
    });

    // Anchors that look like article titles
    document.querySelectorAll('a').forEach(el => {
      if (shouldProcessAnchor(el)) {
        processElement(el);
        processedCount++;
      }
    });

    // Notify popup
    try {
      chrome.runtime.sendMessage({
        type:  'STATS',
        count: processedCount,
      });
    } catch (_) {}
  }

  function restoreAll() {
    document.querySelectorAll('[data-acb-original]').forEach(el => restoreElement(el));
  }

  // ─── MutationObserver for dynamic content ─────────────────────────────────

  let mutationTimer = null;

  const observer = new MutationObserver(() => {
    if (!enabled) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(scanAll, 300); // debounce
  });

  function startObserving() {
    observer.observe(document.body, {
      childList: true,
      subtree:   true,
    });
  }

  function stopObserving() {
    observer.disconnect();
    clearTimeout(mutationTimer);
  }

  // ─── Enable / Disable ─────────────────────────────────────────────────────

  function enable() {
    enabled = true;
    scanAll();
    startObserving();
  }

  function disable() {
    enabled = false;
    stopObserving();
    restoreAll();
    processedCount = 0;
  }

  // ─── Message handler ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.target !== 'content') return;

    switch (message.type) {
      case 'SET_STATE':
        if (message.mode !== undefined)    mode    = message.mode;
        if (message.enabled !== undefined) {
          message.enabled ? enable() : disable();
        } else if (enabled) {
          // Mode changed while enabled: re-process
          restoreAll();
          scanAll();
        }
        sendResponse({ ok: true, count: processedCount });
        break;

      case 'GET_STATS':
        sendResponse({ ok: true, count: processedCount });
        break;
    }
  });

  // ─── Bootstrap ────────────────────────────────────────────────────────────

  chrome.storage.local.get({ enabled: true, mode: 'full' }, (prefs) => {
    mode = prefs.mode;
    if (prefs.enabled) enable();
  });

})();
