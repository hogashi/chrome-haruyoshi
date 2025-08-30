/******/ "use strict";

;// ./src/utils.ts
function matchesDomain(currentDomain, pattern) {
    if (pattern === currentDomain)
        return true;
    if (pattern.startsWith('*.')) {
        const baseDomain = pattern.slice(2);
        return (currentDomain.endsWith('.' + baseDomain) || currentDomain === baseDomain);
    }
    return false;
}
async function findMatchingFormat(currentDomain) {
    try {
        const allSettings = (await chrome.storage.sync.get(null));
        if (allSettings[currentDomain]) {
            return allSettings[currentDomain];
        }
        for (const [pattern, format] of Object.entries(allSettings)) {
            if (matchesDomain(currentDomain, pattern)) {
                return format;
            }
        }
        return '';
    }
    catch (error) {
        console.error('Failed to find matching format:', error);
        return '';
    }
}

;// ./src/background.ts

chrome.runtime.onInstalled.addListener(async () => {
    const stored = (await chrome.storage.sync.get(null));
    const toRemove = [];
    for (const [domain, format] of Object.entries(stored)) {
        if (format === 'markdown' || format === 'richtext' || format === 'plain') {
            toRemove.push(domain);
        }
    }
    if (toRemove.length > 0) {
        await chrome.storage.sync.remove(toRemove);
    }
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
        const url = new URL(tab.url);
        const domain = url.hostname;
        const format = await findMatchingFormat(domain);
        if (format) {
            chrome.tabs.sendMessage(activeInfo.tabId, {
                action: 'startListening',
            });
        }
    }
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const url = new URL(tab.url);
        const domain = url.hostname;
        const format = await findMatchingFormat(domain);
        if (format) {
            chrome.tabs.sendMessage(tabId, { action: 'startListening' });
        }
    }
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'setFormat') {
        const { domain, format } = message;
        chrome.storage.sync.set({ [domain]: format }).then(() => {
            sendResponse({ success: true });
        });
        return true;
    }
    else if (message.action === 'deleteFormat') {
        const { domain } = message;
        chrome.storage.sync.remove(domain).then(() => {
            sendResponse({ success: true });
        });
        return true;
    }
    else if (message.action === 'getAllFormats') {
        chrome.storage.sync
            .get(null)
            .then((allSettings) => {
            sendResponse({ formats: allSettings });
        });
        return true;
    }
});

