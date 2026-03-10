// İçerik betiği: Instagram DOM'undaki dikkat dağıtıcı unsurları agresif bir şekilde gizler
// SPA yapısı ve Instagram'ın sürekli değişen div sınıflarına karşı çok daha katı kurallar içerir

const STYLE_ID = 'igf-style';

// Varsayılan ayarlar
const DEFAULT_SETTINGS = {
  hideReels: true,
  hideExplore: true,
  hideNotifications: true,
  hideStories: false
};

// --- CSS GİZLEME (İlk ve en hızlı savunma hattı) ---
function buildCSS(s) {
  const rules = [];

  // Reels
  if (s.hideReels) {
    rules.push(`
      a[href*="/reels/"] { display: none !important; }
    `);
  }

  // Keşfet
  if (s.hideExplore) {
    rules.push(`
      a[href*="/explore/"] { display: none !important; }
    `);
  }

  // Bildirimler / Hareketler
  if (s.hideNotifications) {
    rules.push(`
      a[href*="/accounts/activity/"],
      a[href*="/push_notifications/"]
      { display: none !important; }
    `);
  }

  // Hikayeler
  if (s.hideStories) {
    rules.push(`
      /* Feed üstündeki hikaye menüleri */
      div[role="menu"],
      div[role="presentation"] ul
      { display: none !important; }
    `);
  }

  return rules.join('\n');
}

function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    document.documentElement.appendChild(style);
  }
  return style;
}

// Ayarları çekip uygula
async function applySettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  window.__igf_lastSettings = settings;
  const css = buildCSS(settings);
  ensureStyle().textContent = css;
  scheduleInstagramFallback();
}

// Depolama değiştiğinde
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  applySettings();
});

// Arka plandan mesaj geldiğinde
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && (msg.type === 'url_changed' || msg.type === 'settings_updated')) {
    applySettings();
  }
});

// Dinamik yüklenen içerikleri yakalamak için MutationObserver
const observer = new MutationObserver(() => {
  ensureStyle();
  scheduleInstagramFallback();
});

// Başlat
(function init() {
  try {
    applySettings();
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    setTimeout(() => {
      applySettings();
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }, 100);
  }
})();

// --- JAVASCRIPT GİZLEME (İkinci ve en agresif savunma hattı) ---
function hideEl(el) {
  if (el && el.style && el.style.display !== 'none') {
    el.style.setProperty('display', 'none', 'important');
  }
}

function instagramFallback() {
  try {
    const s = window.__igf_lastSettings;
    if (!s) return;

    // 1. İKONLARI VE BUTONLARI ARIA-LABEL İLE GİZLE (Sidebar Menüsü İçin Katı Kontrol)
    document.querySelectorAll('svg[aria-label], svg[alt]').forEach(svg => {
      const label = (svg.getAttribute('aria-label') || svg.getAttribute('alt') || '').toLowerCase();
      // Kapsayıcıyı (container) bulup tamamen gizliyoruz ki boşluk kalmasın
      const container = svg.closest('a') || svg.closest('div[role="button"]') || svg.closest('div[role="listitem"]') || svg;
      
      if (s.hideReels && label.includes('reels')) hideEl(container);
      if (s.hideExplore && (label.includes('keşfet') || label.includes('explore'))) hideEl(container);
      if (s.hideNotifications && (label.includes('bildirim') || label.includes('notification') || label.includes('hareketler'))) hideEl(container);
    });


  } catch (e) {
    // Sessiz devam et
  }
}

let __igf_hide_timer = null;
function scheduleInstagramFallback() {
  clearTimeout(__igf_hide_timer);
  // Sonsuz döngüden kaçınmak ve performansı korumak için kısa gecikme
  __igf_hide_timer = setTimeout(instagramFallback, 150);
}