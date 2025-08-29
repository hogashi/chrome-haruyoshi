document.addEventListener('DOMContentLoaded', async () => {
  const currentDomainElement = document.getElementById('current-domain');
  const formatRadios = document.querySelectorAll('input[name="format"]');
  const siteListElement = document.getElementById('site-list');
  
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
      
      const currentFormat = (response && response.format) ? response.format : 'auto';
      const radio = document.querySelector(`input[value="${currentFormat}"]`);
      if (radio) {
        radio.checked = true;
      }
    } catch (error) {
      console.error('Failed to get format:', error);
    }
    
    formatRadios.forEach(radio => {
      radio.addEventListener('change', async () => {
        if (radio.checked && currentDomain) {
          try {
            await chrome.runtime.sendMessage({
              action: 'setFormat',
              domain: currentDomain,
              format: radio.value
            });
            
            if (radio.value !== 'auto') {
              chrome.tabs.sendMessage(currentTab.id, { action: 'startListening' });
            } else {
              chrome.tabs.sendMessage(currentTab.id, { action: 'stopListening' });
            }
            
            loadAllFormats();
          } catch (error) {
            console.error('Failed to set format:', error);
          }
        }
      });
    });
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
        
        const select = document.createElement('select');
        select.innerHTML = `
          <option value="auto">自動</option>
          <option value="markdown">Markdown</option>
          <option value="richtext">リッチテキスト</option>
          <option value="plain">プレーンテキスト</option>
        `;
        select.value = format;
        
        select.addEventListener('change', async () => {
          try {
            await chrome.runtime.sendMessage({
              action: 'setFormat',
              domain: domain,
              format: select.value
            });
            
            if (domain === currentDomain) {
              const radio = document.querySelector(`input[value="${select.value}"]`);
              if (radio) {
                radio.checked = true;
              }
            }
          } catch (error) {
            console.error('Failed to update format:', error);
          }
        });
        
        siteItem.appendChild(domainSpan);
        siteItem.appendChild(select);
        siteListElement.appendChild(siteItem);
      });
    } catch (error) {
      console.error('Failed to load formats:', error);
    }
  }
  
  loadAllFormats();
});