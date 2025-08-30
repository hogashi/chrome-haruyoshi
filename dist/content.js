/******/ "use strict";
/******/ // The require scope
/******/ var __webpack_require__ = {};
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  extractLinkInfo: () => (/* binding */ extractLinkInfo),
  formatTemplate: () => (/* binding */ formatTemplate)
});

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

;// ./src/content.ts

let isActive = false;
let isProcessing = false;
async function init() {
    const currentDomain = window.location.hostname;
    try {
        const format = await findMatchingFormat(currentDomain);
        if (format) {
            isActive = true;
            document.addEventListener('keydown', handleKeydown, true);
            document.addEventListener('paste', blockPaste, true);
            document.addEventListener('beforepaste', blockPaste, true);
        }
    }
    catch (error) {
        console.error('Failed to initialize paste format extension:', error);
    }
}
function blockPaste(event) {
    if (isActive) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
    }
    return true;
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startListening') {
        if (!isActive) {
            isActive = true;
            document.addEventListener('keydown', handleKeydown, true);
            document.addEventListener('paste', blockPaste, true);
            document.addEventListener('beforepaste', blockPaste, true);
        }
    }
    else if (message.action === 'stopListening') {
        if (isActive) {
            isActive = false;
            isProcessing = false;
            document.removeEventListener('keydown', handleKeydown, true);
            document.removeEventListener('paste', blockPaste, true);
            document.removeEventListener('beforepaste', blockPaste, true);
        }
    }
});
async function handleKeydown(event) {
    if (!isActive || isProcessing)
        return;
    const isPasteKey = (event.ctrlKey || event.metaKey) && event.key === 'v';
    if (!isPasteKey)
        return;
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
            }
            catch (error) {
                console.error('Error handling paste shortcut:', error);
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        insertText(text);
                    }
                }
                catch (fallbackError) {
                    console.error('Fallback clipboard read failed:', fallbackError);
                }
            }
            finally {
                isProcessing = false;
            }
        }, 0);
    }
    catch (error) {
        console.error('Error in handleKeydown:', error);
        isProcessing = false;
    }
}
function insertText(text) {
    const activeElement = document.activeElement;
    if (activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        const inputElement = activeElement;
        const start = inputElement.selectionStart || 0;
        const end = inputElement.selectionEnd || 0;
        const value = inputElement.value || '';
        inputElement.value =
            value.substring(0, start) + text + value.substring(end);
        inputElement.selectionStart = inputElement.selectionEnd =
            start + text.length;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.focus();
    }
    else if (activeElement &&
        (activeElement.contentEditable === 'true' ||
            activeElement.isContentEditable)) {
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
    else {
        try {
            document.execCommand('insertText', false, text);
        }
        catch (error) {
            console.error('execCommand failed:', error);
            try {
                navigator.clipboard.writeText(text);
            }
            catch (clipboardError) {
                console.error('Clipboard write failed:', clipboardError);
            }
        }
    }
}
function extractLinkInfo(htmlData) {
    if (htmlData) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        const links = doc.querySelectorAll('a[href]');
        if (links.length > 0) {
            const link = links[0];
            const title = link.textContent?.trim() || '';
            const url = link.href;
            if (title && url && title !== url) {
                return { title, url };
            }
        }
    }
    return null;
}
function formatTemplate(template, linkInfo) {
    return template
        .replace(/\{\{title\}\}/g, linkInfo.title)
        .replace(/\{\{url\}\}/g, linkInfo.url);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else {
    init();
}

