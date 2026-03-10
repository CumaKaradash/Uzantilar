/**
 * Tremor-Safe Click — content.js
 *
 * Sorumluluğu:
 *  - body'e .ts-active ve .ts-size-{sm|md|lg} sınıflarını ekleyip kaldırmak
 *  - Popup'tan gelen durum/boyut mesajlarını uygulamak
 *  - MutationObserver ile dinamik olarak eklenen elementleri yakalamak
 *    (CSS cascade sayesinde yeni elementler otomatik kapsanır,
 *     observer yalnızca overflow/z-index edge case'leri için ek güvencedir)
 *
 * CSS zaten tüm işi yapıyor — JS sadece body sınıflarını yönetiyor.
 */

// ─── STATE ────────────────────────────────────────────────────────────────────
let isEnabled = false;
let size      = 'md'; // 'sm' | 'md' | 'lg'
let observer  = null;

const SIZE_CLASSES = ['ts-size-sm', 'ts-size-md', 'ts-size-lg'];

// ─── BODY SINIF YÖNETİMİ ─────────────────────────────────────────────────────

function applyClasses() {
  const body = document.body;
  if (!body) return;

  if (isEnabled) {
    body.classList.add('ts-active');
    // Mevcut boyut sınıflarını temizle, aktif olanı ekle
    body.classList.remove(...SIZE_CLASSES);
    body.classList.add(`ts-size-${size}`);
  } else {
    body.classList.remove('ts-active', ...SIZE_CLASSES);
  }
}

// ─── MUTATION OBSERVER ────────────────────────────────────────────────────────
/*
 * Dinamik olarak eklenen buton/link elementleri CSS cascade sayesinde
 * otomatik olarak sınıfları devralır (çünkü body'deki .ts-active global).
 *
 * Bu observer'ın asıl amacı:
 *   1. body sınıflarının başka script tarafından kaldırılmasını önlemek
 *   2. SPA sayfa geçişlerinde body'nin sıfırlanmasını yakalamak
 *   3. Bazı shadow DOM edge case'lerinde manuel sınıf yenileme
 */

function startObserver() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;

    for (const m of mutations) {
      // body'nin class attribute'u değiştiyse — kayıp sınıfları geri ekle
      if (m.type === 'attributes' &&
          m.target === document.body &&
          m.attributeName === 'class') {

        const body = document.body;
        if (!body.classList.contains('ts-active')) {
          // Başka bir script .ts-active'i kaldırmış — geri yükle
          requestAnimationFrame(applyClasses);
        }
        break;
      }
    }
  });

  observer.observe(document.body, {
    attributes:     true,
    attributeFilter: ['class'],
    childList:      false,
    subtree:        false,
  });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// ─── ETKİNLEŞTİR / DEVReDIŞI ─────────────────────────────────────────────────

function enable(newSize) {
  isEnabled = true;
  if (newSize) size = newSize;
  applyClasses();
  startObserver();
}

function disable() {
  isEnabled = false;
  stopObserver();
  applyClasses(); // sınıfları kaldırır
}

function updateSize(newSize) {
  size = newSize;
  if (isEnabled) applyClasses();
}

// ─── POPUP'TAN GELEN MESAJLAR ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'TS_ENABLE':
      enable(msg.size);
      sendResponse({ ok: true });
      break;

    case 'TS_DISABLE':
      disable();
      sendResponse({ ok: true });
      break;

    case 'TS_UPDATE_SIZE':
      updateSize(msg.size);
      sendResponse({ ok: true });
      break;

    case 'TS_GET_STATE':
      sendResponse({ enabled: isEnabled, size });
      break;
  }
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
/*
 * DOM hazır olmadan body.classList kullanamayız.
 * document_start'ta çalışıyoruz → DOM henüz yüklenmemiş olabilir.
 */

function init() {
  chrome.storage.local.get(['enabled', 'size'], (result) => {
    size      = result.size    || 'md';
    isEnabled = result.enabled === true;

    if (isEnabled) {
      enable(size);
    }
  });
}

if (document.body) {
  // Body zaten var (örn. SPA geçişi)
  init();
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
