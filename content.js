let isActive = false;

async function init() {
  const currentDomain = window.location.hostname;
  try {
    const formatSettings = await chrome.storage.sync.get(currentDomain);
    const format = formatSettings[currentDomain] || 'auto';
    
    if (format !== 'auto') {
      isActive = true;
      document.addEventListener('paste', handlePaste, true);
    }
  } catch (error) {
    console.error('Failed to initialize paste format extension:', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startListening') {
    if (!isActive) {
      isActive = true;
      document.addEventListener('paste', handlePaste, true);
    }
  } else if (message.action === 'stopListening') {
    if (isActive) {
      isActive = false;
      document.removeEventListener('paste', handlePaste, true);
    }
  }
});

async function handlePaste(event) {
  if (!isActive) return;
  
  const currentDomain = window.location.hostname;
  
  try {
    const formatSettings = await chrome.storage.sync.get(currentDomain);
    const format = formatSettings[currentDomain] || 'auto';
    
    if (format === 'auto') return;
    
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');
    
    const linkInfo = extractLinkInfo(htmlData, textData);
    if (!linkInfo) return;
    
    let formattedText = '';
    let shouldInsertAsHTML = false;
    
    switch (format) {
      case 'markdown':
        formattedText = `[${linkInfo.title}](${linkInfo.url})`;
        break;
      case 'richtext':
        formattedText = `<a href="${linkInfo.url}">${linkInfo.title}</a>`;
        shouldInsertAsHTML = true;
        break;
      case 'plain':
        formattedText = `${linkInfo.title}: ${linkInfo.url}`;
        break;
      default:
        return;
    }
    
    if (formattedText) {
      event.preventDefault();
      event.stopPropagation();
      
      insertText(formattedText, shouldInsertAsHTML);
    }
  } catch (error) {
    console.error('Error handling paste:', error);
  }
}

function insertText(text, asHTML = false) {
  const activeElement = document.activeElement;
  
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    const value = activeElement.value;
    
    activeElement.value = value.substring(0, start) + (asHTML ? text.replace(/<[^>]*>/g, '') : text) + value.substring(end);
    activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
    
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (activeElement && (activeElement.contentEditable === 'true' || activeElement.isContentEditable)) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      if (asHTML) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        range.insertNode(fragment);
      } else {
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } else {
    if (asHTML) {
      document.execCommand('insertHTML', false, text);
    } else {
      document.execCommand('insertText', false, text);
    }
  }
}

function extractLinkInfo(htmlData, textData) {
  if (htmlData) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, 'text/html');
    const links = doc.querySelectorAll('a[href]');
    
    if (links.length > 0) {
      const link = links[0];
      const title = link.textContent.trim();
      const url = link.href;
      
      if (title && url && title !== url) {
        return { title, url };
      }
    }
  }
  
  if (textData) {
    const lines = textData.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const urlMatch = line.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        const url = urlMatch[0];
        const title = line.replace(url, '').trim();
        
        if (title) {
          return { title, url };
        }
      }
    }
  }
  
  return null;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}