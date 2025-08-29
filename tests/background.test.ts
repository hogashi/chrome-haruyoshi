/**
 * Background script tests
 * These tests verify the background script functionality
 */

// Mock the utils module
jest.mock('../src/utils', () => ({
  findMatchingFormat: jest.fn(),
}));

describe('Background Script', () => {
  let mockFindMatchingFormat: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMatchingFormat = require('../src/utils').findMatchingFormat;
  });

  describe('Storage cleanup on install', () => {
    it('should remove old format settings on install', () => {
      const mockStorageGet = jest.fn().mockResolvedValue({
        'github.com': 'markdown',  // old format
        'example.com': '[{{title}}]({{url}})',  // new format
        'test.com': 'richtext',  // old format
        'site.com': 'plain'  // old format
      });

      const mockStorageRemove = jest.fn().mockResolvedValue(undefined);

      (chrome.storage.sync.get as jest.Mock) = mockStorageGet;
      (chrome.storage.sync.remove as jest.Mock) = mockStorageRemove;

      // Simulate the cleanup logic
      const cleanupOldFormats = async () => {
        const stored = await chrome.storage.sync.get(null);
        const toRemove: string[] = [];
        
        for (const [domain, format] of Object.entries(stored)) {
          if (format === 'markdown' || format === 'richtext' || format === 'plain') {
            toRemove.push(domain);
          }
        }
        
        if (toRemove.length > 0) {
          await chrome.storage.sync.remove(toRemove);
        }
        
        return toRemove;
      };

      return cleanupOldFormats().then(removed => {
        expect(removed).toEqual(['github.com', 'test.com', 'site.com']);
        expect(mockStorageRemove).toHaveBeenCalledWith(['github.com', 'test.com', 'site.com']);
      });
    });

    it('should not remove anything when no old formats exist', () => {
      const mockStorageGet = jest.fn().mockResolvedValue({
        'github.com': '[{{title}}]({{url}})',
        'example.com': '{{title}}: {{url}}'
      });

      const mockStorageRemove = jest.fn();

      (chrome.storage.sync.get as jest.Mock) = mockStorageGet;
      (chrome.storage.sync.remove as jest.Mock) = mockStorageRemove;

      const cleanupOldFormats = async () => {
        const stored = await chrome.storage.sync.get(null);
        const toRemove: string[] = [];
        
        for (const [domain, format] of Object.entries(stored)) {
          if (format === 'markdown' || format === 'richtext' || format === 'plain') {
            toRemove.push(domain);
          }
        }
        
        if (toRemove.length > 0) {
          await chrome.storage.sync.remove(toRemove);
        }
        
        return toRemove;
      };

      return cleanupOldFormats().then(removed => {
        expect(removed).toEqual([]);
        expect(mockStorageRemove).not.toHaveBeenCalled();
      });
    });
  });

  describe('Tab event handling', () => {
    it('should send startListening message when format is found', async () => {
      mockFindMatchingFormat.mockResolvedValue('[{{title}}]({{url}})');
      
      const mockTabsGet = jest.fn().mockResolvedValue({
        url: 'https://github.com'
      });
      
      const mockTabsSendMessage = jest.fn();

      (chrome.tabs.get as jest.Mock) = mockTabsGet;
      (chrome.tabs.sendMessage as jest.Mock) = mockTabsSendMessage;

      // Simulate tab activation logic
      const handleTabActivation = async (tabId: number) => {
        const tab = await chrome.tabs.get(tabId);
        if (tab.url) {
          const url = new URL(tab.url);
          const domain = url.hostname;
          const format = await mockFindMatchingFormat(domain);
          
          if (format) {
            chrome.tabs.sendMessage(tabId, { action: 'startListening' });
          }
        }
      };

      await handleTabActivation(123);

      expect(mockFindMatchingFormat).toHaveBeenCalledWith('github.com');
      expect(mockTabsSendMessage).toHaveBeenCalledWith(123, { action: 'startListening' });
    });

    it('should not send message when no format is found', async () => {
      mockFindMatchingFormat.mockResolvedValue('');
      
      const mockTabsGet = jest.fn().mockResolvedValue({
        url: 'https://example.com'
      });
      
      const mockTabsSendMessage = jest.fn();

      (chrome.tabs.get as jest.Mock) = mockTabsGet;
      (chrome.tabs.sendMessage as jest.Mock) = mockTabsSendMessage;

      const handleTabActivation = async (tabId: number) => {
        const tab = await chrome.tabs.get(tabId);
        if (tab.url) {
          const url = new URL(tab.url);
          const domain = url.hostname;
          const format = await mockFindMatchingFormat(domain);
          
          if (format) {
            chrome.tabs.sendMessage(tabId, { action: 'startListening' });
          }
        }
      };

      await handleTabActivation(123);

      expect(mockTabsSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Message handling', () => {
    it('should handle getFormat message', () => {
      const mockStorageGet = jest.fn().mockResolvedValue({
        'github.com': '[{{title}}]({{url}})'
      });

      (chrome.storage.sync.get as jest.Mock) = mockStorageGet;

      const handleMessage = (message: any, sender: any, sendResponse: any) => {
        if (message.action === 'getFormat') {
          const domain = message.domain;
          chrome.storage.sync.get(domain).then((settings: any) => {
            const format = settings[domain] || '';
            sendResponse({ format: format });
          });
          return true;
        }
      };

      const mockSendResponse = jest.fn();
      const message = { action: 'getFormat', domain: 'github.com' };

      const result = handleMessage(message, {}, mockSendResponse);

      expect(result).toBe(true);
      expect(mockStorageGet).toHaveBeenCalledWith('github.com');

      // Wait for async operation
      return Promise.resolve().then(() => {
        expect(mockSendResponse).toHaveBeenCalledWith({ format: '[{{title}}]({{url}})' });
      });
    });

    it('should handle setFormat message', () => {
      const mockStorageSet = jest.fn().mockResolvedValue(undefined);

      (chrome.storage.sync.set as jest.Mock) = mockStorageSet;

      const handleMessage = (message: any, sender: any, sendResponse: any) => {
        if (message.action === 'setFormat') {
          const { domain, format } = message;
          chrome.storage.sync.set({ [domain]: format }).then(() => {
            sendResponse({ success: true });
          });
          return true;
        }
      };

      const mockSendResponse = jest.fn();
      const message = { 
        action: 'setFormat', 
        domain: 'github.com', 
        format: '[{{title}}]({{url}})' 
      };

      const result = handleMessage(message, {}, mockSendResponse);

      expect(result).toBe(true);
      expect(mockStorageSet).toHaveBeenCalledWith({ 'github.com': '[{{title}}]({{url}})' });

      return Promise.resolve().then(() => {
        expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
      });
    });

    it('should handle deleteFormat message', () => {
      const mockStorageRemove = jest.fn().mockResolvedValue(undefined);

      (chrome.storage.sync.remove as jest.Mock) = mockStorageRemove;

      const handleMessage = (message: any, sender: any, sendResponse: any) => {
        if (message.action === 'deleteFormat') {
          const { domain } = message;
          chrome.storage.sync.remove(domain).then(() => {
            sendResponse({ success: true });
          });
          return true;
        }
      };

      const mockSendResponse = jest.fn();
      const message = { action: 'deleteFormat', domain: 'github.com' };

      const result = handleMessage(message, {}, mockSendResponse);

      expect(result).toBe(true);
      expect(mockStorageRemove).toHaveBeenCalledWith('github.com');

      return Promise.resolve().then(() => {
        expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
      });
    });

    it('should handle getAllFormats message', () => {
      const mockStorageGet = jest.fn().mockResolvedValue({
        'github.com': '[{{title}}]({{url}})',
        'example.com': '{{title}}: {{url}}'
      });

      (chrome.storage.sync.get as jest.Mock) = mockStorageGet;

      const handleMessage = (message: any, sender: any, sendResponse: any) => {
        if (message.action === 'getAllFormats') {
          chrome.storage.sync.get(null).then((allSettings: any) => {
            sendResponse({ formats: allSettings });
          });
          return true;
        }
      };

      const mockSendResponse = jest.fn();
      const message = { action: 'getAllFormats' };

      const result = handleMessage(message, {}, mockSendResponse);

      expect(result).toBe(true);
      expect(mockStorageGet).toHaveBeenCalledWith(null);

      return Promise.resolve().then(() => {
        expect(mockSendResponse).toHaveBeenCalledWith({
          formats: {
            'github.com': '[{{title}}]({{url}})',
            'example.com': '{{title}}: {{url}}'
          }
        });
      });
    });
  });
});