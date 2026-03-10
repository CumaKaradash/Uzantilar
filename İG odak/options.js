// Varsayılan ayarlar
const DEFAULT_SETTINGS = {
  hideReels: true,
  hideExplore: true,
  hideNotifications: true,
  hideStories: false
};

// Ayarları yükeleme ve arayüzü doldurma
async function loadSettings() {
  // chrome.storage.sync'den değerleri oku, yoksa varsayılanları kullan
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  // Checkboxları güncelle
  for (const [key, value] of Object.entries(stored)) {
    const el = document.getElementById(key);
    if (el) el.checked = Boolean(value);
  }
}

// Değişiklikleri kaydet
function bindAutoSave() {
  // Sayfadaki tüm checkboxları dinle ve her değişikliği kaydet
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', async () => {
      const key = input.id;
      const value = input.checked;
      // Değeri kaydet
      await chrome.storage.sync.set({ [key]: value });
      // İsteğe bağlı: küçük bir görsel geri bildirim
      input.nextElementSibling.classList.add('pulse');
      setTimeout(() => input.nextElementSibling.classList.remove('pulse'), 300);
    });
  });
}

// İlk yükleme
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  bindAutoSave();
});