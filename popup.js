document.addEventListener('DOMContentLoaded', async () => {
  const currentDomainElement = document.getElementById('current-domain');
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
      
      console.log('📥 Raw response:', response);
      const formatData = response && response.format ? response.format : '';
      console.log('📥 Loaded format data:', formatData);
      
      if (typeof formatData === 'string') {
        customTemplateInput.value = formatData;
        console.log('📥 Set input value:', formatData);
        console.log('📥 Input element value after setting:', customTemplateInput.value);
      } else if (formatData && formatData.template) {
        customTemplateInput.value = formatData.template;
        console.log('📥 Set input value from template:', formatData.template);
        console.log('📥 Input element value after setting:', customTemplateInput.value);
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
      console.log('💾 Saving format:', template, 'for domain:', currentDomain);
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
    } catch (error) {
      console.error('Failed to set format:', error);
    }
  }
});