const DEFAULT_FORMATS = {
  'github.com': 'markdown',
  'docs.google.com': 'richtext',
  'notion.so': 'markdown',
  'slack.com': 'markdown',
  'discord.com': 'markdown',
  'reddit.com': 'markdown'
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(null);
  const updates = {};
  
  for (const [domain, format] of Object.entries(DEFAULT_FORMATS)) {
    if (!(domain in stored)) {
      updates[domain] = format;
    }
  }
  
  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates);
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

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'getFormat') {
    const domain = message.domain;
    const settings = await chrome.storage.sync.get(domain);
    sendResponse({ format: settings[domain] || 'auto' });
  } else if (message.action === 'setFormat') {
    const { domain, format } = message;
    await chrome.storage.sync.set({ [domain]: format });
    sendResponse({ success: true });
  } else if (message.action === 'getAllFormats') {
    const allSettings = await chrome.storage.sync.get(null);
    sendResponse({ formats: allSettings });
  }
  return true;
});