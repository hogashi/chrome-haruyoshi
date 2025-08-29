import { Message, MessageResponse } from './types';
import { findMatchingFormat } from './utils';

chrome.runtime.onInstalled.addListener(async () => {
  // デフォルトでは何も設定しない（無効化状態）
  
  // 古い不正な設定（'markdown', 'richtext' などの文字列）をクリア
  const stored = await chrome.storage.sync.get(null) as Record<string, any>;
  const toRemove: string[] = [];
  
  for (const [domain, format] of Object.entries(stored)) {
    if (format === 'markdown' || format === 'richtext' || format === 'plain') {
      toRemove.push(domain);
    }
  }
  
  if (toRemove.length > 0) {
    await chrome.storage.sync.remove(toRemove);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo: any) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const format = await findMatchingFormat(domain);
    
    if (format) {
      chrome.tabs.sendMessage(activeInfo.tabId, { action: 'startListening' } as Message);
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: any, tab: any) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const format = await findMatchingFormat(domain);
    
    if (format) {
      chrome.tabs.sendMessage(tabId, { action: 'startListening' } as Message);
    }
  }
});

chrome.runtime.onMessage.addListener((message: Message, sender: any, sendResponse: (response: MessageResponse) => void) => {
  if (message.action === 'getFormat') {
    const domain = message.domain!;
    chrome.storage.sync.get(domain).then((settings: Record<string, string>) => {
      const format = settings[domain] || '';
      sendResponse({ format: format });
    });
    return true; // Keep message channel open for async response
  } else if (message.action === 'setFormat') {
    const { domain, format } = message;
    chrome.storage.sync.set({ [domain!]: format! }).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  } else if (message.action === 'deleteFormat') {
    const { domain } = message;
    chrome.storage.sync.remove(domain!).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  } else if (message.action === 'getAllFormats') {
    chrome.storage.sync.get(null).then((allSettings: Record<string, string>) => {
      sendResponse({ formats: allSettings });
    });
    return true; // Keep message channel open for async response
  }
});