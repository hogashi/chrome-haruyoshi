let isActive = false;
let isProcessing = false;

async function init() {
  const currentDomain = window.location.hostname;
  console.log('🔧 Paste Format Extension: Initializing for domain:', currentDomain);
  
  try {
    const formatSettings = await chrome.storage.sync.get(currentDomain);
    const format = formatSettings[currentDomain] || '';
    console.log('🔧 Format setting for', currentDomain, ':', format);
    
    if (format) {
      isActive = true;
      document.addEventListener('keydown', handleKeydown, true);
      document.addEventListener('paste', blockPaste, true);
      console.log('🔧 Keyboard and paste listeners activated for', currentDomain);
    } else {
      console.log('🔧 No format set - listeners not activated');
    }
  } catch (error) {
    console.error('Failed to initialize paste format extension:', error);
  }
}

function blockPaste(event) {
  if (isActive && isProcessing) {
    console.log('🚫 Blocking default paste event');
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startListening') {
    if (!isActive) {
      isActive = true;
      document.addEventListener('keydown', handleKeydown, true);
      document.addEventListener('paste', blockPaste, true);
    }
  } else if (message.action === 'stopListening') {
    if (isActive) {
      isActive = false;
      isProcessing = false;
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('paste', blockPaste, true);
    }
  }
});

async function handleKeydown(event) {
  if (!isActive || isProcessing) return;
  
  const isPasteKey = (event.ctrlKey || event.metaKey) && event.key === 'v';
  if (!isPasteKey) return;
  
  console.log('⌨️ Paste keyboard shortcut detected');
  
  const currentDomain = window.location.hostname;
  
  try {
    const formatSettings = await chrome.storage.sync.get(currentDomain);
    const format = formatSettings[currentDomain] || '';
    console.log('⌨️ Current format setting:', format);
    
    if (!format) {
      console.log('⌨️ No format set - letting default paste behavior');
      return;
    }
    
    console.log('⌨️ Preventing default paste behavior');
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    isProcessing = true;
    
    setTimeout(async () => {
      try {
        const clipboardData = await navigator.clipboard.read();
        console.log('⌨️ Clipboard items:', clipboardData.length);
        
        if (clipboardData.length === 0) {
          console.log('⌨️ No clipboard data available');
          return;
        }
        
        const item = clipboardData[0];
        console.log('⌨️ Available types:', item.types);
        
        let htmlData = '';
        let textData = '';
        
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          htmlData = await blob.text();
        }
        
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          textData = await blob.text();
        }
        
        console.log('⌨️ Clipboard HTML:', htmlData ? htmlData.substring(0, 200) + '...' : 'null');
        console.log('⌨️ Clipboard text:', textData ? textData.substring(0, 200) + '...' : 'null');
        
        if (!htmlData) {
          console.log('⌨️ No HTML data - pasting original text');
          if (textData) {
            insertText(textData, false);
          }
          return;
        }
        
        const linkInfo = extractLinkInfo(htmlData, textData);
        console.log('⌨️ Extracted link info:', linkInfo);
        
        if (!linkInfo) {
          console.log('⌨️ No link info found - pasting original content');
          if (textData) {
            insertText(textData, false);
          }
          return;
        }
        
        const template = format;
        const formattedText = template
          .replace(/\{\{title\}\}/g, linkInfo.title)
          .replace(/\{\{url\}\}/g, linkInfo.url);
        
        console.log('⌨️ Using template:', template);
        
        const shouldInsertAsHTML = template.includes('<') && template.includes('>');
        
        console.log('⌨️ Formatted text:', formattedText);
        insertText(formattedText, shouldInsertAsHTML);
        
      } catch (error) {
        console.error('Error handling paste shortcut:', error);
        console.log('⌨️ Fallback: trying to read text from clipboard');
        
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            insertText(text, false);
          }
        } catch (fallbackError) {
          console.error('Fallback clipboard read failed:', fallbackError);
        }
      } finally {
        isProcessing = false;
      }
    }, 0);
    
  } catch (error) {
    console.error('Error in handleKeydown:', error);
    isProcessing = false;
  }
}

function insertText(text, asHTML = false) {
  console.log('💬 insertText called with:', text, 'asHTML:', asHTML);
  
  const activeElement = document.activeElement;
  console.log('💬 Active element:', activeElement?.tagName, activeElement?.id, activeElement?.className);
  
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    console.log('💬 Inserting into input/textarea');
    const start = activeElement.selectionStart || 0;
    const end = activeElement.selectionEnd || 0;
    const value = activeElement.value || '';
    
    const finalText = asHTML ? text.replace(/<[^>]*>/g, '') : text;
    activeElement.value = value.substring(0, start) + finalText + value.substring(end);
    activeElement.selectionStart = activeElement.selectionEnd = start + finalText.length;
    
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    activeElement.focus();
  } else if (activeElement && (activeElement.contentEditable === 'true' || activeElement.isContentEditable)) {
    console.log('💬 Inserting into contentEditable');
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
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
        range.collapse(false);
      } else {
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        range.collapse(false);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } else {
    console.log('💬 Using execCommand fallback');
    try {
      if (asHTML) {
        document.execCommand('insertHTML', false, text);
      } else {
        document.execCommand('insertText', false, text);
      }
    } catch (error) {
      console.error('💬 execCommand failed:', error);
      
      try {
        navigator.clipboard.writeText(text);
        console.log('💬 Wrote to clipboard as fallback');
      } catch (clipboardError) {
        console.error('💬 Clipboard write failed:', clipboardError);
      }
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