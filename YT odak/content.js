// İçerik betiği: YouTube DOM'undaki dikkat dağıtıcı unsurları CSS ile gizler
// SPA yapısı için URL değişimlerini ve dinamik DOM güncellemelerini ele alır

const STYLE_ID = 'ydh-style';

// Varsayılan ayarlar
const DEFAULT_SETTINGS = {
  hideHome: true,
  hideWatchRecommended: true,
  hideShorts: true,
  hideComments: true,
  hideEndScreen: true
};

// CSS kuralı üretimi: Seçilen ayarlara göre gizlenecek öğelerin listesi
function buildCSS(s) {
  const rules = [];

  // Anasayfa önerileri (yalnızca home sayfasında)
  if (s.hideHome) {
    rules.push(`
      ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
      ytd-browse[page-subtype="home"] ytd-two-column-browse-results-renderer,
      ytd-browse[page-subtype="home"] ytd-rich-shelf-renderer,
      ytd-browse[page-subtype="home"] ytd-section-list-renderer
      { display: none !important; }
    `);
  }

  // Video yanı/altı öneriler
  if (s.hideWatchRecommended) {
    rules.push(`
      ytd-watch-next-secondary-results-renderer,
      ytd-watch-flexy #secondary,
      #related,
      .ytd-watch-flexy #related
      { display: none !important; }
    `);
  }

  // Shorts: çeşitli konumlardaki raflar ve bağlantılar
  if (s.hideShorts) {
    rules.push(`
      ytd-reel-shelf-renderer,
      ytd-reel-video-renderer,
      ytd-reel-item-renderer,
      ytd-compact-reel-renderer,
      ytd-rich-grid-shelf-renderer[is-shorts],
      /* Shorts rafını saran ana kapsayıcılar */
      ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
      ytd-rich-section-renderer:has(ytd-reel-shelf-renderer),
      ytd-section-list-renderer:has(ytd-reel-shelf-renderer),
      ytd-browse:has(ytd-reel-shelf-renderer),
      /* Sol rehber ve mini rehberde Shorts sekmesi */
      ytd-guide-entry-renderer a[href*="/shorts"],
      ytd-mini-guide-entry-renderer a[href*="/shorts"],
      /* Başlık/aria tabanlı Shorts sekmeleri */
      ytd-guide-entry-renderer a[title="Shorts"],
      ytd-mini-guide-entry-renderer[aria-label="Shorts"],
      /* Üst menüde Shorts butonu */
      ytd-topbar-menu-button-renderer a[href*="/shorts"],
      /* Ana sayfa/arama chip'lerinde Shorts etiketi */
      ytd-chip-cloud-chip-renderer a[href*="/shorts"],
      ytd-feed-filter-chip-bar-renderer a[href*="/shorts"],
      /* Kanal sayfasındaki Shorts sekmesi */
      ytd-tabbed-page-header-renderer a[href*="/shorts"],
      yt-tab-shape[tab-title="Shorts"],
      /* Tüm Shorts bağlantıları */
      a[href^="/shorts"],
      a[href*="youtube.com/shorts"]
      { display: none !important; }
    `);
    /* :has() destekli ek kapamalar (Chrome destekli)
       Amaç: Short içeriği barındıran raf/öğe kapsayıcılarını bütünüyle gizlemek */
    rules.push(`
      ytd-rich-grid-shelf-renderer:has(ytd-reel-shelf-renderer),
      ytd-rich-grid-renderer:has(ytd-reel-shelf-renderer),
      ytd-rich-item-renderer:has(ytd-reel-video-renderer),
      ytd-guide-entry-renderer:has(a[href*="/shorts"]),
      ytd-guide-entry-renderer:has(a[title="Shorts"]),
      ytd-mini-guide-entry-renderer:has(a[href*="/shorts"]),
      ytd-mini-guide-entry-renderer[aria-label="Shorts"],
      ytd-chip-cloud-chip-renderer:has(a[href*="/shorts"]),
      ytd-feed-filter-chip-bar-renderer:has(a[href*="/shorts"]),
      ytd-grid-video-renderer:has(a[href*="/shorts"]),
      /* Kanal sekmeleri */
      yt-tab-shape:has(a[href*="/shorts"]),
      /* Mobil/dar ekran pivot bar öğeleri */
      ytd-pivot-bar-item-renderer[aria-label="Shorts"],
      ytd-pivot-bar-item-renderer:has(a[title="Shorts"]),
      ytd-pivot-bar-item-renderer:has(a[href*="/shorts"])
      { display: none !important; }
    `);
  }

  // Yorumlar bölümü
  if (s.hideComments) {
    rules.push(`
      ytd-comments,
      ytd-item-section-renderer[section-identifier="comment-section"],
      #comments
      { display: none !important; }
    `);
  }

  // End-screen öneri kartları ve son ekran overlay'leri
  if (s.hideEndScreen) {
    rules.push(`
      .ytp-endscreen-content,
      .ytp-ce-element,
      .ytp-ce-element-show,
      .ytp-ce-expanding-overlay,
      .ytp-pause-overlay-container
      { display: none !important; }
    `);
  }

  // Derlenen kurallar
  return rules.join('\n');
}

// <style> öğesini oluştur / güncelle
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

// Ayarları uygula
async function applySettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  window.__ydh_lastSettings = settings;
  const css = buildCSS(settings);
  const style = ensureStyle();
  style.textContent = css;
  if (settings.hideShorts) {
    scheduleHideShortsFallback();
  }
}

// Depolama değiştiğinde kuralları güncelle
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  applySettings();
});

// Background'dan URL değişimi mesajı geldiğinde yeniden uygula
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && (msg.type === 'url_changed' || msg.type === 'settings_updated')) {
    applySettings();
  }
});

// MutationObserver: SPA içinde dinamik eklenen/çıkarılan düğümlerde <style>'ın varlığını koru
const observer = new MutationObserver(() => {
  ensureStyle();
  if (window.__ydh_lastSettings?.hideShorts) {
    scheduleHideShortsFallback();
  }
});

// Başlat: erken çalış ve gözlemle
(function init() {
  try {
    applySettings();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    // Sayfa çok erkense kısa gecikme ile tekrar dene
    setTimeout(() => {
      applySettings();
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }, 100);
  }
})();

// ----- Shorts için JS tabanlı agresif gizleme (fallback) -----
// Metin eşleştirme yardımcıları
function isShortsText(el) {
  const t = (el.textContent || '').trim().toLowerCase();
  return t.includes('shorts');
}

function hide(el) {
  if (el && el.style) el.style.display = 'none';
}

function hideShortsFallback() {
  try {
    // Ana kapsayıcılar: rich section / section list içinde shorts rafı varsa tüm bölümü gizle
    document.querySelectorAll('ytd-rich-section-renderer, ytd-section-list-renderer').forEach((sec) => {
      if (sec.querySelector('ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer')) hide(sec);
    });
    // Chip/filtre menüsünde "Shorts" geçen öğeleri gizle
    document.querySelectorAll('yt-chip-cloud-chip-renderer, ytd-chip-cloud-chip-renderer').forEach((chip) => {
      if (isShortsText(chip) || chip.querySelector('a[href*="/shorts"]')) hide(chip);
    });
    // Pivot bar (mobil/dar ekran alt bar)
    document.querySelectorAll('ytd-pivot-bar-item-renderer').forEach((item) => {
      const aria = (item.getAttribute('aria-label') || '').toLowerCase();
      if (aria === 'shorts' || isShortsText(item) || item.querySelector('a[href*="/shorts"]')) hide(item);
    });
  } catch {}
}

let __ydh_hide_timer = null;
function scheduleHideShortsFallback() {
  clearTimeout(__ydh_hide_timer);
  __ydh_hide_timer = setTimeout(hideShortsFallback, 100);
}
