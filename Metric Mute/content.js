/**
 * Metric Mute — content.js  (v2 — Robust Edition)
 *
 * STRATEJİ:
 * Sadece CSS sınıfı yerine DOM text node taraması kullanıyoruz.
 * Bu sayede platformlar class adlarını değiştirdiğinde eklenti bozulmuyor.
 *
 * NASIL ÇALIŞIR:
 * 1. Sayfadaki tüm text node'ları tarar
 * 2. Sadece sayı/metrik içerenleri (1K, 2.3M, 450, vb.) hedefler
 * 3. O text node'un en yakın küçük sarmalayıcı span/div'ini gizler
 * 4. İkon butonlarına dokunmaz — sadece yanındaki rakam elementini gizler
 * 5. MutationObserver ile infinite scroll'da gelen yeni içerikleri yakalar
 *
 * GÜNCELLEME REHBERİ:
 * Bir platform hâlâ metrik gösteriyorsa:
 *   1. DevTools'da elementi sağ tıkla > Inspect
 *   2. Rakamı içeren en küçük elementi bul
 *   3. EXTRA_SELECTORS dizisine stabil bir selector ekle
 */

// ─── STATE ────────────────────────────────────────────────────────────────────
let isEnabled = true;
let observer  = null;
const ATTR    = 'data-mm-hidden';

// ─── METRIC REGEX ─────────────────────────────────────────────────────────────
// Yakalar: 1234 | 1,234 | 1K | 1.2K | 2.3M | 128 Mn | vs.
const METRIC_RE = /^\s*\+?\d[\d,.']*\s*([KkMmBbGgTt]|Mn|mn)?\s*$|^\s*\d{1,3}([,.\s]\d{3})+\s*$/;

// YouTube yerelleştirilmiş metinler: "128 Mn görüntülenme", "1.2K views"
const YT_VIEW_RE = /\d[\d,.']*\s*(Mn|K|M|B|bin|thousand|million|görüntülenme|views?|izlenme|watching)/i;

function isMetricText(text) {
  const t = (text || '').trim();
  if (!t || t.length > 30) return false;
  return METRIC_RE.test(t) || YT_VIEW_RE.test(t);
}

// ─── ELEMENT GIZLEME ─────────────────────────────────────────────────────────

function hideEl(el) {
  if (!el || el.hasAttribute(ATTR)) return;
  el.setAttribute(ATTR, '1');
  el.style.setProperty('opacity',        '0',    'important');
  el.style.setProperty('pointer-events', 'none', 'important');
  el.style.setProperty('user-select',    'none', 'important');
}

function showEl(el) {
  if (!el) return;
  el.removeAttribute(ATTR);
  el.style.removeProperty('opacity');
  el.style.removeProperty('pointer-events');
  el.style.removeProperty('user-select');
}

// ─── TEXT NODE'DAN HEDEF ELEMENTİ BUL ────────────────────────────────────────
// Text node'u içeren en yakın, küçük inline elementi döndürür.

const OK_TAGS   = new Set(['span','div','p','a','strong','em','bdi','cite','li',
                           'yt-formatted-string','faceplate-number','dd']);
const SKIP_TAGS = new Set(['script','style','noscript','textarea','input',
                           'button','svg','path','nav','header','footer']);

function getTargetElement(textNode) {
  let el = textNode.parentElement;
  if (!el) return null;

  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return null;
  if (!OK_TAGS.has(tag))  return null;

  // Element çok fazla metin içeriyorsa bu bir metrik değil
  const inner = (el.innerText || el.textContent || '').trim();
  if (inner.length > 30) return null;

  return el;
}

// ─── TEXT NODE TARAYICI ───────────────────────────────────────────────────────

function scanTextNodes(root) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const text = node.textContent || '';
        if (!isMetricText(text)) return NodeFilter.FILTER_REJECT;

        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const pTag = parent.tagName.toLowerCase();
        if (SKIP_TAGS.has(pTag)) return NodeFilter.FILTER_REJECT;

        // Zaten gizli bir elementin içindeyse atla
        if (parent.closest(`[${ATTR}]`)) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const targets = [];
  let node;
  while ((node = walker.nextNode())) {
    const el = getTargetElement(node);
    if (el) targets.push(el);
  }
  targets.forEach(hideEl);
}

// ─── PLATFORM-SPESİFİK EK SELEKTÖRLER ────────────────────────────────────────
// Text taramasına ek güvenlik katmanı.
// Selector işe yaramazsa sessizce geçilir — try/catch ile sarılı.
//
// !! GÜNCELLEME: Bu listeye yeni selektör ekleyebilirsin.
//    DevTools > Elements > İstenen elementi sağ tıkla > "Copy > Copy selector"

const EXTRA_SELECTORS = [

  // ── X / TWITTER ─────────────────────────────────────────────────────────────
  // data-testid'ler Twitter'ın test altyapısından gelir — nispeten stabil
  '[data-testid="like"]      [data-testid="app-text-transition-container"]',
  '[data-testid="retweet"]   [data-testid="app-text-transition-container"]',
  '[data-testid="unretweet"] [data-testid="app-text-transition-container"]',
  '[data-testid="reply"]     [data-testid="app-text-transition-container"]',
  '[data-testid="bookmark"]  [data-testid="app-text-transition-container"]',
  '[data-testid="app-text-transition-container"]',
  // Profil sayfası follower / following
  'a[href$="/followers"] span',
  'a[href$="/following"] span',

  // ── YOUTUBE ─────────────────────────────────────────────────────────────────
  // Video sayfası — beğeni sayısı
  '#segmented-like-button yt-formatted-string',
  '#like-button yt-formatted-string',
  'like-button-view-model .yt-spec-button-shape-next__button-text-content',
  'dislike-button-view-model .yt-spec-button-shape-next__button-text-content',
  // Video sayfası — izlenme & abone
  '.view-count',
  'ytd-video-view-count-renderer .view-count',
  '#owner-sub-count',
  'yt-formatted-string#owner-sub-count',
  // Yorum sayısı
  '#count yt-formatted-string',
  // ── ANA SAYFA / ARAMA / SIDEBAR görüntülenme sayıları ────────────────────
  // ytd-video-renderer ve ytd-rich-item-renderer içindeki meta bilgileri
  'ytd-video-meta-block #metadata-line span.inline-metadata-item',
  'ytd-video-renderer    #metadata-line span.inline-metadata-item',
  'ytd-rich-item-renderer #metadata-line span.inline-metadata-item',
  'ytd-compact-video-renderer #metadata-line span.inline-metadata-item',
  'ytd-grid-video-renderer    #metadata-line span.inline-metadata-item',
  'ytd-reel-item-renderer     #metadata-line span.inline-metadata-item',
  // Shorts görüntülenme (ana sayfa)
  'ytd-reel-item-renderer #overlay-metadata span',
  'ytm-shorts-lockup-view-model-v2 .shortsLockupViewModelHostMetadataSubhead',
  // Genel — herhangi bir inline-metadata-item (görüntülenme, tarih birlikte gelir)
  'span.inline-metadata-item',
  // yt-formatted-string genel (abone, beğeni vb.)
  'yt-formatted-string.ytd-video-meta-block',

  // ── LINKEDIN ────────────────────────────────────────────────────────────────
  '.social-details-social-counts__reactions-count',
  '.social-details-social-counts__comments',
  '.social-counts-reactions__count',
  '.social-details-social-counts__item span[aria-hidden="true"]',
  '.org-top-card-summary-info-list__info-item',
  '.pvs-header__subtitle span[aria-hidden="true"]',
  '.ca-entry-point__num-views',

  // ── INSTAGRAM ────────────────────────────────────────────────────────────────
  // Instagram class'ları obfüske — text taraması burada daha etkili.
  // Ek olarak stabil aria tabanlı hedefler:
  'section[aria-label] span > span',
];

function applyExtraSelectors(root) {
  EXTRA_SELECTORS.forEach(sel => {
    try {
      (root === document.body ? document : root).querySelectorAll(sel).forEach(el => {
        const text = (el.innerText || el.textContent || '').trim();
        if (text.length > 0 && text.length <= 30 && isMetricText(text)) {
          hideEl(el);
        }
      });
    } catch (_) { /* geçersiz selector — sessizce atla */ }
  });
}

// ─── ANA GİZLEME FONKSİYONU ─────────────────────────────────────────────────

function hideMetrics(root) {
  const r = root || document.body;
  if (!r) return;
  scanTextNodes(r);
  applyExtraSelectors(r);
}

function showMetrics() {
  document.querySelectorAll(`[${ATTR}]`).forEach(showEl);
}

// ─── MUTATION OBSERVER ────────────────────────────────────────────────────────

let rafPending = false;

function scheduleHide() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    if (isEnabled) hideMetrics();
  });
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(mutations => {
    if (!isEnabled) return;
    for (const m of mutations) {
      if (m.addedNodes.length || m.type === 'characterData') {
        scheduleHide();
        break;
      }
    }
  });
  observer.observe(document.body, {
    childList: true, subtree: true, characterData: true
  });
}

function stopObserver() {
  if (observer) { observer.disconnect(); observer = null; }
}

// ─── STATE ────────────────────────────────────────────────────────────────────

function applyState() {
  if (isEnabled) {
    hideMetrics();
    startObserver();
  } else {
    stopObserver();
    showMetrics();
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get(['enabled'], (result) => {
  isEnabled = result.enabled !== false;
  applyState();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) {
    isEnabled = changes.enabled.newValue;
    applyState();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (isEnabled) hideMetrics();
  });
}

// YouTube SPA: yt-navigate-finish eventi sayfa geçişlerinde tetiklenir
window.addEventListener('yt-navigate-finish', () => {
  if (isEnabled) {
    // Yeni sayfa DOM'u oluşturmak için kısa bir bekleme
    setTimeout(() => hideMetrics(), 300);
    setTimeout(() => hideMetrics(), 1000);
  }
});
