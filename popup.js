document.addEventListener('DOMContentLoaded', async () => {
  const currentDomainElement = document.getElementById('current-domain');
  const siteListElement = document.getElementById('site-list');
  const customTemplateInput = document.getElementById('custom-template');
  const presetButtons = document.querySelectorAll('.preset-btn');
  
  let currentTab;
  let currentDomain;
  
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    
    if (currentTab.url) {
      currentDomain = new URL(currentTab.url).hostname;
      currentDomainElement.textContent = currentDomain;
    } else {
      currentDomainElement.textContent = '不明なサイト';
    }
  } catch (error) {
    currentDomainElement.textContent = '不明なサイト';
  }
  
  if (currentDomain) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getFormat',
        domain: currentDomain
      });
      
      const formatData = response && response.format ? response.format : '';
      
      if (typeof formatData === 'string') {
        customTemplateInput.value = formatData;
      } else if (formatData && formatData.template) {
        customTemplateInput.value = formatData.template;
      }
    } catch (error) {
      console.error('Failed to get format:', error);
    }
    
    customTemplateInput.addEventListener('input', async () => {
      await saveCurrentFormat();
    });
    
    presetButtons.forEach(button => {
      button.addEventListener('click', () => {
        const template = button.dataset.template;
        customTemplateInput.value = template.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        saveCurrentFormat();
      });
    });
  }
  
  async function saveCurrentFormat() {
    if (!currentDomain) return;
    
    const template = customTemplateInput.value.trim();
    
    try {
      await chrome.runtime.sendMessage({
        action: 'setFormat',
        domain: currentDomain,
        format: template
      });
      
      if (template) {
        chrome.tabs.sendMessage(currentTab.id, { action: 'startListening' });
      } else {
        chrome.tabs.sendMessage(currentTab.id, { action: 'stopListening' });
      }
      
      loadAllFormats();
    } catch (error) {
      console.error('Failed to set format:', error);
    }
  }
  
  async function loadAllFormats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAllFormats' });
      const formats = (response && response.formats) ? response.formats : {};
      
      siteListElement.innerHTML = '';
      
      const sortedDomains = Object.keys(formats).sort();
      
      sortedDomains.forEach(domain => {
        const format = formats[domain];
        const siteItem = document.createElement('div');
        siteItem.className = 'site-item';
        
        const domainSpan = document.createElement('span');
        domainSpan.textContent = domain;
        
        const formatSpan = document.createElement('span');
        formatSpan.style.fontSize = '12px';
        formatSpan.style.color = '#666';
        formatSpan.style.fontFamily = 'monospace';
        
        if (format) {
          formatSpan.textContent = format;
        } else {
          formatSpan.textContent = '(無効)';
        }
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.style.fontSize = '11px';
        deleteButton.style.padding = '2px 6px';
        deleteButton.style.marginLeft = '8px';
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
            loadAllFormats();
            
            if (domain === currentDomain) {
              customTemplateInput.value = '';
            }
          } catch (error) {
            console.error('Failed to delete format:', error);
          }
        });
        
        const infoDiv = document.createElement('div');
        infoDiv.appendChild(formatSpan);
        infoDiv.appendChild(deleteButton);
        
        siteItem.appendChild(domainSpan);
        siteItem.appendChild(infoDiv);
        siteListElement.appendChild(siteItem);
      });
    } catch (error) {
      console.error('Failed to load formats:', error);
    }
  }
  
  loadAllFormats();
});