let isListening = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startListening') {
    if (!isListening) {
      document.addEventListener('paste', handlePaste);
      isListening = true;
    }
  } else if (message.action === 'stopListening') {
    if (isListening) {
      document.removeEventListener('paste', handlePaste);
      isListening = false;
    }
  }
});

async function handlePaste(event) {
  const currentDomain = window.location.hostname;
  
  const formatSettings = await chrome.storage.sync.get(currentDomain);
  const format = formatSettings[currentDomain] || 'auto';
  
  if (format === 'auto') return;
  
  const clipboardData = event.clipboardData;
  const htmlData = clipboardData.getData('text/html');
  const textData = clipboardData.getData('text/plain');
  
  if (!htmlData && !textData) return;
  
  const linkInfo = extractLinkInfo(htmlData, textData);
  if (!linkInfo) return;
  
  let formattedText = '';
  
  switch (format) {
    case 'markdown':
      formattedText = `[${linkInfo.title}](${linkInfo.url})`;
      break;
    case 'richtext':
      formattedText = linkInfo.title;
      break;
    case 'plain':
      formattedText = `${linkInfo.title}: ${linkInfo.url}`;
      break;
    default:
      return;
  }
  
  if (formattedText) {
    event.preventDefault();
    
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const value = activeElement.value;
      
      activeElement.value = value.substring(0, start) + formattedText + value.substring(end);
      activeElement.selectionStart = activeElement.selectionEnd = start + formattedText.length;
    } else if (activeElement && activeElement.contentEditable === 'true') {
      if (format === 'richtext' && linkInfo.url) {
        const link = document.createElement('a');
        link.href = linkInfo.url;
        link.textContent = linkInfo.title;
        
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(link);
          range.setStartAfter(link);
          range.setEndAfter(link);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        document.execCommand('insertText', false, formattedText);
      }
    }
  }
}

function extractLinkInfo(htmlData, textData) {
  if (htmlData) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, 'text/html');
    const links = doc.querySelectorAll('a');
    
    if (links.length > 0) {
      const link = links[0];
      return {
        title: link.textContent.trim() || link.href,
        url: link.href
      };
    }
  }
  
  const urlRegex = /https?:\/\/[^\s]+/;
  const match = textData.match(urlRegex);
  if (match) {
    return {
      title: textData.replace(urlRegex, '').trim() || match[0],
      url: match[0]
    };
  }
  
  return null;
}

document.addEventListener('paste', handlePaste);
isListening = true;