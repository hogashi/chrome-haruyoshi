import { Message, LinkInfo } from './types';
import { findMatchingFormat } from './utils';

// 拡張機能がこのサイトで有効かどうかを示すフラグ
// trueの場合: ペースト処理をインターセプトし、フォーマット変換を実行
// falseの場合: 通常のペースト動作を許可（拡張機能は動作しない）
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

chrome.runtime.onMessage.addListener((message: Message, sender: any, sendResponse: (response?: any) => void) => {
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
            insertText(textData);
          }
          return;
        }
        
        const linkInfo = extractLinkInfo(htmlData);
        
        if (!linkInfo) {
          if (textData) {
            insertText(textData);
          }
          return;
        }
        
        const formattedText = formatTemplate(format, linkInfo);
        
        insertText(formattedText);
        
      } catch (error) {
        console.error('Error handling paste shortcut:', error);
        
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            insertText(text);
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

function insertText(text: string): void {
  const activeElement = document.activeElement as HTMLElement;
  
  // INPUT/TEXTAREA要素の場合: value プロパティを直接操作
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    const inputElement = activeElement as HTMLInputElement | HTMLTextAreaElement;
    const start = inputElement.selectionStart || 0;
    const end = inputElement.selectionEnd || 0;
    const value = inputElement.value || '';
    
    inputElement.value = value.substring(0, start) + text + value.substring(end);
    inputElement.selectionStart = inputElement.selectionEnd = start + text.length;
    
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.focus();
  } 
  // contentEditable要素の場合: Selection API を使用してテキスト挿入
  else if (activeElement && (activeElement.contentEditable === 'true' || (activeElement as any).isContentEditable)) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      range.collapse(false);
      
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } 
  // その他の要素の場合: execCommand を試行、失敗時はクリップボードにコピー
  // 最悪の場合でもフォーマット変換の結果をユーザーが利用できるようにする
  else {
    try {
      document.execCommand('insertText', false, text);
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

export function extractLinkInfo(htmlData: string): LinkInfo | null {
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

// Export only the formatTemplate function for testing
export function formatTemplate(template: string, linkInfo: LinkInfo): string {
  return template
    .replace(/\{\{title\}\}/g, linkInfo.title)
    .replace(/\{\{url\}\}/g, linkInfo.url);
}

// Initialize the content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}