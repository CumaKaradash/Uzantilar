/**
 * Static World — content.js
 *
 * Dondurma motoru. Üç katmanlı yaklaşım:
 *
 *  KATMAN 1 — CSS (content.css)
 *    animation, transition, scroll-behavior → anında sıfırlar
 *
 *  KATMAN 2 — Bu dosya (JS)
 *    - Video/audio .pause()
 *    - Web Animations API (element.getAnimations()) durdurma
 *    - SVG SMIL .pauseAnimations()
 *    - GIF → canvas dondurma
 *    - requestAnimationFrame engelleme
 *    - Marquee .stop()
 *    - MutationObserver ile dinamik içerik yakalama
 *
 *  KATMAN 3 — MutationObserver
 *    Sayfa sonradan yüklenen her elementi yakalar ve dondurur.
 *
 * ─── GÜNCELLEME REHBERİ ───────────────────────────────────────────────────
 * Yeni bir hareket türü gözlemlersen:
 *   1. freezeElement() fonksiyonuna yeni kontrol ekle
 *   2. unfreezeElement() fonksiyonuna geri alma ekle
 *   3. Gerekirse freezePage() çağrısına yeni querySelector ekle
 * ─────────────────────────────────────────────────────────────────────────
 */

// ─── GLOBAL GUARD — çoklu enjeksiyonu engelle ────────────────────────────────
if (typeof window.__staticWorldLoaded === 'undefined') {
window.__staticWorldLoaded = true;

// ─── STATE ────────────────────────────────────────────────────────────────────
let isEnabled    = false;
let observer     = null;
let rafBlocked   = false;
const FROZEN_ATTR = 'data-sw-frozen';
const GIF_ATTR    = 'data-sw-gif-freeze';

// ─── KATMAN 1: CSS SINIFI ─────────────────────────────────────────────────────

function addCSSFreeze()    { document.body?.classList.add('sw-active'); }
function removeCSSFreeze() { document.body?.classList.remove('sw-active'); }

// ─── KATMAN 2A: VİDEO / AUDIO DONDURMA ───────────────────────────────────────

function freezeMedia(el) {
  if (!(el instanceof HTMLVideoElement || el instanceof HTMLAudioElement)) return;
  if (el.hasAttribute(FROZEN_ATTR)) return;

  el.setAttribute(FROZEN_ATTR, '1');

  // autoplay özelliğini kaldır
  el.removeAttribute('autoplay');
  el.autoplay = false;

  // Oynatmayı durdur
  if (!el.paused) {
    el.pause();
  }

  // Sonraki play() çağrılarını engelle
  el._sw_origPlay = el._sw_origPlay || el.play.bind(el);
  el.play = () => Promise.resolve(); // sessizce yok say
}

function unfreezeMedia(el) {
  if (!(el instanceof HTMLVideoElement || el instanceof HTMLAudioElement)) return;
  el.removeAttribute(FROZEN_ATTR);

  // play() metodunu orijinaline geri yükle
  if (el._sw_origPlay) {
    el.play = el._sw_origPlay;
    delete el._sw_origPlay;
  }
}

// ─── KATMAN 2B: WEB ANIMATIONS API ───────────────────────────────────────────
// element.animate() ve CSS @keyframes ile başlatılan animasyonları durdurur.

function freezeAnimations(el) {
  if (!el.getAnimations) return;
  el.getAnimations({ subtree: false }).forEach(anim => {
    if (anim.playState === 'running') {
      anim.pause();
      anim._swFrozen = true;
    }
  });
}

function unfreezeAnimations(el) {
  if (!el.getAnimations) return;
  el.getAnimations({ subtree: false }).forEach(anim => {
    if (anim._swFrozen) {
      anim.play();
      delete anim._swFrozen;
    }
  });
}

// ─── KATMAN 2C: SVG SMIL ANİMASYONLARI ──────────────────────────────────────

function freezeSVGs(root = document) {
  root.querySelectorAll('svg').forEach(svg => {
    if (svg.pauseAnimations && typeof svg.pauseAnimations === 'function') {
      try { svg.pauseAnimations(); } catch (_) {}
    }
  });
}

function unfreezeSVGs(root = document) {
  root.querySelectorAll('svg').forEach(svg => {
    if (svg.unpauseAnimations && typeof svg.unpauseAnimations === 'function') {
      try { svg.unpauseAnimations(); } catch (_) {}
    }
  });
}

// ─── KATMAN 2D: GIF DONDURMA (Canvas) ────────────────────────────────────────
/*
 * GIF'leri dondurmak için:
 *  1. <img src="...gif"> elementini yakala
 *  2. Aynı boyutta bir <canvas> oluştur
 *  3. Canvas'a ilk kareyi çiz (drawImage)
 *  4. Orijinal img'yi gizle, canvas'ı yerine ekle
 *
 * NOT: Cross-origin GIF'ler (başka domain) canvas'a çizilemez (CORS).
 * Bu durumda GIF gizlenir veya olduğu gibi bırakılır (hata sessizce geçilir).
 */

function freezeGIF(img) {
  // Zaten dondurulmuş veya GIF değilse atla
  if (img.hasAttribute(GIF_ATTR)) return;
  if (!img.src || !img.src.toLowerCase().includes('.gif')) return;
  if (!img.complete || !img.naturalWidth) return;

  img.setAttribute(GIF_ATTR, '1');

  const canvas = document.createElement('canvas');
  canvas.setAttribute(GIF_ATTR, '1');
  canvas.width  = img.naturalWidth  || img.width  || 100;
  canvas.height = img.naturalHeight || img.height || 100;
  canvas.style.cssText = `
    width: ${img.offsetWidth  || img.width  || canvas.width}px;
    height: ${img.offsetHeight || img.height || canvas.height}px;
    display: inline-block;
    vertical-align: middle;
  `;

  try {
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Canvas'ı img'nin yerine ekle
    img._swCanvas = canvas;
    img.style.display = 'none';
    img.parentNode?.insertBefore(canvas, img.nextSibling);
  } catch (e) {
    // Cross-origin CORS hatası — GIF'e dokunma
    img.removeAttribute(GIF_ATTR);
  }
}

function unfreezeGIF(img) {
  if (!img.hasAttribute(GIF_ATTR)) return;
  img.removeAttribute(GIF_ATTR);
  img.style.removeProperty('display');

  if (img._swCanvas) {
    img._swCanvas.remove();
    delete img._swCanvas;
  }
}

function freezeAllGIFs(root = document) {
  root.querySelectorAll('img[src*=".gif"], img[src*=".GIF"]').forEach(img => {
    if (img.complete) {
      freezeGIF(img);
    } else {
      img.addEventListener('load', () => { if (isEnabled) freezeGIF(img); }, { once: true });
    }
  });
}

function unfreezeAllGIFs(root = document) {
  root.querySelectorAll(`img[${GIF_ATTR}]`).forEach(unfreezeGIF);
}

// ─── KATMAN 2E: MARQUEE DURDURMA ─────────────────────────────────────────────

function freezeMarquees(root = document) {
  root.querySelectorAll('marquee').forEach(m => {
    try { m.stop(); } catch (_) {}
  });
}

function unfreezeMarquees(root = document) {
  root.querySelectorAll('marquee').forEach(m => {
    try { m.start(); } catch (_) {}
  });
}

// ─── KATMAN 2F: WEB ANIMATIONS API — SAYFA GENELİ ───────────────────────────

function freezeAllWebAnimations(root = document) {
  if (!document.getAnimations) return;
  try {
    document.getAnimations().forEach(anim => {
      if (anim.playState === 'running') {
        anim.pause();
        anim._swFrozen = true;
      }
    });
  } catch (_) {}
}

function unfreezeAllWebAnimations() {
  if (!document.getAnimations) return;
  try {
    document.getAnimations().forEach(anim => {
      if (anim._swFrozen) {
        anim.play();
        delete anim._swFrozen;
      }
    });
  } catch (_) {}
}

// ─── TEK ELEMENT DONDURMA ─────────────────────────────────────────────────────
// MutationObserver'dan gelen yeni elementler için.

function freezeElement(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

  freezeAnimations(el);

  if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement) {
    freezeMedia(el);
  }

  if (el instanceof HTMLImageElement) {
    if (el.complete) freezeGIF(el);
    else el.addEventListener('load', () => { if (isEnabled) freezeGIF(el); }, { once: true });
  }

  if (el.tagName === 'MARQUEE') {
    try { el.stop(); } catch (_) {}
  }

  if (el.tagName === 'SVG' && el.pauseAnimations) {
    try { el.pauseAnimations(); } catch (_) {}
  }

  // Alt elementleri de tara
  el.querySelectorAll('video, audio').forEach(freezeMedia);
  el.querySelectorAll('img[src*=".gif"]').forEach(img => {
    if (img.complete) freezeGIF(img);
    else img.addEventListener('load', () => { if (isEnabled) freezeGIF(img); }, { once: true });
  });
  el.querySelectorAll('marquee').forEach(m => { try { m.stop(); } catch (_) {} });
  el.querySelectorAll('svg').forEach(svg => {
    if (svg.pauseAnimations) try { svg.pauseAnimations(); } catch (_) {}
  });
}

// ─── SAYFAYI TAMAMEN DONDUR ───────────────────────────────────────────────────

function freezePage() {
  addCSSFreeze();
  freezeAllWebAnimations();
  document.querySelectorAll('video, audio').forEach(freezeMedia);
  freezeAllGIFs();
  freezeMarquees();
  freezeSVGs();
  startObserver();
}

// ─── SAYFAYI TAMAMEN ÇÖZDÜR ───────────────────────────────────────────────────

function unfreezePage() {
  removeCSSFreeze();
  unfreezeAllWebAnimations();
  document.querySelectorAll(`video[${FROZEN_ATTR}], audio[${FROZEN_ATTR}]`).forEach(unfreezeMedia);
  unfreezeAllGIFs();
  unfreezeMarquees();
  unfreezeSVGs();
  stopObserver();
}

// ─── MUTATION OBSERVER ────────────────────────────────────────────────────────
// Dinamik olarak eklenen her yeni elementi yakala ve dondur.

function startObserver() {
  if (observer) return;

  observer = new MutationObserver(mutations => {
    if (!isEnabled) return;

    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          freezeElement(node);
        }
      }

      // src değişimi (örn. lazy-load video eklenmesi)
      if (m.type === 'attributes') {
        const el = m.target;
        if ((el instanceof HTMLVideoElement || el instanceof HTMLAudioElement)) {
          freezeMedia(el);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList:      true,
    subtree:        true,
    attributes:     true,
    attributeFilter: ['src', 'autoplay'],
  });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// ─── ANA ETKİN/PASİF ─────────────────────────────────────────────────────────

function enable() {
  isEnabled = true;
  if (document.body) {
    freezePage();
  } else {
    document.addEventListener('DOMContentLoaded', freezePage, { once: true });
  }
}

function disable() {
  isEnabled = false;
  unfreezePage();
}

// ─── POPUP'TAN GELEN MESAJLAR ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SW_ENABLE')  { enable();  sendResponse({ ok: true }); }
  if (msg.type === 'SW_DISABLE') { disable(); sendResponse({ ok: true }); }
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get(['enabled'], (result) => {
  if (result.enabled === true) {
    isEnabled = true;
    if (document.body) {
      freezePage();
    } else {
      document.addEventListener('DOMContentLoaded', freezePage, { once: true });
    }
  }
});

} // end global guard
