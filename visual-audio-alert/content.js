/**
 * Visual Audio Alert — content.js
 *
 * Background'dan gelen ses sinyallerine göre ekranın kenarlarında
 * ve köşelerinde görsel ışık efekti oluşturur.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * GÖRSEL OVERLAY MİMARİSİ
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Tek bir #vaa-overlay div'i kullanılır:
 *   - position: fixed, inset: 0, z-index: max
 *   - pointer-events: none (tıklamaları engelleme)
 *   - box-shadow: inset ile kenarda parlama
 *   - CSS transition ile yumuşak animasyon
 *
 * Yoğunluk (intensity 0.0–1.0) box-shadow boyutunu ve opaklığını belirler.
 * ════════════════════════════════════════════════════════════════════════════
 */

// ─── GUARD ────────────────────────────────────────────────────────────────────
if (typeof window.__vaaLoaded === 'undefined') {
window.__vaaLoaded = true;

// ─── OVERLAY ELEMENTİ ─────────────────────────────────────────────────────────

const OVERLAY_ID = 'vaa-overlay';

function getOrCreateOverlay() {
  let el = document.getElementById(OVERLAY_ID);
  if (el) return el;

  el = document.createElement('div');
  el.id = OVERLAY_ID;

  Object.assign(el.style, {
    position:      'fixed',
    inset:         '0',
    zIndex:        '2147483647',
    pointerEvents: 'none',
    userSelect:    'none',
    borderRadius:  '0',
    boxSizing:     'border-box',

    // Başlangıç: görünmez
    boxShadow:     'none',
    opacity:       '0',

    // Yumuşak geçiş — ses kesilince yavaşça söner
    transition:    'box-shadow 80ms ease-out, opacity 200ms ease-out',
  });

  // <body> hazır değilse documentElement'e ekle
  (document.body || document.documentElement).appendChild(el);
  return el;
}

// ─── RENK PALETİ ─────────────────────────────────────────────────────────────
/*
 * 3 renk seviyesi — sesin yoğunluğuna göre geçiş yapar:
 *   Düşük  → Soğuk mavi   (hafif uyarı)
 *   Orta   → Turuncu      (dikkat çekici)
 *   Yüksek → Kırmızı      (yüksek ses uyarısı)
 *
 * Bu renkler colorblind-friendly seçilmiştir (kırmızı-yeşil karışıklığı yok).
 */
function getFlashColor(intensity) {
  if (intensity < 0.35) {
    // Düşük: mavi (#2196F3 benzeri, WCAG görünür)
    return `rgba(33, 150, 243, ${0.3 + intensity * 0.6})`;
  } else if (intensity < 0.70) {
    // Orta: turuncu
    return `rgba(255, 152, 0, ${0.35 + intensity * 0.5})`;
  } else {
    // Yüksek: kırmızı
    return `rgba(244, 67, 54, ${0.4 + intensity * 0.45})`;
  }
}

// ─── FLASH UYGULA ─────────────────────────────────────────────────────────────

let fadeOutTimer = null;

function applyFlash(intensity) {
  const overlay = getOrCreateOverlay();
  const color   = getFlashColor(intensity);

  // Yoğunluğa göre box-shadow boyutu (15px–80px)
  const spread = Math.round(15 + intensity * 65);

  // 4 köşe + 4 kenar için inset box-shadow kombinasyonu
  // Her yön için ayrı shadow = tam çerçeve efekti
  const shadow = [
    `inset 0 0 ${spread}px ${Math.round(spread * 0.6)}px ${color}`,
  ].join(', ');

  overlay.style.boxShadow = shadow;
  overlay.style.opacity   = '1';

  // Önceki söndürme zamanlayıcısını iptal et
  if (fadeOutTimer) {
    clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }
}

function clearFlash() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;

  // Kısa gecikme — sesi kesilenler için ani söndürme yerine yumuşak geçiş
  fadeOutTimer = setTimeout(() => {
    overlay.style.boxShadow = 'none';
    overlay.style.opacity   = '0';
    fadeOutTimer = null;
  }, 120);
}

// ─── BACKGROUND MESAJLARI ─────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'VAA_FLASH') {
    applyFlash(msg.intensity ?? 0.5);
  }

  if (msg.type === 'VAA_FLASH_OFF') {
    clearFlash();
  }
});

// ─── TEMIZLIK: SAYFA KAPATILINCA ──────────────────────────────────────────────

window.addEventListener('unload', () => {
  document.getElementById(OVERLAY_ID)?.remove();
});

} // end guard
