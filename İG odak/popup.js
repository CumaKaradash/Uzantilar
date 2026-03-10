// Popup: hızlı ayarlar. Değişiklikleri chrome.storage.sync'e yazar ve açık Instagram sekmelerine uygulatır.
const DEFAULT_SETTINGS = {
  hideReels: true,
  hideExplore: true,
  hideNotifications: true,
  hideStories: false
};

const UI_DEFAULTS = {
  popupTheme: 'dark',
  popupLang: 'tr'
};

async function loadSettings() {
  const stored = await chrome.storage.sync.get({ ...DEFAULT_SETTINGS, ...UI_DEFAULTS });
  for (const [key, value] of Object.entries(stored)) {
    const el = document.getElementById(key);
    if (el) el.checked = Boolean(value);
  }
  setTheme(stored.popupTheme || 'dark');
  setLang(stored.popupLang || 'tr');
  updateThemeButton(stored.popupTheme || 'dark');
  updateLangButton(stored.popupLang || 'tr');
}

function bindAutoSave() {
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', async () => {
      const key = input.id;
      const value = input.checked;
      await chrome.storage.sync.set({ [key]: value });
      // Aktif Instagram sekmesine haber ver; içerik betiği ayarları uygulasın
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && /https?:\/\/(www\.)?instagram\.com/.test(tab.url || '')) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'settings_updated' });
        } catch (e) {
          // İçerik betiği enjekte edilmemiş olabilir; sessiz geç
        }
      }
      input.nextElementSibling.classList.add('pulse');
      setTimeout(() => input.nextElementSibling.classList.remove('pulse'), 300);
    });
  });

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', async () => {
      const cur = (document.documentElement.getAttribute('data-theme') || 'dark');
      const next = cur === 'dark' ? 'light' : 'dark';
      setTheme(next);
      updateThemeButton(next);
      await chrome.storage.sync.set({ popupTheme: next });
    });
  }

  const lbtn = document.getElementById('langToggle');
  if (lbtn) {
    lbtn.addEventListener('click', async () => {
      const cur = (document.documentElement.getAttribute('data-lang') || 'tr');
      const next = cur === 'tr' ? 'en' : 'tr';
      setLang(next);
      updateLangButton(next);
      updateTexts(next);
      await chrome.storage.sync.set({ popupLang: next });
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  bindAutoSave();
});

// Harici bağlantılar
const GITHUB_URL = 'https://github.com/CumaKaradash';
const BMC_URL = 'https://buymeacoffee.com/cumakaradash';

const githubBtn = document.getElementById('githubBtn');
if (githubBtn) {
  githubBtn.addEventListener('click', async () => {
    try {
      await chrome.tabs.create({ url: GITHUB_URL });
    } catch {
      window.open(GITHUB_URL, '_blank');
    }
  });
}
const bmcBtn = document.getElementById('bmcBtn');
if (bmcBtn) {
  bmcBtn.addEventListener('click', async () => {
    try {
      await chrome.tabs.create({ url: BMC_URL });
    } catch {
      window.open(BMC_URL, '_blank');
    }
  });
}

// Tema uygula
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function updateThemeButton(theme) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const MOON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const SUN_SVG  = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  btn.innerHTML = theme === 'dark' ? MOON_SVG : SUN_SVG;
  const lang = document.documentElement.getAttribute('data-lang') || 'tr';
  btn.title = lang === 'tr'
    ? (theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç')
    : (theme === 'dark' ? 'Switch to Light' : 'Switch to Dark');
}

function setLang(lang) {
  document.documentElement.setAttribute('data-lang', lang);
  updateTexts(lang);
}

function updateLangButton(lang) {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  btn.textContent = lang === 'tr' ? 'TR' : 'EN';
  btn.title = lang === 'tr' ? 'Dil değiştir' : 'Change language';
}

function updateTexts(lang) {
  const dict = {
    tr: {
      header: 'Odak Ayarları',
      hideReels: 'Reels videoları ve sekmeleri',
      hideExplore: 'Keşfet sayfası ve arama',
      hideNotifications: 'Bildirimler ve aktivite',
      hideStories: 'Hikayeler bölümü',
      footer: 'Cuma Karadash tarafından geliştirildi',
      bmc: 'Bir kahve ısmarla'
    },
    en: {
      header: 'Focus Settings',
      hideReels: 'Reels videos and tabs',
      hideExplore: 'Explore page and search',
      hideNotifications: 'Notifications and activity',
      hideStories: 'Stories section',
      footer: 'Developed by Cuma Karadash',
      bmc: 'Buy me a coffee'
    }
  }[lang] || {};

  const h = document.querySelector('header h1');
  if (h && dict.header) h.textContent = dict.header;

  const setLabel = (id, text) => {
    const el = document.getElementById(id);
    if (!el) return;
    const labelSpan = el.parentElement?.querySelector('.label');
    if (labelSpan && text) labelSpan.textContent = text;
  };
  setLabel('hideReels', dict.hideReels);
  setLabel('hideExplore', dict.hideExplore);
  setLabel('hideNotifications', dict.hideNotifications);
  setLabel('hideStories', dict.hideStories);

  const f = document.getElementById('footerText');
  if (f && dict.footer) f.textContent = dict.footer;

  const bmcBtn = document.getElementById('bmcBtn');
  if (bmcBtn && dict.bmc) {
    bmcBtn.textContent = dict.bmc;
    bmcBtn.title = dict.bmc;
  }
}