// Color Blind Helper — background.js

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'content') return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) { sendResponse({ ok: false }); return; }
    chrome.tabs.sendMessage(tabs[0].id, message, (resp) => {
      if (chrome.runtime.lastError) sendResponse({ ok: false });
      else sendResponse(resp || { ok: true });
    });
  });
  return true;
});
