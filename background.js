chrome.runtime.onInstalled.addListener(async () => {
  // デフォルトでは何も設定しない（無効化状態）
  console.log('Extension installed - no default formats set');
  
  // 古い不正な設定（'markdown', 'richtext' などの文字列）をクリア
  const stored = await chrome.storage.sync.get(null);
  const toRemove = [];
  
  for (const [domain, format] of Object.entries(stored)) {
    if (format === 'markdown' || format === 'richtext' || format === 'plain') {
      toRemove.push(domain);
    }
  }
  
  if (toRemove.length > 0) {
    await chrome.storage.sync.remove(toRemove);
    console.log('Removed old invalid format settings:', toRemove);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    const domain = new URL(tab.url).hostname;
    const settings = await chrome.storage.sync.get(domain);
    const format = settings[domain] || 'auto';
    
    if (format !== 'auto') {
      chrome.tabs.sendMessage(activeInfo.tabId, { action: 'startListening' });
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = new URL(tab.url).hostname;
    const settings = await chrome.storage.sync.get(domain);
    const format = settings[domain] || 'auto';
    
    if (format !== 'auto') {
      chrome.tabs.sendMessage(tabId, { action: 'startListening' });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getFormat') {
    const domain = message.domain;
    chrome.storage.sync.get(domain).then(settings => {
      console.log('🔍 Background getFormat for domain:', domain, 'settings:', settings);
      const format = settings[domain] || '';
      console.log('🔍 Returning format:', format);
      sendResponse({ format: format });
    });
    return true; // Keep message channel open for async response
  } else if (message.action === 'setFormat') {
    const { domain, format } = message;
    console.log('💾 Background setFormat for domain:', domain, 'format:', format);
    chrome.storage.sync.set({ [domain]: format }).then(() => {
      console.log('💾 Saved to storage');
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  } else if (message.action === 'deleteFormat') {
    const { domain } = message;
    chrome.storage.sync.remove(domain).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  } else if (message.action === 'getAllFormats') {
    chrome.storage.sync.get(null).then(allSettings => {
      sendResponse({ formats: allSettings });
    });
    return true; // Keep message channel open for async response
  }
});