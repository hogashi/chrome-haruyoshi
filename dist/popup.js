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

;// ./src/popup.ts

document.addEventListener('DOMContentLoaded', async () => {
    const domainInput = document.getElementById('domain-input');
    const customTemplateInput = document.getElementById('custom-template');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const saveButton = document.getElementById('save-btn');
    const saveError = document.getElementById('save-error');
    const domainList = document.getElementById('domain-list');
    let currentTab;
    let currentDomain = '';
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tabs[0];
        if (currentTab.url) {
            const url = new URL(currentTab.url);
            currentDomain = url.hostname;
        }
    }
    catch (error) {
        console.error('Failed to get current tab:', error);
    }
    domainInput.addEventListener('input', () => {
        updateSaveButton();
    });
    customTemplateInput.addEventListener('input', () => {
        updateSaveButton();
    });
    presetButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const template = button.dataset.template || '';
            customTemplateInput.value = template
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"');
            updateSaveButton();
        });
    });
    saveButton.addEventListener('click', async () => {
        await saveCurrentFormat();
    });
    async function loadFormatForDomain() {
        const domain = domainInput.value.trim();
        if (!domain) {
            updateSaveButton();
            return;
        }
        const currentValue = customTemplateInput.value.trim();
        if (currentValue !== savedValue) {
            updateSaveButton();
            return;
        }
        try {
            const formatData = await findMatchingFormat(domain);
            customTemplateInput.value = formatData;
            savedValue = formatData;
            updateSaveButton();
        }
        catch (error) {
            console.error('Failed to get format:', error);
        }
    }
    let savedValue = '';
    function updateSaveButton() {
        saveButton.textContent = 'Save';
        saveButton.style.background = '#007cba';
        saveButton.disabled = false;
        saveError.textContent = '';
    }
    async function saveCurrentFormat() {
        const domain = domainInput.value.trim();
        const template = customTemplateInput.value.trim();
        if (!domain) {
            saveError.textContent = 'Please enter a domain';
            return;
        }
        try {
            saveButton.disabled = true;
            if (template) {
                await chrome.runtime.sendMessage({
                    action: 'setFormat',
                    domain: domain,
                    format: template,
                });
            }
            else {
                await chrome.runtime.sendMessage({
                    action: 'deleteFormat',
                    domain: domain,
                });
            }
            savedValue = template;
            if (currentTab && currentTab.url && currentTab.id) {
                const url = new URL(currentTab.url);
                const currentDomain = url.hostname;
                if (currentDomain === domain) {
                    if (template) {
                        chrome.tabs.sendMessage(currentTab.id, {
                            action: 'startListening',
                        });
                    }
                    else {
                        chrome.tabs.sendMessage(currentTab.id, {
                            action: 'stopListening',
                        });
                    }
                }
            }
            saveError.textContent = '';
            saveButton.textContent = 'Saved';
            saveButton.style.background = '#666';
            saveButton.disabled = true;
            setTimeout(() => {
                updateSaveButton();
            }, 1000);
            loadDomainList();
        }
        catch (error) {
            console.error('Failed to set format:', error);
            saveError.textContent = 'Save error';
            saveButton.disabled = false;
        }
    }
    async function loadDomainList() {
        try {
            const response = (await chrome.runtime.sendMessage({
                action: 'getAllFormats',
            }));
            const formats = response && response.formats ? response.formats : {};
            domainList.innerHTML = '';
            const sortedDomains = Object.keys(formats).sort();
            if (sortedDomains.length === 0) {
                domainList.innerHTML =
                    '<div style="padding: 8px; font-size: 12px; color: #666; text-align: center;">No configurations</div>';
                return;
            }
            sortedDomains.forEach((domain) => {
                const format = formats[domain];
                const domainItem = document.createElement('div');
                domainItem.className = 'domain-item';
                const domainInfo = document.createElement('div');
                domainInfo.style.flex = '1';
                const domainSpan = document.createElement('div');
                domainSpan.textContent = domain;
                domainSpan.style.fontWeight = '500';
                const formatSpan = document.createElement('div');
                formatSpan.style.fontSize = '11px';
                formatSpan.style.color = '#666';
                formatSpan.style.fontFamily = 'monospace';
                formatSpan.textContent = format || '(無効)';
                domainInfo.appendChild(domainSpan);
                domainInfo.appendChild(formatSpan);
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.style.fontSize = '11px';
                editButton.style.padding = '4px 8px';
                editButton.style.border = '1px solid #ccc';
                editButton.style.borderRadius = '3px';
                editButton.style.background = '#f5f5f5';
                editButton.style.cursor = 'pointer';
                editButton.style.marginRight = '4px';
                editButton.addEventListener('click', () => {
                    domainInput.value = domain;
                    customTemplateInput.value = format;
                    savedValue = format;
                    updateSaveButton();
                });
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.style.fontSize = '11px';
                deleteButton.style.padding = '4px 8px';
                deleteButton.style.border = '1px solid #ccc';
                deleteButton.style.borderRadius = '3px';
                deleteButton.style.background = '#f5f5f5';
                deleteButton.style.cursor = 'pointer';
                deleteButton.addEventListener('click', async () => {
                    try {
                        await chrome.runtime.sendMessage({
                            action: 'deleteFormat',
                            domain: domain,
                        });
                        loadDomainList();
                        if (domainInput.value === domain) {
                            savedValue = '';
                            updateSaveButton();
                        }
                    }
                    catch (error) {
                        console.error('Failed to delete format:', error);
                    }
                });
                const buttonGroup = document.createElement('div');
                buttonGroup.appendChild(editButton);
                buttonGroup.appendChild(deleteButton);
                domainItem.appendChild(domainInfo);
                domainItem.appendChild(buttonGroup);
                domainList.appendChild(domainItem);
            });
        }
        catch (error) {
            console.error('Failed to load domain list:', error);
        }
    }
    async function init() {
        if (currentDomain) {
            domainInput.value = currentDomain;
            await loadFormatForDomain();
        }
        else {
            savedValue = '';
            updateSaveButton();
        }
        loadDomainList();
    }
    init();
});

