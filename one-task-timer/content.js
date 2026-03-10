// One-Task Timer — content.js
// Injects a ultra-thin fixed banner at the very top of every page.
// Banner updates every second via messages from background.js.
// pointer-events allow clicks through to the page, except on the dismiss button.

(function () {
  'use strict';
  if (window.__ottInjected) return;
  window.__ottInjected = true;

  const BANNER_ID = '__ott-banner';
  const FONT_URL  = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap';

  // ─── State ──────────────────────────────────────────────────────────────────

  let visible   = false;
  let dismissed = false; // per-page session dismiss
  let rafId     = null;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function pad(n) { return String(n).padStart(2, '0'); }

  function fmtTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${pad(m)}:${pad(s)}`;
  }

  function urgencyClass(remaining, total) {
    if (remaining <= 0)          return 'ott-expired';
    if (remaining <= 60)         return 'ott-urgent';
    if (remaining <= total * 0.2) return 'ott-warning';
    return 'ott-normal';
  }

  // ─── Build banner ───────────────────────────────────────────────────────────

  function buildBanner() {
    // Font
    if (!document.getElementById('__ott-font')) {
      const link = document.createElement('link');
      link.id   = '__ott-font';
      link.rel  = 'stylesheet';
      link.href = FONT_URL;
      document.head.appendChild(link);
    }

    // Style
    if (!document.getElementById('__ott-style')) {
      const style = document.createElement('style');
      style.id = '__ott-style';
      style.textContent = `
        #__ott-banner {
          all: initial;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          height: 36px !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0 !important;
          box-sizing: border-box !important;
          padding: 0 44px 0 44px !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11.5px !important;
          font-weight: 400 !important;
          letter-spacing: 0.04em !important;
          pointer-events: none !important;
          transition: background 0.6s ease, opacity 0.3s ease !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        }
        #__ott-banner.ott-dark  { background: rgba(14, 15, 20, 0.97) !important; color: rgba(220,225,240,0.9) !important; }
        #__ott-banner.ott-light { background: rgba(248, 248, 250, 0.97) !important; color: rgba(30, 32, 48, 0.88) !important; border-bottom: 1px solid rgba(0,0,0,0.08) !important; }

        #__ott-banner.ott-normal  {}
        #__ott-banner.ott-warning { background: rgba(146, 90, 20, 0.95) !important; color: #fde68a !important; }
        #__ott-banner.ott-urgent  { background: rgba(127, 29, 29, 0.97) !important; color: #fca5a5 !important; animation: __ott-pulse 1s ease-in-out infinite !important; }
        #__ott-banner.ott-expired { background: rgba(127, 29, 29, 0.97) !important; color: #fca5a5 !important; }

        @keyframes __ott-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }

        #__ott-banner.__ott-hidden { opacity: 0 !important; pointer-events: none !important; }

        .__ott-label {
          font-size: 9px !important;
          font-weight: 600 !important;
          letter-spacing: 0.12em !important;
          text-transform: uppercase !important;
          opacity: 0.5 !important;
          margin-right: 8px !important;
        }
        .__ott-task {
          flex: 1 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          max-width: 60% !important;
          text-align: center !important;
        }
        .__ott-divider {
          opacity: 0.2 !important;
          margin: 0 12px !important;
          font-size: 10px !important;
        }
        .__ott-time {
          font-weight: 600 !important;
          letter-spacing: 0.08em !important;
          font-size: 12.5px !important;
          flex-shrink: 0 !important;
        }
        .__ott-progress {
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          height: 2px !important;
          background: currentColor !important;
          opacity: 0.35 !important;
          transition: width 0.9s linear !important;
          pointer-events: none !important;
        }
        .__ott-close {
          all: unset !important;
          position: absolute !important;
          right: 12px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          width: 20px !important;
          height: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          opacity: 0.3 !important;
          cursor: pointer !important;
          pointer-events: all !important;
          border-radius: 4px !important;
          font-size: 14px !important;
          transition: opacity 0.15s ease !important;
          line-height: 1 !important;
          color: inherit !important;
        }
        .__ott-close:hover { opacity: 0.75 !important; }

        /* Push body content down so banner doesn't overlap */
        body.__ott-pushed { padding-top: 36px !important; margin-top: 0 !important; }
      `;
      document.head.appendChild(style);
    }

    // Banner element
    const banner = document.createElement('div');
    banner.id = BANNER_ID;

    banner.innerHTML = `
      <span class="__ott-label" id="__ott-lbl">FOCUS</span>
      <span class="__ott-task"  id="__ott-task">—</span>
      <span class="__ott-divider">·</span>
      <span class="__ott-time"  id="__ott-time">00:00</span>
      <div  class="__ott-progress" id="__ott-prog" style="width:100%"></div>
      <button class="__ott-close" id="__ott-close" title="Dismiss (this tab)">✕</button>
    `;

    document.documentElement.insertBefore(banner, document.body || document.documentElement.firstChild);

    document.getElementById('__ott-close').addEventListener('click', () => {
      dismissed = true;
      hideBanner();
    });

    return banner;
  }

  function getBanner() {
    return document.getElementById(BANNER_ID) || buildBanner();
  }

  // ─── Show / hide ────────────────────────────────────────────────────────────

  function showBanner(data) {
    if (dismissed) return;
    const banner   = getBanner();
    const taskEl   = document.getElementById('__ott-task');
    const timeEl   = document.getElementById('__ott-time');
    const progEl   = document.getElementById('__ott-prog');
    const lblEl    = document.getElementById('__ott-lbl');

    // Theme
    banner.classList.toggle('ott-dark',  data.theme !== 'light');
    banner.classList.toggle('ott-light', data.theme === 'light');

    // Urgency
    const urg = urgencyClass(data.remaining, data.totalSecs);
    ['ott-normal','ott-warning','ott-urgent','ott-expired'].forEach(c => banner.classList.remove(c));
    banner.classList.add(urg);
    banner.classList.remove('__ott-hidden');

    // Content
    taskEl.textContent = data.task || '—';
    timeEl.textContent = data.remaining > 0 ? fmtTime(data.remaining) : (data.lang === 'tr' ? 'BITTI' : 'DONE');

    // i18n label
    lblEl.textContent = data.lang === 'tr' ? 'GÖREV' : 'FOCUS';

    // Progress bar
    const pct = data.totalSecs > 0
      ? Math.max(0, Math.min(100, (data.remaining / data.totalSecs) * 100))
      : 0;
    progEl.style.width = pct + '%';

    // Push body
    document.body.classList.add('__ott-pushed');
    visible = true;
  }

  function hideBanner() {
    const banner = document.getElementById(BANNER_ID);
    if (banner) banner.classList.add('__ott-hidden');
    document.body.classList.remove('__ott-pushed');
    visible = false;
  }

  // ─── Message listener ───────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== 'TICK') return;

    if (!message.running) {
      hideBanner();
      return;
    }

    showBanner(message);
  });

  // ─── Bootstrap: ask background for current state ─────────────────────────────

  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
    if (chrome.runtime.lastError || !state) return;
    if (state.running) showBanner(state);
  });

})();
