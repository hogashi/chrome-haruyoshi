import { Message, LinkInfo } from './types';
import { findMatchingFormat } from './utils';

let isActive = false;
let isProcessing = false;

async function init(): Promise<void> {
  const currentDomain = window.location.hostname;
  
  try {
    const format = await findMatchingFormat(currentDomain);
    
    if (format) {
      isActive = true;
      document.addEventListener('keydown', handleKeydown, true);
      document.addEventListener('paste', blockPaste, true);
      document.addEventListener('beforepaste', blockPaste, true);
    }
  } catch (error) {
    console.error('Failed to initialize paste format extension:', error);
  }
}

function blockPaste(event: Event): boolean {
  if (isActive) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
  return true;
}

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.action === 'startListening') {
    if (!isActive) {
      isActive = true;
      document.addEventListener('keydown', handleKeydown, true);
      document.addEventListener('paste', blockPaste, true);
      document.addEventListener('beforepaste', blockPaste, true);
    }
  } else if (message.action === 'stopListening') {
    if (isActive) {
      isActive = false;
      isProcessing = false;
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('paste', blockPaste, true);
      document.removeEventListener('beforepaste', blockPaste, true);
    }
  }
});

async function handleKeydown(event: KeyboardEvent): Promise<void> {
  if (!isActive || isProcessing) return;
  
  const isPasteKey = (event.ctrlKey || event.metaKey) && event.key === 'v';
  if (!isPasteKey) return;
  
  const currentDomain = window.location.hostname;
  
  try {
    const format = await findMatchingFormat(currentDomain);
    
    if (!format) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    isProcessing = true;
    
    setTimeout(async () => {
      try {
        const clipboardData = await navigator.clipboard.read();
        
        if (clipboardData.length === 0) {
          return;
        }
        
        const item = clipboardData[0];
        
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
        
        if (!htmlData) {
          if (textData) {
            insertText(textData, false);
          }
          return;
        }
        
        const linkInfo = extractLinkInfo(htmlData);
        
        if (!linkInfo) {
          if (textData) {
            insertText(textData, false);
          }
          return;
        }
        
        const template = format;
        const formattedText = template
          .replace(/\{\{title\}\}/g, linkInfo.title)
          .replace(/\{\{url\}\}/g, linkInfo.url);
        
        insertText(formattedText, false);
        
      } catch (error) {
        console.error('Error handling paste shortcut:', error);
        
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

function insertText(text: string, asHTML = false): void {
  const activeElement = document.activeElement as HTMLElement;
  
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    const inputElement = activeElement as HTMLInputElement | HTMLTextAreaElement;
    const start = inputElement.selectionStart || 0;
    const end = inputElement.selectionEnd || 0;
    const value = inputElement.value || '';
    
    const finalText = asHTML ? text.replace(/<[^>]*>/g, '') : text;
    inputElement.value = value.substring(0, start) + finalText + value.substring(end);
    inputElement.selectionStart = inputElement.selectionEnd = start + finalText.length;
    
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.focus();
  } else if (activeElement && (activeElement.contentEditable === 'true' || (activeElement as any).isContentEditable)) {
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
    try {
      if (asHTML) {
        document.execCommand('insertHTML', false, text);
      } else {
        document.execCommand('insertText', false, text);
      }
    } catch (error) {
      console.error('execCommand failed:', error);
      
      try {
        navigator.clipboard.writeText(text);
      } catch (clipboardError) {
        console.error('Clipboard write failed:', clipboardError);
      }
    }
  }
}

function extractLinkInfo(htmlData: string): LinkInfo | null {
  if (htmlData) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, 'text/html');
    const links = doc.querySelectorAll('a[href]');
    
    if (links.length > 0) {
      const link = links[0] as HTMLAnchorElement;
      const title = link.textContent?.trim() || '';
      const url = link.href;
      
      if (title && url && title !== url) {
        return { title, url };
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