/**
 * Focus Breath — background.js (Service Worker)
 *
 * Sorumluluğu:
 *  - Kullanıcı ayarlarına göre chrome.alarms ile mola zamanlamak
 *  - Alarm tetiklendiğinde aktif sekmedeki content.js'e mesaj göndermek
 *  - Popup'tan gelen ayar değişikliklerini dinleyip alarmı yeniden kurmak
 */

const ALARM_NAME = 'focus-breath-break';

// ─── ALARM KURULUMU ───────────────────────────────────────────────────────────

async function setupAlarm() {
  const { enabled, interval } = await chrome.storage.local.get(['enabled', 'interval']);

  // Mevcut alarmı her durumda temizle
  await chrome.alarms.clear(ALARM_NAME);

  if (enabled === false) return; // Eklenti kapalıysa alarm kurma

  const minutes = parseInt(interval) || 30; // varsayılan 30 dk
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: minutes,
    periodInMinutes: minutes,
  });

  console.log(`[Focus Breath] Alarm kuruldu: her ${minutes} dakikada bir.`);
}

// ─── ALARM TETİKLENDİĞİNDE ────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  // Aktif sekmeyi bul
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.id) return;

  // URL erişilebilir mi kontrol et (chrome://, about: vb. sayfalar inject edilemez)
  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('about:') || url.startsWith('edge://')) return;

  try {
    // Content script'e nefes molası başlatma mesajı gönder
    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_BREATH' });
  } catch (err) {
    // Content script yüklü değilse scripting API ile enjekte et
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      // Kısa bekleme sonrası tekrar mesaj gönder
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_BREATH' });
        } catch (_) {}
      }, 500);
    } catch (_) {}
  }
});

// ─── MESAJLAŞMA (Popup ↔ Background) ─────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SETUP_ALARM') {
    setupAlarm().then(() => sendResponse({ ok: true }));
    return true; // async response
  }

  if (msg.type === 'TRIGGER_NOW') {
    // Popup'tan "Şimdi Test Et" tetiklemesi
    chrome.alarms.onAlarm.dispatch({ name: ALARM_NAME });
    sendResponse({ ok: true });
  }
});

// ─── UZANTISI YÜKLENDİĞİNDE / GÜNCELLENDIĞINDE ───────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  // Varsayılan ayarları storage'a yaz (sadece ilk kurulumda)
  const existing = await chrome.storage.local.get(['enabled', 'interval', 'theme', 'lang']);
  const defaults = {
    enabled:  existing.enabled  !== undefined ? existing.enabled  : true,
    interval: existing.interval !== undefined ? existing.interval : 30,
    theme:    existing.theme    || 'light',
    lang:     existing.lang     || 'en',
  };
  await chrome.storage.local.set(defaults);
  await setupAlarm();
});

// Service worker yeniden başladığında alarmı yeniden kur
chrome.runtime.onStartup.addListener(setupAlarm);
