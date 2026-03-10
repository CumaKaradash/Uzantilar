/**
 * Visual Audio Alert — background.js  (Service Worker)
 *
 * ════════════════════════════════════════════════════════════════════════════
 * MİMARİ
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  Popup ──[start/stop]──▶  Background SW
 *                                │
 *                    ┌───────────┴────────────┐
 *                    │                        │
 *             tabCapture API          chrome.offscreen
 *             (MediaStream)         (offscreen.html/js)
 *                    │                        │
 *                    └──── stream ────────────▶ AudioContext + AnalyserNode
 *                                              └── volume ──▶ Background SW
 *                                                                  │
 *                                                    volume > threshold ?
 *                                                                  │
 *                                                       content.js ◀── flash!
 *
 * ════════════════════════════════════════════════════════════════════════════
 * NEDEN OFFSCREEN?
 * ════════════════════════════════════════════════════════════════════════════
 * MV3 Service Worker'larda DOM ve Web Audio API yoktur.
 * chrome.offscreen API ile gizli bir HTML sayfası açılır; bu sayfa
 * gerçek bir tarayıcı sayfasıdır ve AudioContext kullanabilir.
 * tabCapture ile elde edilen MediaStream, offscreen'e postMessage ile
 * aktarılamaz (transferable değil), bu yüzden stream ID offscreen'e
 * iletilir ve offscreen kendi içinde tabCapture stream'ini alır.
 * ════════════════════════════════════════════════════════════════════════════
 */

const OFFSCREEN_URL  = chrome.runtime.getURL('offscreen.html');
const OFFSCREEN_REASON = 'USER_MEDIA'; // en uygun sebep tabCapture için

// ─── STATE ────────────────────────────────────────────────────────────────────
let isEnabled    = false;
let sensitivity  = 'medium';
let activeTabId  = null;
let offscreenOpen = false;

// Hassasiyet eşikleri (0–255 RMS değeri üzerinden)
// Düşük hassasiyet → yüksek eşik (yalnızca çok yüksek ses tetikler)
// Yüksek hassasiyet → düşük eşik (küçük ses bile tetikler)
const THRESHOLDS = {
  low:    60,   // sadece yüksek sesler
  medium: 25,   // orta seviye sesler
  high:   8,    // hafif sesler bile
};

// ─── OFFSCREEN BELGE YÖNETİMİ ────────────────────────────────────────────────

async function ensureOffscreenDocument() {
  // Mevcut offscreen belgeleri listele
  const existing = await chrome.offscreen.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [OFFSCREEN_URL],
  }).catch(() => []);

  if (existing.length > 0) {
    offscreenOpen = true;
    return;
  }

  await chrome.offscreen.createDocument({
    url:    OFFSCREEN_URL,
    reasons: [OFFSCREEN_REASON],
    justification: 'Audio analysis via Web Audio API for visual alerts',
  });
  offscreenOpen = true;
}

async function closeOffscreenDocument() {
  if (!offscreenOpen) return;
  try {
    await chrome.offscreen.closeDocument();
  } catch (_) {}
  offscreenOpen = false;
}

// ─── SEKME YAKALAMA BAŞLAT ────────────────────────────────────────────────────

async function startCapture(tabId) {
  activeTabId = tabId;

  // 1. Offscreen belgeyi hazırla
  await ensureOffscreenDocument();

  // 2. tabCapture ile sekmenin MediaStream StreamID'sini al
  //    (gerçek MediaStream service worker'da kullanılamaz,
  //     streamId string olarak offscreen'e iletilir)
  let streamId;
  try {
    streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId(
        { targetTabId: tabId },
        (id) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(id);
        }
      );
    });
  } catch (err) {
    console.error('[VAA] tabCapture failed:', err);
    return;
  }

  // 3. StreamID ve eşik değerini offscreen'e ilet
  chrome.runtime.sendMessage({
    type:      'VAA_START_ANALYSIS',
    streamId,
    threshold: THRESHOLDS[sensitivity] ?? THRESHOLDS.medium,
    tabId,
  });
}

async function stopCapture() {
  // Offscreen'e durdurma mesajı gönder
  if (offscreenOpen) {
    chrome.runtime.sendMessage({ type: 'VAA_STOP_ANALYSIS' }).catch(() => {});
  }
  await closeOffscreenDocument();
  activeTabId = null;
}

// ─── ETKİNLEŞTİR / DEVReDIŞI ─────────────────────────────────────────────────

async function enable(tabId) {
  isEnabled = true;
  await startCapture(tabId);
}

async function disable() {
  isEnabled = false;
  await stopCapture();

  // Aktif sekmeye ışıkları kapat
  if (activeTabId) {
    chrome.tabs.sendMessage(activeTabId, { type: 'VAA_FLASH_OFF' }).catch(() => {});
  }
}

// ─── OFFSCREEN'DEN GELEN SES SEVİYESİ ────────────────────────────────────────

function handleVolumeReport(msg) {
  if (!isEnabled || !activeTabId) return;

  // Offscreen'den gelen { volume, triggered } mesajı
  chrome.tabs.sendMessage(activeTabId, {
    type:      msg.triggered ? 'VAA_FLASH' : 'VAA_FLASH_OFF',
    volume:    msg.volume,
    intensity: msg.intensity, // 0.0 – 1.0 normalleştirilmiş yoğunluk
  }).catch(() => {
    // Sekme kapandıysa veya content script yoksa
  });
}

// ─── MESAJ DİNLEYİCİ ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Offscreen → Background: ses raporu
  if (msg.type === 'VAA_VOLUME_REPORT') {
    handleVolumeReport(msg);
    return;
  }

  // Popup → Background: aç/kapat
  if (msg.type === 'VAA_ENABLE') {
    sensitivity = msg.sensitivity || 'medium';
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, async ([tab]) => {
      if (!tab?.id) return;
      await enable(tab.id);
      sendResponse({ ok: true });
    });
    return true; // async
  }

  if (msg.type === 'VAA_DISABLE') {
    disable().then(() => sendResponse({ ok: true }));
    return true;
  }

  // Popup → Background: hassasiyet değişti
  if (msg.type === 'VAA_SET_SENSITIVITY') {
    sensitivity = msg.sensitivity;
    // Offscreen'e yeni eşiği ilet
    if (offscreenOpen) {
      chrome.runtime.sendMessage({
        type:      'VAA_UPDATE_THRESHOLD',
        threshold: THRESHOLDS[sensitivity] ?? THRESHOLDS.medium,
      }).catch(() => {});
    }
    sendResponse({ ok: true });
  }
});

// ─── BAŞLANGIÇ DURUMU ────────────────────────────────────────────────────────

chrome.runtime.onStartup.addListener(async () => {
  const { enabled, sensitivity: s } = await chrome.storage.local.get(['enabled', 'sensitivity']);
  sensitivity = s || 'medium';
  // Eklenti kapalı olarak başlat (ses yakalama izni sekme aktifken verilmeli)
  if (enabled) {
    chrome.storage.local.set({ enabled: false });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['sensitivity', 'theme', 'lang'], (r) => {
    chrome.storage.local.set({
      enabled:     false,
      sensitivity: r.sensitivity || 'medium',
      theme:       r.theme       || 'light',
      lang:        r.lang        || 'en',
    });
  });
});
