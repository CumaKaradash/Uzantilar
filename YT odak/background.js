// Servis çalışanı (Manifest V3) - YouTube SPA URL değişimlerini dinler
// Amaç: URL değiştiğinde içerik betiğine haber vererek kuralları yeniden uygulatmak

// İlk kurulumda varsayılan ayarları yaz (yoksa)
const DEFAULT_SETTINGS = {
  hideHome: true,
  hideWatchRecommended: true,
  hideShorts: true,
  hideComments: true,
  hideEndScreen: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(null);
  const toSet = {};
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(k in stored)) toSet[k] = v;
  }
  if (Object.keys(toSet).length) {
    await chrome.storage.sync.set(toSet);
  }
});

// YouTube SPA: history.pushState ile sayfa değiştiğinde tetiklenir
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  try {
    // Yalnızca YouTube alanları için
    if (!/https?:\/\/(www\.)?youtube\.com/.test(details.url)) return;
    // İlgili sekmeye mesaj gönder
    await chrome.tabs.sendMessage(details.tabId, { type: 'url_changed', url: details.url });
  } catch (err) {
    // İçerik betiği henüz enjekte edilmemiş olabilir; sessizce geç
  }
}, { url: [{ hostSuffix: 'youtube.com' }] });

// ---- Eylem ikonu (toolbar) - Canvas ile minimalist "kahve kupası" çizimi ----
async function setActionIcon() {
  const make = (size) => {
    const c = new OffscreenCanvas(size, size);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, Math.floor(size / 12));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = size;
    // Bardak gövdesi
    ctx.beginPath();
    ctx.moveTo(s*0.2, s*0.35);
    ctx.lineTo(s*0.7, s*0.35);
    ctx.lineTo(s*0.7, s*0.65);
    ctx.quadraticCurveTo(s*0.7, s*0.85, s*0.5, s*0.85);
    ctx.lineTo(s*0.4, s*0.85);
    ctx.quadraticCurveTo(s*0.2, s*0.85, s*0.2, s*0.65);
    ctx.lineTo(s*0.2, s*0.35);
    ctx.stroke();
    // Kulplu kısım
    ctx.beginPath();
    ctx.moveTo(s*0.7, s*0.42);
    ctx.quadraticCurveTo(s*0.88, s*0.45, s*0.86, s*0.60);
    ctx.quadraticCurveTo(s*0.84, s*0.73, s*0.70, s*0.68);
    ctx.stroke();
    // Buhar çizgileri
    const steam = (x) => {
      ctx.beginPath();
      ctx.moveTo(x, s*0.22);
      ctx.quadraticCurveTo(x+ s*0.02, s*0.18, x, s*0.14);
      ctx.stroke();
    };
    steam(s*0.35);
    steam(s*0.45);
    return ctx.getImageData(0, 0, size, size);
  };
  try {
    await chrome.action.setIcon({
      imageData: {
        16: make(16),
        24: make(24),
        32: make(32)
      }
    });
  } catch {}
}

chrome.runtime.onStartup.addListener(setActionIcon);
chrome.runtime.onInstalled.addListener(setActionIcon);
