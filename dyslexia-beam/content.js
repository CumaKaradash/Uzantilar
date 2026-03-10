/**
 * Dyslexia Beam — content.js
 *
 * İki temel işlev:
 *  1. FONT: body'e .db-font-active sınıfı ekleyerek OpenDyslexic'i devreye alır.
 *  2. BEAM: Fare hareketlerini dinleyerek yatay vurgulama şeridini konumlandırır.
 *
 * Tüm stil değişiklikleri CSS sınıfları üzerinden yapılır —
 * JS doğrudan inline stil yazmaz (beam translateY hariç, performans için).
 */

// ─── STATE ────────────────────────────────────────────────────────────────────
let isEnabled    = false;
let beamEl       = null;
let rafId        = null;
let mouseY       = 0;
let beamHeight   = 36; // px — content.css #db-beam height ile eşleşmeli
let fontObserver = null;

// ─── BEAM ELEMENTİ ────────────────────────────────────────────────────────────

function createBeam() {
  if (document.getElementById('db-beam')) return;

  beamEl = document.createElement('div');
  beamEl.id = 'db-beam';
  beamEl.setAttribute('aria-hidden', 'true'); // ekran okuyuculardan gizle
  document.body.appendChild(beamEl);
}

function removeBeam() {
  const el = document.getElementById('db-beam');
  if (el) el.remove();
  beamEl = null;
}

// ─── BEAM POZİSYONLAMA ────────────────────────────────────────────────────────
// requestAnimationFrame ile birleştirilmiş — scroll ve resize'da da çalışır.

function updateBeamPosition() {
  rafId = null;
  if (!beamEl || !isEnabled) return;

  // İmleç pozisyonunu beacon yüksekliğinin ortasına hizala
  const y = mouseY - beamHeight / 2;
  beamEl.style.transform = `translateY(${y}px)`;
}

function scheduleBeamUpdate() {
  if (rafId) return;
  rafId = requestAnimationFrame(updateBeamPosition);
}

// ─── FARE OLAYLARI ────────────────────────────────────────────────────────────

function onMouseMove(e) {
  mouseY = e.clientY;
  scheduleBeamUpdate();
}

function onMouseLeave() {
  // Sayfa dışına çıkınca beam'i gizle
  if (beamEl) {
    beamEl.style.opacity = '0';
    setTimeout(() => {
      if (beamEl) beamEl.style.opacity = '';
    }, 300);
  }
}

// ─── KOYU/AÇIK SAYFA TESPİTİ ─────────────────────────────────────────────────
// Sayfanın arka plan rengine göre beam rengini otomatik ayarla.

function detectPageDarkness() {
  const bg = window.getComputedStyle(document.body).backgroundColor;
  if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false;

  const match = bg.match(/\d+/g);
  if (!match || match.length < 3) return false;

  const [r, g, b] = match.map(Number);
  // Algılanan parlaklık (perceived luminance)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45; // 0.45 altı koyu sayfa
}

// ─── ETKİNLEŞTİR / DEVReDIŞI ─────────────────────────────────────────────────

function enable() {
  isEnabled = true;
  document.body.classList.add('db-font-active', 'db-beam-active');

  if (detectPageDarkness()) {
    document.body.classList.add('db-dark-mode');
  } else {
    document.body.classList.remove('db-dark-mode');
  }

  createBeam();
  document.addEventListener('mousemove',   onMouseMove,  { passive: true });
  document.addEventListener('mouseleave',  onMouseLeave, { passive: true });

  startFontObserver();
}

function disable() {
  isEnabled = false;
  document.body.classList.remove('db-font-active', 'db-beam-active', 'db-dark-mode');

  document.removeEventListener('mousemove',  onMouseMove);
  document.removeEventListener('mouseleave', onMouseLeave);

  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

  removeBeam();
  stopFontObserver();
}

// ─── MUTATION OBSERVER ────────────────────────────────────────────────────────
// Dinamik olarak eklenen elementlerin de font sınıfını almasını sağlar.
// Ayrıca beam'in her zaman body'nin son çocuğu olmasını garantiler
// (bazı sayfalar body'e element eklediğinde beam önde kalmalı).

function startFontObserver() {
  if (fontObserver) return;

  fontObserver = new MutationObserver((mutations) => {
    if (!isEnabled) return;

    for (const m of mutations) {
      // Yeni eklenen node'lar — font sınıfları CSS cascade ile otomatik geçer,
      // ancak beam'in en sonda kalmasını sağla.
      if (m.addedNodes.length > 0) {
        const beam = document.getElementById('db-beam');
        if (beam && beam !== document.body.lastElementChild) {
          document.body.appendChild(beam);
        }
      }

      // body sınıfları beklenmedik şekilde kaldırıldıysa geri yükle
      if (m.type === 'attributes' && m.target === document.body) {
        if (!document.body.classList.contains('db-font-active')) {
          document.body.classList.add('db-font-active', 'db-beam-active');
        }
      }
    }
  });

  fontObserver.observe(document.body, {
    childList:  true,
    subtree:    false,
    attributes: true,
    attributeFilter: ['class'],
  });
}

function stopFontObserver() {
  if (fontObserver) {
    fontObserver.disconnect();
    fontObserver = null;
  }
}

// ─── POPUP'TAN GELEN MESAJLAR ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'DB_ENABLE')  enable();
  if (msg.type === 'DB_DISABLE') disable();
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init() {
  chrome.storage.local.get(['enabled'], (result) => {
    if (result.enabled !== false && result.enabled !== undefined) {
      // Sadece daha önce açıkça etkinleştirildiyse aç
      if (result.enabled === true) enable();
    }
  });
}

// DOM hazır olduğunda başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
