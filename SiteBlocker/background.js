// Engelleme işlemini yapan ortak fonksiyon
function checkAndBlockSite(url, tabId) {
  chrome.storage.local.get(['blockedSites'], (result) => {
    const blockedSites = result.blockedSites || [];
    
    try {
      const currentUrl = new URL(url);
      const currentHostname = currentUrl.hostname; // Örn: www.facebook.com

      // Girilen URL'nin hostname'i engelli listemizdeki herhangi bir domaini içeriyor mu?
      const isBlocked = blockedSites.some(site => currentHostname.includes(site));

      if (isBlocked) {
        // Uzantının kendi içindeki uyarı sayfasının tam yolunu al
        const blockPageUrl = chrome.runtime.getURL("blocked.html");
        
        // Sonsuz döngüye girmemek için, sekme zaten uyarı sayfasında değilse yönlendir
        if (url !== blockPageUrl) {
          chrome.tabs.update(tabId, { url: blockPageUrl });
        }
      }
    } catch (error) {
      console.log("Geçersiz veya işlenemeyen URL:", url);
    }
  });
}

// 1. Normal sayfa yüklemeleri ve sekmelerdeki URL değişiklikleri için
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    checkAndBlockSite(changeInfo.url, tabId);
  }
});

// 2. YouTube, Instagram gibi sayfayı yenilemeden URL değiştiren (SPA) siteler için
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.url) {
    checkAndBlockSite(details.url, details.tabId);
  }
});