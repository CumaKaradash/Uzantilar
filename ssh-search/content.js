/**
 * Ssh! Search — content.js
 *
 * Google ve Bing SERP sayfalarından reklam, AI özeti ve
 * dikkat dağıtıcı widget'ları kaldırır.
 *
 * ╔══════════════════════════════════════════════════════════╗
 * ║  GÜNCELLEME REHBERİ                                      ║
 * ║  Google arayüzü değiştiğinde ne yapmalısın:              ║
 * ║  1. DevTools'u aç (F12)                                  ║
 * ║  2. Reklamı/paneli sağ tıkla → "İncele"                  ║
 * ║  3. Elementin data-attid, class, id'sini bul             ║
 * ║  4. Aşağıdaki ilgili bölüme yeni selector ekle           ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ─── STATE ────────────────────────────────────────────────────────────────────
let isEnabled = true;
let observer  = null;

// ─── SELECTOR TANIMI ─────────────────────────────────────────────────────────
//
// Her grup ayrı ayrı yorum satırıyla belgelenmiştir.
// true  → varsayılan olarak GİZLİ
// false → kullanıcı ayarıyla kontrol edilebilir (isteğe bağlı)

const FILTER_GROUPS = {

  // ════════════════════════════════════════════════════════════════
  // GOOGLE — REKLAMLAR
  // ════════════════════════════════════════════════════════════════
  google_ads: {
    enabled: true,
    label: 'Google Ads',
    selectors: [

      // ── Metin Reklamları (Text Ads) ─────────────────────────────
      // Ana reklam konteyneri — genellikle #tads (top ads) ve #tadsb (bottom ads)
      '#tads',        // Sayfanın üstündeki reklam bloğu
      '#tadsb',       // Sayfanın altındaki reklam bloğu
      '#bottomads',   // Alternatif alt reklam konteyneri

      // data-text-ad attribute'u taşıyan div'ler — Google'ın kendi işaretlemesi
      'div[data-text-ad]',

      // Reklam li elementleri — arama sonucu listesindeki reklam öğeleri
      'li[data-hveid][class*="MjjYud"] [data-text-ad]',

      // "Sponsorlu" / "Sponsored" etiketli üst konteyner
      // Bu div'ler içinde .uEierd veya [aria-label="Ads"] geçer
      'div[aria-label="Ads"]',
      'div[aria-label="Reklamlar"]',

      // ── Alışveriş / Shopping Reklamları ──────────────────────────
      // Google Shopping carousel — en üstte çıkan ürün kartları
      '.commercial-unit-desktop-top',
      '.commercial-unit-desktop-rhs',
      // Yeni arayüzde alışveriş bloğu
      'div[data-initq]',         // Alışveriş sonuçları konteyneri
      '.cu-container',           // Commercial unit container
      '[data-attrid="kc:/shopping"]',

      // ── Dinamik Reklam Tespiti ────────────────────────────────────
      // Google bazen reklamları data-sokoban-feature ile işaretler
      '[data-sokoban-feature="ads_top"]',
      '[data-sokoban-feature="ads_bottom"]',

      // Reklam içeren sonuç blokları — içinde "Sponsored" span olan div.g
      // (aşağıda JS ile yakalanır, bu selector ek güvence)
      '.uEierd',   // "Sponsored" etiket spanı
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // GOOGLE — YAPAY ZEKA ÖZETİ (AI Overview / SGE)
  // ════════════════════════════════════════════════════════════════
  google_ai: {
    enabled: true,
    label: 'AI Overview',
    selectors: [

      // AI Overview ana konteyneri (Search Generative Experience)
      // Google bu bloğu birkaç farklı ID ile sunar:
      'div[data-attrid="wa:/description"]',   // Bilgi paneli AI özeti
      '[jscontroller="Z77Qec"]',              // SGE ana kontrolcüsü

      // AI Overview — yeni arayüz (2024+)
      // DevTools'da "AI Overview" başlığının üst div'ini bul
      '.YzccDb',     // AI overview wrapper (tespit edilmiş)
      '.cYEFGb',     // AI answer block
      '.s0FDmd',     // AI generative summary block
      '.kno-rdesc',  // Bilgi paneli açıklaması (AI kökenli)

      // "Generate" / "Generate with AI" butonu ve konteyneri
      '[data-async-type="aiOverview"]',
      '[data-hveid][jscontroller="BiNbv"]',

      // Yeni AI Overviews paneli (2025 güncel)
      'div[data-node-id*="ai_overview"]',
      '.wDYxhc[data-attrid*="description"]',
      '.mod[jscontroller*="ai"]',

      // Google Bard / Gemini entegre sonuçları
      '[data-sokoban-feature="ai_overview"]',
      '[data-feature-id="aiOverview"]',
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // GOOGLE — DİKKAT DAĞITICI WIDGET'LAR (İsteğe Bağlı)
  // ════════════════════════════════════════════════════════════════
  google_noise: {
    enabled: true,   // false yaparak bu grubu devre dışı bırakabilirsin
    label: 'Noise Widgets',
    selectors: [

      // "People Also Ask" / "Kullanıcılar Bunları da Sordu" akordeon
      // .related-question-pair her bir soru-cevap çiftidir
      '.related-question-pair',     // PAA bireysel öğe
      '[jscontroller="HsH5lb"]',    // PAA ana kontrolcüsü
      'div[data-initq="paa"]',      // Alternatif PAA konteyneri

      // "People Also Search For" kartları (arama geçmişi önerileri)
      '.fl[jsname]',                // PASF kartları
      '.iQXTJc',                    // PASF konteyneri

      // "Discussions & Forums" (Reddit vs. blokları)
      // İstersen bu satırı yorum yaparak kaldırabilirsin
      // '.ULSxyf',                 // Discussions konteyneri — kapalı bırakıldı

      // Bilgi Paneli (Knowledge Panel) sağ sidebar
      // Bu çok agresif olabilir, dikkatli kullan
      // '#rhs',                    // Sağ sidebar tümü — kapalı bırakıldı
      // '.kp-wholepage',           // Knowledge panel — kapalı bırakıldı

      // "See results about" — anlam ayrımı kartları
      '.TuS8Ad',

      // "Featured Snippet" kutusu (isteğe bağlı — organik ama ayrı kutu)
      // İstersen aç: '.ifM9O', '.osrp-blk'
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // BING — REKLAMLAR
  // ════════════════════════════════════════════════════════════════
  bing_ads: {
    enabled: true,
    label: 'Bing Ads',
    selectors: [

      // Bing üst ve alt reklam blokları
      '#b_results .b_ad',         // Reklam li elementi
      '.b_adBottom',              // Alt reklam konteyneri
      '#b_pole',                  // Üst reklam kutupsu (pole)

      // Bing alışveriş reklamları
      '.b_poleTop',
      '.b_shoppingSG',
      '.b_productpage',
      '[data-tag="ads"]',

      // Bing "Ad" etiketi taşıyan sonuçlar
      '.b_label',                 // "Ad" yazısının olduğu span konteyneri
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // BING — YAPAY ZEKA (Copilot / Bing AI)
  // ════════════════════════════════════════════════════════════════
  bing_ai: {
    enabled: true,
    label: 'Bing AI',
    selectors: [
      // Bing Copilot AI cevap kutusu
      '#b_sydConvCont',          // Copilot konuşma konteyneri
      '.b_ai_serp',              // AI SERP bloğu
      '.sydney-serp-mod',        // Sydney (Copilot) modülü
      '[id^="b_copilot"]',       // Copilot ID ile başlayan elementler
    ],
  },
};

// ─── YARDIMCI: TÜM SELECTORLERİ BİRLEŞTİR ───────────────────────────────────

function getActiveSelectors() {
  return Object.values(FILTER_GROUPS)
    .filter(g => g.enabled)
    .flatMap(g => g.selectors)
    .join(', ');
}

// ─── ELEMENT GİZLE ────────────────────────────────────────────────────────────

function hideEl(el) {
  if (el && el.style.display !== 'none') {
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('data-ssh-hidden', '1');
  }
}

function showEl(el) {
  el.style.removeProperty('display');
  el.removeAttribute('data-ssh-hidden');
}

// ─── "SPONSORED" METNİ İÇEREN ELEMENTLERİ YAKALA ────────────────────────────
// Google bazen reklam bloklarını sabit bir class yerine
// içlerindeki "Sponsored" / "Sponsorlu" metniyle işaretler.
// Bu fonksiyon o metin içeren en dıştaki sonuç div'ini gizler.

const SPONSORED_TEXTS = [
  'sponsored', 'sponsorlu', 'reklamlı', 'ad ·', '· ad',
  'anzeige', 'annonce', 'publicité', 'patrocinado',
];

function hideSponsoredByText(root = document) {
  // .uEierd sınıfı "Sponsored" spanının kendisi
  root.querySelectorAll('.uEierd, [aria-label*="ponsor"], [aria-label*="Reklam"]').forEach(span => {
    // Üst sonuç container'ını bul (genellikle .g veya data-hveid taşıyan div)
    const container = span.closest('[data-hveid], .mnr-c, .MjjYud, .tF2Cxc');
    if (container) hideEl(container);
    else hideEl(span.parentElement?.parentElement);
  });

  // Text tabanlı tarama — güvenlik katmanı
  root.querySelectorAll('span, div[role]').forEach(el => {
    const text = (el.textContent || '').trim().toLowerCase();
    if (el.children.length === 0 && SPONSORED_TEXTS.some(t => text === t || text.startsWith(t + ' '))) {
      const container = el.closest('[data-hveid], .MjjYud, .mnr-c, li');
      if (container) hideEl(container);
    }
  });
}

// ─── ANA FİLTRELEME FONKSİYONU ───────────────────────────────────────────────

function applyFilters(root = document) {
  if (!isEnabled) return;

  const sel = getActiveSelectors();

  // Selector bazlı gizleme
  try {
    root.querySelectorAll(sel).forEach(hideEl);
  } catch (_) {}

  // Metin bazlı "Sponsored" tespiti
  hideSponsoredByText(root);
}

// ─── GİZLENEN HER ŞEYİ GERİ GETİR ──────────────────────────────────────────

function removeFilters() {
  document.querySelectorAll('[data-ssh-hidden]').forEach(showEl);
}

// ─── MUTATION OBSERVER ────────────────────────────────────────────────────────
// Google dinamik olarak sonuç yükler; her yeni node'u tara.

let rafId = null;

function scheduleFilter() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (isEnabled) applyFilters();
  });
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(() => scheduleFilter());
  observer.observe(document.documentElement, {
    childList: true,
    subtree:   true,
  });
}

function stopObserver() {
  if (observer) { observer.disconnect(); observer = null; }
  if (rafId)    { cancelAnimationFrame(rafId); rafId = null; }
}

// ─── STATE YÖNETİMİ ───────────────────────────────────────────────────────────

function enable() {
  isEnabled = true;
  applyFilters();
  startObserver();
}

function disable() {
  isEnabled = false;
  stopObserver();
  removeFilters();
}

// ─── POPUP'TAN GELEN MESAJLAR ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SSH_ENABLE')  enable();
  if (msg.type === 'SSH_DISABLE') disable();
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get(['enabled'], (result) => {
  isEnabled = result.enabled !== false; // varsayılan: açık

  if (isEnabled) {
    // document_start'ta çalışıyoruz — DOM hazır değil olabilir
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => applyFilters());
    } else {
      applyFilters();
    }
    startObserver();
  }
});
