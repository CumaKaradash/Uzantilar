/**
 * High-Contrast Sovereign — content.js
 *
 * ════════════════════════════════════════════════════════════════════════════
 * MİMARİ
 * ════════════════════════════════════════════════════════════════════════════
 *
 * 3 kontrast modu, iki farklı teknikle uygulanır:
 *
 * ┌─────────────────┬──────────────────────────────────────────────────────┐
 * │ MOD             │ TEKNİK                                               │
 * ├─────────────────┼──────────────────────────────────────────────────────┤
 * │ yellow-black    │ <style> enjeksiyonu — CSS !important ile tüm renk   │
 * │                 │ stillerini eze. MutationObserver ile dinamik içerik. │
 * ├─────────────────┼──────────────────────────────────────────────────────┤
 * │ inverted        │ html { filter: invert(100%) hue-rotate(180deg) }     │
 * │                 │ + img, video, canvas { filter: invert(100%) ... }    │
 * │                 │ İkinci invert orijinal rengi geri getirir.           │
 * ├─────────────────┼──────────────────────────────────────────────────────┤
 * │ grayscale       │ html { filter: grayscale(100%) contrast(120%) }      │
 * └─────────────────┴──────────────────────────────────────────────────────┘
 *
 * ════════════════════════════════════════════════════════════════════════════
 * GÜNCELLEME REHBERİ
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Yeni bir renk kuralı eklemek:
 *   → YELLOW_BLACK_CSS sabitini güncelle
 *
 * Yeni bir mod eklemek:
 *   → MODES nesnesine yeni giriş ekle
 *   → applyMode() switch bloğuna yeni case ekle
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

// ─── GUARD — Çoklu enjeksiyonu önle ──────────────────────────────────────────
if (typeof window.__hcsLoaded === 'undefined') {
window.__hcsLoaded = true;

// ─── STATE ────────────────────────────────────────────────────────────────────
let isEnabled    = false;
let currentMode  = 'yellow-black';
let observer     = null;

// ─── SABİTLER ────────────────────────────────────────────────────────────────

const STYLE_ID   = 'hcs-style';     // Enjekte edilen <style> elementi ID'si
const FILTER_ID  = 'hcs-filter';    // Filter modu <style> ID'si

// ─── WCAG AAA — SARI / SİYAH CSS ─────────────────────────────────────────────
/*
 * Sarı (#FFFF00) üzerine Siyah (#000000):
 *   Kontrast oranı = 19.98:1  (WCAG AAA eşiği: 7:1)
 *
 * Hedeflenen elementler:
 *   - Tüm arkaplanlar → siyah
 *   - Tüm metinler    → sarı
 *   - Linkler         → parlak sarı (altı çizili olarak)
 *   - Kenarlıklar     → koyu sarı (görünürlük için)
 *   - Görseller       → yüksek kontrast filtresi
 *   - Form elementleri → siyah zemin, sarı metin
 *
 * GÜNCELLEME: Belirli bir site'in class'ı bu kuralları ezmek istiyorsa,
 * aşağıya daha spesifik bir override ekle.
 */
const YELLOW_BLACK_CSS = `
  /* ── TEMEL RESET ─────────────────────────────────────────────────────────
   * !important kullanımı zorunludur; site stil önceliğini geçmek için.
   * Tüm elementleri, pseudo-elementleri ve shadow-root dışındaki
   * içerikleri hedefliyoruz.
   */
  html, body,
  *, *::before, *::after {
    background-color: #000000 !important;
    background-image: none    !important;  /* Arka plan görsellerini kaldır */
    background: #000000       !important;
    color: #FFFF00            !important;
    border-color: #886600     !important;  /* Kontrast: 4.5:1 (AA) */
    text-shadow: none         !important;
    box-shadow: none          !important;
    outline-color: #FFFF00    !important;
  }

  /* ── LİNKLER ────────────────────────────────────────────────────────────
   * Ziyaret edilmemiş → parlak sarı, altı çizgili
   * Ziyaret edilmiş   → açık sarı-turuncu (ayırt edilebilir)
   * Hover             → beyaz (maksimum görünürlük)
   * Focus             → beyaz outline (keyboard nav için)
   */
  a:link,
  a:link * {
    color: #FFFF00   !important;
    text-decoration: underline !important;
  }

  a:visited,
  a:visited * {
    color: #FFCC44   !important;
    text-decoration: underline !important;
  }

  a:hover,
  a:hover * {
    color: #FFFFFF   !important;
    text-decoration: underline !important;
  }

  a:focus,
  a:focus-visible,
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 3px solid #FFFFFF !important;
    outline-offset: 2px        !important;
  }

  /* ── BAŞLIKLAR ───────────────────────────────────────────────────────────
   * Başlıkları beyaz yaparak metin hiyerarşisini koru (sarı = normal metin)
   */
  h1, h2, h3, h4, h5, h6,
  h1 *, h2 *, h3 *, h4 *, h5 *, h6 * {
    color: #FFFFFF !important;
  }

  /* ── FORM ELEMENTLERİ ────────────────────────────────────────────────────
   * Input, select, textarea için kenarlık görünür olsun.
   */
  input, textarea, select, button {
    background-color: #111100 !important;
    color: #FFFF00            !important;
    border: 1px solid #FFFF00 !important;
  }

  button {
    background-color: #222200 !important;
  }

  /* ── PLACEHOLDER ─────────────────────────────────────────────────────────
   */
  ::placeholder {
    color: #888800 !important;
    opacity: 1     !important;
  }

  /* ── SEÇİM RENGİ ─────────────────────────────────────────────────────────
   * Metin seçildiğinde görünürlük
   */
  ::selection {
    background-color: #FFFF00 !important;
    color: #000000            !important;
  }

  /* ── GÖRSELLER VE MEDYA ──────────────────────────────────────────────────
   * Görsellere yüksek kontrast filtresi uygula.
   * invert(1) + sepia(0) → orijinal renkleri çok yüksek kontrastla göster
   * Tamamen gizlenmez — sadece kontrast artırılır.
   */
  img, video, canvas, svg, picture, figure {
    background-color: transparent !important;
    background: transparent       !important;
    filter: contrast(150%) brightness(0.9) !important;
  }

  /* SVG iç elementleri — fill/stroke renkleri sıfırlanır */
  svg *, svg path, svg circle, svg rect, svg polygon, svg line {
    fill:   #FFFF00 !important;
    stroke: #FFFF00 !important;
  }

  /* ── TABLOLAR ────────────────────────────────────────────────────────────
   */
  th {
    background-color: #1a1a00 !important;
    color: #FFFFFF            !important;
    border: 1px solid #FFFF00 !important;
  }

  td {
    border: 1px solid #886600 !important;
  }

  tr:nth-child(even) {
    background-color: #0a0a00 !important;
  }

  /* ── SCROLLBAR ───────────────────────────────────────────────────────────
   * Webkit tarayıcılarda scrollbar görünürlüğü
   */
  ::-webkit-scrollbar {
    background: #000000 !important;
  }

  ::-webkit-scrollbar-thumb {
    background: #FFFF00 !important;
  }

  /* ── KOD BLOKLARI ────────────────────────────────────────────────────────
   */
  code, pre, kbd, samp {
    background-color: #111100 !important;
    color: #00FF88            !important;  /* Yeşil — kodları ayırt et */
    border: 1px solid #444400 !important;
  }
`;

// ─── KONTRAST MOD TANIMLARI ───────────────────────────────────────────────────

const MODES = {
  'yellow-black': {
    type: 'stylesheet',  // CSS !important enjeksiyonu
    label: 'Yellow on Black',
  },
  'inverted': {
    type: 'filter',
    // html root'a uygulanan filtre
    htmlFilter: 'invert(100%) hue-rotate(180deg)',
    // Görseller iki kez ters çevrilerek orijinal haline döner
    mediaFilter: 'invert(100%) hue-rotate(180deg)',
    label: 'Inverted',
  },
  'grayscale': {
    type: 'filter',
    htmlFilter: 'grayscale(100%) contrast(125%)',
    mediaFilter: 'none',  // görseller de gri kalır
    label: 'Grayscale',
  },
};

// ─── STYLE ENJEKSIYONU ───────────────────────────────────────────────────────

function injectStylesheet(css, id) {
  removeElement(id);
  const style = document.createElement('style');
  style.id   = id;
  style.type = 'text/css';
  style.textContent = css;
  // <head> varsa oraya, yoksa <html> root'una ekle
  (document.head || document.documentElement).appendChild(style);
}

function removeElement(id) {
  document.getElementById(id)?.remove();
}

// ─── FILTER MOD CSS ÜRETICI ──────────────────────────────────────────────────

function buildFilterCSS(mode) {
  const cfg = MODES[mode];
  if (!cfg || cfg.type !== 'filter') return '';

  const mediaReset = cfg.mediaFilter !== 'none'
    ? `
      /* Görseller, videolar ve canvas iki kez filtre uygulanarak
         orijinal görünümlerine döner (filtre + ters filtre = nötr) */
      img, video, canvas, picture, iframe {
        filter: ${cfg.mediaFilter} !important;
      }
    `
    : '';

  return `
    html {
      filter: ${cfg.htmlFilter} !important;
    }
    ${mediaReset}
  `;
}

// ─── MOD UYGULAMA ─────────────────────────────────────────────────────────────

function applyMode(mode) {
  // Önce tüm önceki stilleri temizle
  removeElement(STYLE_ID);
  removeElement(FILTER_ID);

  if (!isEnabled) return;

  const cfg = MODES[mode];
  if (!cfg) return;

  switch (cfg.type) {

    case 'stylesheet':
      // Sarı/Siyah — kapsamlı CSS !important enjeksiyonu
      injectStylesheet(YELLOW_BLACK_CSS, STYLE_ID);
      break;

    case 'filter':
      // Inverted / Grayscale — html elemanına filter uygula
      injectStylesheet(buildFilterCSS(mode), FILTER_ID);
      break;
  }
}

// ─── ETKİNLEŞTİR / DEVReDIŞI ─────────────────────────────────────────────────

function enable(mode) {
  isEnabled   = true;
  currentMode = mode || currentMode;
  applyMode(currentMode);

  // Sarı/Siyah modunda MutationObserver başlat
  // (CSS zaten !important ile tüm sonraki içerikleri kapsar,
  //  ancak yüklenen <style> elementleri override edebilir)
  if (currentMode === 'yellow-black') {
    startObserver();
  }
}

function disable() {
  isEnabled = false;
  removeElement(STYLE_ID);
  removeElement(FILTER_ID);
  stopObserver();
}

function changeMode(mode) {
  currentMode = mode;
  if (isEnabled) {
    applyMode(mode);
    if (mode === 'yellow-black') startObserver();
    else stopObserver();
  }
}

// ─── MUTATION OBSERVER ────────────────────────────────────────────────────────
/*
 * Sarı/Siyah modunda bazı sayfalar dinamik olarak <style> veya inline style
 * ekleyerek renkleri değiştirebilir. Observer bu eklentileri tespit ederek
 * bizim <style> elementimizi her zaman en sonda (en yüksek öncelikte) tutar.
 *
 * NOT: CSS !important kullanıldığı için çoğu senaryoda buna gerek yoktur.
 * Bu, en agresif sayfalar için ek bir güvence katmanıdır.
 */

let reorderRaf = null;

function ensureStyleLast() {
  if (reorderRaf) return;
  reorderRaf = requestAnimationFrame(() => {
    reorderRaf = null;
    const style = document.getElementById(STYLE_ID);
    if (!style) return;
    const parent = style.parentNode;
    // Zaten son element değilse sona taşı
    if (parent && parent.lastElementChild !== style) {
      parent.appendChild(style);
    }
  });
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(mutations => {
    if (!isEnabled || currentMode !== 'yellow-black') return;
    for (const m of mutations) {
      // Yeni <style> veya <link> eklendi mi?
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE &&
            (node.tagName === 'STYLE' || node.tagName === 'LINK') &&
            node.id !== STYLE_ID) {
          ensureStyleLast();
          break;
        }
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree:   true,
  });
}

function stopObserver() {
  if (observer) { observer.disconnect(); observer = null; }
  if (reorderRaf) { cancelAnimationFrame(reorderRaf); reorderRaf = null; }
}

// ─── DOM HAZIR OLMADAN ÖNCE APPLY ────────────────────────────────────────────
/*
 * document_start'ta çalıştığımız için <head> yoktur.
 * <style> elementi document.documentElement'e (html tag) eklenir.
 * DOMContentLoaded sonrasında <head>'e taşınır.
 */
function relocateStyle() {
  const style = document.getElementById(STYLE_ID) || document.getElementById(FILTER_ID);
  if (!style || !document.head) return;
  if (style.parentNode !== document.head) {
    document.head.appendChild(style);
  }
}

document.addEventListener('DOMContentLoaded', relocateStyle, { once: true });

// ─── POPUP'TAN GELEN MESAJLAR ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'HCS_ENABLE':
      enable(msg.mode);
      sendResponse({ ok: true });
      break;
    case 'HCS_DISABLE':
      disable();
      sendResponse({ ok: true });
      break;
    case 'HCS_SET_MODE':
      changeMode(msg.mode);
      sendResponse({ ok: true });
      break;
    case 'HCS_GET_STATE':
      sendResponse({ enabled: isEnabled, mode: currentMode });
      break;
  }
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get(['enabled', 'mode'], (result) => {
  currentMode = result.mode || 'yellow-black';
  if (result.enabled === true) {
    isEnabled = true;
    applyMode(currentMode);
    if (currentMode === 'yellow-black') startObserver();
  }
});

} // end hcs guard
