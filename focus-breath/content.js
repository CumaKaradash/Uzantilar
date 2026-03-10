/**
 * Focus Breath — content.js
 *
 * Sorumluluğu:
 *  - Background'dan SHOW_BREATH mesajı gelince overlay'i ekrana koy
 *  - Büyüyüp küçülen nefes dairesi animasyonunu yönet
 *  - "Nefes Al / Nefes Ver" metnini animasyonla senkronize et
 *  - Kapat / Atla butonuyla overlay'i kaldır
 *
 * Tüm stiller JS içinde enjekte edilir — dış CSS bağımlılığı yok.
 */

// Aynı sayfada birden fazla overlay oluşmasını engelle
if (typeof window.__focusBreathLoaded === 'undefined') {
  window.__focusBreathLoaded = true;

  // ─── DİL STRINGLERI ─────────────────────────────────────────────────────────
  const STRINGS = {
    en: {
      breatheIn:  'Breathe In',
      breatheOut: 'Breathe Out',
      hold:       'Hold',
      skip:       'Skip →',
      subtitle:   'Take a moment. You deserve it.',
    },
    tr: {
      breatheIn:  'Nefes Al',
      breatheOut: 'Nefes Ver',
      hold:       'Tut',
      skip:       'Atla →',
      subtitle:   'Bir an dur. Bunu hak ediyorsun.',
    },
  };

  // ─── OVERLAY STİLLERİ ──────────────────────────────────────────────────────
  const CSS = `
    #fb-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      background: rgba(15, 23, 35, 0.82);
      backdrop-filter: blur(12px) saturate(0.7);
      -webkit-backdrop-filter: blur(12px) saturate(0.7);
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: fb-fade-in 0.8s cubic-bezier(0.4,0,0.2,1) forwards;
    }

    @keyframes fb-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* Dış parlama halkası */
    #fb-ring {
      position: relative;
      width: 220px;
      height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 40px;
    }

    #fb-ring::before {
      content: '';
      position: absolute;
      inset: -20px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(134,185,255,0.12) 0%, transparent 70%);
      animation: fb-pulse-ring 4s ease-in-out infinite;
    }

    @keyframes fb-pulse-ring {
      0%, 100% { transform: scale(0.9); opacity: 0.4; }
      50%       { transform: scale(1.1); opacity: 0.9; }
    }

    /* Ana nefes dairesi */
    #fb-circle {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle at 38% 38%,
        rgba(160, 210, 255, 0.9),
        rgba(100, 160, 240, 0.7) 50%,
        rgba(70, 120, 210, 0.5) 100%
      );
      box-shadow:
        0 0 40px rgba(100,160,255,0.4),
        0 0 80px rgba(100,160,255,0.15),
        inset 0 0 30px rgba(255,255,255,0.2);
      animation: fb-breathe 8s ease-in-out infinite;
      transform-origin: center;
    }

    /* 4-4-4 nefes: 4s büyü → 4s tut → 4s küçül → başa dön (toplam 12s yerine 8s kompakt) */
    @keyframes fb-breathe {
      0%   { transform: scale(0.65); opacity: 0.7; }
      38%  { transform: scale(1);    opacity: 1;   }
      50%  { transform: scale(1);    opacity: 1;   }   /* kısa tutma */
      88%  { transform: scale(0.65); opacity: 0.7; }
      100% { transform: scale(0.65); opacity: 0.7; }
    }

    /* Nefes metni */
    #fb-breath-text {
      font-size: 28px;
      font-weight: 300;
      letter-spacing: 2px;
      color: rgba(220, 235, 255, 0.95);
      text-align: center;
      margin-bottom: 10px;
      animation: fb-text-cycle 8s ease-in-out infinite;
      min-height: 40px;
      transition: opacity 0.5s;
    }

    #fb-subtitle {
      font-size: 14px;
      font-weight: 300;
      letter-spacing: 0.5px;
      color: rgba(180, 200, 230, 0.55);
      text-align: center;
      margin-bottom: 48px;
    }

    /* Atla butonu */
    #fb-skip {
      padding: 10px 28px;
      border: 1px solid rgba(180, 200, 255, 0.2);
      border-radius: 999px;
      background: rgba(255,255,255,0.05);
      color: rgba(200, 218, 255, 0.6);
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s;
      font-family: inherit;
    }

    #fb-skip:hover {
      background: rgba(255,255,255,0.12);
      color: rgba(220, 235, 255, 0.95);
      border-color: rgba(180, 200, 255, 0.45);
      transform: translateY(-1px);
    }

    #fb-skip:active {
      transform: translateY(0);
    }

    /* Kapanma animasyonu */
    #fb-overlay.fb-closing {
      animation: fb-fade-out 0.5s cubic-bezier(0.4,0,0.2,1) forwards;
    }

    @keyframes fb-fade-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
  `;

  // ─── OVERLAY OLUŞTUR ──────────────────────────────────────────────────────

  function createOverlay(lang = 'en') {
    // Zaten varsa kaldır
    removeOverlay(false);

    const s = STRINGS[lang] || STRINGS.en;

    // Style enjeksiyonu
    const style = document.createElement('style');
    style.id = 'fb-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    // Overlay elementi
    const overlay = document.createElement('div');
    overlay.id = 'fb-overlay';

    overlay.innerHTML = `
      <div id="fb-ring">
        <div id="fb-circle"></div>
      </div>
      <div id="fb-breath-text">${s.breatheIn}</div>
      <div id="fb-subtitle">${s.subtitle}</div>
      <button id="fb-skip">${s.skip}</button>
    `;

    document.body.appendChild(overlay);

    // ─── NEFES METNİ DÖNGÜSÜ ──────────────────────────────────────────────
    // Animasyon: 0-38% büyü (breathe in), 38-50% tut (hold), 50-88% küçül (breathe out)
    // 8 saniyelik döngüye göre:

    const textEl = overlay.querySelector('#fb-breath-text');
    const CYCLE  = 8000; // ms — CSS animation ile senkron

    function updateBreathText() {
      const phases = [
        { end: 0.38, text: s.breatheIn  },
        { end: 0.50, text: s.hold       },
        { end: 0.88, text: s.breatheOut },
        { end: 1.00, text: s.breatheIn  },
      ];

      const elapsed = (Date.now() % CYCLE) / CYCLE;
      const phase   = phases.find(p => elapsed <= p.end) || phases[0];

      if (textEl.dataset.lastText !== phase.text) {
        textEl.style.opacity = '0';
        setTimeout(() => {
          textEl.textContent      = phase.text;
          textEl.dataset.lastText = phase.text;
          textEl.style.opacity    = '1';
        }, 250);
      }
    }

    const textInterval = setInterval(updateBreathText, 200);
    overlay.dataset.intervalId = textInterval;

    // ─── KAPATMA ─────────────────────────────────────────────────────────
    overlay.querySelector('#fb-skip').addEventListener('click', () => {
      removeOverlay(true);
    });

    // ESC tuşu ile de kapanabilsin
    document._fbKeyHandler = (e) => {
      if (e.key === 'Escape') removeOverlay(true);
    };
    document.addEventListener('keydown', document._fbKeyHandler);
  }

  function removeOverlay(animate = true) {
    const overlay = document.getElementById('fb-overlay');
    if (!overlay) return;

    // Metin döngüsünü durdur
    clearInterval(parseInt(overlay.dataset.intervalId));

    // ESC handler'ı temizle
    if (document._fbKeyHandler) {
      document.removeEventListener('keydown', document._fbKeyHandler);
      delete document._fbKeyHandler;
    }

    if (animate) {
      overlay.classList.add('fb-closing');
      setTimeout(() => {
        overlay.remove();
        document.getElementById('fb-style')?.remove();
      }, 500);
    } else {
      overlay.remove();
      document.getElementById('fb-style')?.remove();
    }
  }

  // ─── BACKGROUND'DAN GELEN MESAJLARI DİNLE ─────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_BREATH') {
      chrome.storage.local.get(['lang'], (result) => {
        createOverlay(result.lang || 'en');
      });
    }

    if (msg.type === 'HIDE_BREATH') {
      removeOverlay(true);
    }
  });
}
