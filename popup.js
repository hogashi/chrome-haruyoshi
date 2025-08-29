document.addEventListener('DOMContentLoaded', async () => {
  const domainInput = document.getElementById('domain-input');
  const customTemplateInput = document.getElementById('custom-template');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const saveButton = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');
  const domainList = document.getElementById('domain-list');
  
  let currentTab;
  
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
  } catch (error) {
    console.error('Failed to get current tab:', error);
  }
  
  domainInput.addEventListener('input', () => {
    updateSaveButton();
    loadFormatForDomain();
  });
  
  customTemplateInput.addEventListener('input', () => {
    updateSaveButton();
  });
  
  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      const template = button.dataset.template;
      customTemplateInput.value = template.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      updateSaveButton();
    });
  });
  
  saveButton.addEventListener('click', async () => {
    await saveCurrentFormat();
  });
  
  async function loadFormatForDomain() {
    const domain = domainInput.value.trim();
    if (!domain) {
      customTemplateInput.value = '';
      updateSaveButton();
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getFormat',
        domain: domain
      });
      
      const formatData = response && response.format ? response.format : '';
      customTemplateInput.value = formatData;
      savedValue = formatData;
      updateSaveButton();
    } catch (error) {
      console.error('Failed to get format:', error);
    }
  }
  
  let savedValue = '';
  
  function updateSaveButton() {
    const currentValue = customTemplateInput.value.trim();
    if (currentValue !== savedValue) {
      saveButton.textContent = '保存';
      saveButton.style.background = '#007cba';
      saveButton.disabled = false;
      saveStatus.textContent = '';
    } else {
      saveButton.textContent = '保存済み';
      saveButton.style.background = '#666';
      saveButton.disabled = true;
      saveStatus.textContent = '';
    }
  }
  
  async function saveCurrentFormat() {
    const domain = domainInput.value.trim();
    const template = customTemplateInput.value.trim();
    
    if (!domain) {
      saveStatus.textContent = 'ドメインを入力してください';
      return;
    }
    
    try {
      console.log('💾 Saving format:', template, 'for domain:', domain);
      saveStatus.textContent = '保存中...';
      saveButton.disabled = true;
      
      if (template) {
        await chrome.runtime.sendMessage({
          action: 'setFormat',
          domain: domain,
          format: template
        });
      } else {
        await chrome.runtime.sendMessage({
          action: 'deleteFormat',
          domain: domain
        });
      }
      
      savedValue = template;
      
      // 現在のタブがこのドメインの場合はリスナーを更新
      if (currentTab && currentTab.url) {
        const currentDomain = new URL(currentTab.url).hostname;
        if (currentDomain === domain) {
          if (template) {
            chrome.tabs.sendMessage(currentTab.id, { action: 'startListening' });
          } else {
            chrome.tabs.sendMessage(currentTab.id, { action: 'stopListening' });
          }
        }
      }
      
      saveStatus.textContent = '';
      updateSaveButton();
      loadDomainList();
      
    } catch (error) {
      console.error('Failed to set format:', error);
      saveStatus.textContent = '保存エラー';
      saveButton.disabled = false;
    }
  }
  
  async function loadDomainList() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAllFormats' });
      const formats = (response && response.formats) ? response.formats : {};
      
      domainList.innerHTML = '';
      
      const sortedDomains = Object.keys(formats).sort();
      
      if (sortedDomains.length === 0) {
        domainList.innerHTML = '<div style="padding: 8px; font-size: 12px; color: #666; text-align: center;">設定なし</div>';
        return;
      }
      
      sortedDomains.forEach(domain => {
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
        editButton.textContent = '編集';
        editButton.style.fontSize = '11px';
        editButton.style.padding = '4px 8px';
        editButton.style.border = '1px solid #ccc';
        editButton.style.borderRadius = '3px';
        editButton.style.background = '#f5f5f5';
        editButton.style.cursor = 'pointer';
        editButton.style.marginRight = '4px';
        
        editButton.addEventListener('click', () => {
          domainInput.value = domain;
          loadFormatForDomain();
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
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
              domain: domain
            });
            loadDomainList();
            
            if (domainInput.value === domain) {
              domainInput.value = '';
              customTemplateInput.value = '';
              savedValue = '';
              updateSaveButton();
            }
          } catch (error) {
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
    } catch (error) {
      console.error('Failed to load domain list:', error);
    }
  }
  
  // 初期化
  savedValue = '';
  updateSaveButton();
  loadDomainList();
});