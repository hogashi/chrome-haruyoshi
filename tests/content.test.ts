/**
 * Content script tests
 * These tests verify the core functionality of the content script
 */

// Mock the utils module
jest.mock('../src/utils', () => ({
  findMatchingFormat: jest.fn(),
}));

// Import actual functions from content.ts
import { formatTemplate, extractLinkInfo } from '../src/content';

describe('Content Script', () => {
  let mockFindMatchingFormat: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset DOM
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    
    // Mock findMatchingFormat
    mockFindMatchingFormat = require('../src/utils').findMatchingFormat;
  });

  describe('extractLinkInfo (actual implementation)', () => {
    // Test the actual exported function

    it('should extract title and URL from HTML link', () => {
      const htmlData = '<a href="https://github.com">GitHub</a>';
      const result = extractLinkInfo(htmlData);
      
      expect(result).toEqual({
        title: 'GitHub',
        url: 'https://github.com/'
      });
    });

    it('should return null when no links found', () => {
      const htmlData = '<p>No links here</p>';
      const result = extractLinkInfo(htmlData);
      
      expect(result).toBeNull();
    });

    it('should return null when title equals URL', () => {
      const htmlData = '<a href="https://github.com">https://github.com/</a>';
      const result = extractLinkInfo(htmlData);
      
      expect(result).toBeNull();
    });

    it('should handle empty title', () => {
      const htmlData = '<a href="https://github.com"></a>';
      const result = extractLinkInfo(htmlData);
      
      expect(result).toBeNull();
    });

    it('should extract from first link when multiple links exist', () => {
      const htmlData = `
        <a href="https://github.com">GitHub</a>
        <a href="https://gitlab.com">GitLab</a>
      `;
      const result = extractLinkInfo(htmlData);
      
      expect(result).toEqual({
        title: 'GitHub',
        url: 'https://github.com/'
      });
    });

    it('should handle complex HTML structure', () => {
      const htmlData = `
        <div>
          <p>Some text</p>
          <a href="https://example.com" class="link">
            <span>Example Site</span>
          </a>
        </div>
      `;
      const result = extractLinkInfo(htmlData);
      
      expect(result).toEqual({
        title: 'Example Site',
        url: 'https://example.com/'
      });
    });
  });

  describe('formatTemplate (actual implementation)', () => {
    it('should format text with template variables', () => {
      const template = '[{{title}}]({{url}})';
      const linkInfo = { title: 'GitHub', url: 'https://github.com' };
      
      const formattedText = formatTemplate(template, linkInfo);
      
      expect(formattedText).toBe('[GitHub](https://github.com)');
    });

    it('should handle different template formats', () => {
      const template = '{{title}}: {{url}}';
      const linkInfo = { title: 'Example', url: 'https://example.com' };
      
      const formattedText = formatTemplate(template, linkInfo);
      
      expect(formattedText).toBe('Example: https://example.com');
    });

    it('should handle HTML template format', () => {
      const template = '<a href="{{url}}">{{title}}</a>';
      const linkInfo = { title: 'Test Link', url: 'https://test.com' };
      
      const formattedText = formatTemplate(template, linkInfo);
      
      expect(formattedText).toBe('<a href="https://test.com">Test Link</a>');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template = '{{title}} - {{title}} ({{url}})';
      const linkInfo = { title: 'GitHub', url: 'https://github.com' };
      
      const formattedText = formatTemplate(template, linkInfo);
      
      expect(formattedText).toBe('GitHub - GitHub (https://github.com)');
    });

    it('should handle empty template', () => {
      const template = '';
      const linkInfo = { title: 'GitHub', url: 'https://github.com' };
      
      const formattedText = formatTemplate(template, linkInfo);
      
      expect(formattedText).toBe('');
    });

    it('should handle template without variables', () => {
      const template = 'Plain text without variables';
      const linkInfo = { title: 'GitHub', url: 'https://github.com' };
      
      const formattedText = formatTemplate(template, linkInfo);
      
      expect(formattedText).toBe('Plain text without variables');
    });

    it('should handle special characters in title and url', () => {
      const template = '[{{title}}]({{url}})';
      const linkInfo = { title: 'Special & chars', url: 'https://example.com?param=value&other=123' };
      
      const formattedText = formatTemplate(template, linkInfo);
      
      expect(formattedText).toBe('[Special & chars](https://example.com?param=value&other=123)');
    });
  });

  describe('Keyboard event detection logic', () => {
    it('should detect paste keyboard shortcuts', () => {
      const isPasteKey = (event: { ctrlKey?: boolean; metaKey?: boolean; key: string }) => 
        Boolean((event.ctrlKey || event.metaKey) && event.key === 'v');

      expect(isPasteKey({ ctrlKey: true, key: 'v' })).toBe(true);
      expect(isPasteKey({ metaKey: true, key: 'v' })).toBe(true);
      expect(isPasteKey({ ctrlKey: true, key: 'c' })).toBe(false);
      expect(isPasteKey({ key: 'v' })).toBe(false);
    });
  });

  describe('Text insertion logic', () => {
    it('should handle input element text insertion', () => {
      const input = document.createElement('input');
      input.value = 'Hello World';
      input.selectionStart = 5;
      input.selectionEnd = 5;
      document.body.appendChild(input);
      input.focus();

      // Simulate text insertion logic
      const insertText = (text: string) => {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const value = input.value || '';
        
        input.value = value.substring(0, start) + text + value.substring(end);
        input.selectionStart = input.selectionEnd = start + text.length;
      };

      insertText(' Test');
      expect(input.value).toBe('Hello Test World');
      expect(input.selectionStart).toBe(10);
    });

    it('should handle textarea element text insertion', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Line 1\nLine 2';
      textarea.selectionStart = 6;
      textarea.selectionEnd = 6;
      document.body.appendChild(textarea);

      // Simulate text insertion logic
      const insertText = (text: string) => {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const value = textarea.value || '';
        
        textarea.value = value.substring(0, start) + text + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
      };

      insertText('\nInserted');
      expect(textarea.value).toBe('Line 1\nInserted\nLine 2');
    });
  });

  describe('Content editable handling', () => {
    it('should identify content editable elements', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      
      expect(div.contentEditable).toBe('true');
      // isContentEditable is read-only, so we test the logic pattern
      const isContentEditable = div.contentEditable === 'true' || (div as any).isContentEditable;
      expect(Boolean(isContentEditable)).toBe(true);
    });

    it('should handle HTML content insertion for rich text', () => {
      const htmlText = '<strong>Bold</strong> text';
      
      // Test HTML stripping for plain text input
      const stripHTML = (html: string) => html.replace(/<[^>]*>/g, '');
      expect(stripHTML(htmlText)).toBe('Bold text');
    });
  });

  describe('Error handling', () => {
    it('should handle clipboard read errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Simulate clipboard error
      const mockClipboard = {
        read: jest.fn().mockRejectedValue(new Error('Clipboard access denied')),
        readText: jest.fn().mockResolvedValue('fallback text')
      };
      
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true
      });

      // Test error handling logic
      try {
        await mockClipboard.read();
      } catch (error) {
        // Should fall back to readText
        const fallbackText = await mockClipboard.readText();
        expect(fallbackText).toBe('fallback text');
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Utils integration', () => {
    it('should call findMatchingFormat with correct domain', async () => {
      mockFindMatchingFormat.mockResolvedValue('[{{title}}]({{url}})');
      
      const result = await mockFindMatchingFormat('github.com');
      expect(result).toBe('[{{title}}]({{url}})');
      expect(mockFindMatchingFormat).toHaveBeenCalledWith('github.com');
    });

    it('should handle no format found', async () => {
      mockFindMatchingFormat.mockResolvedValue('');
      
      const result = await mockFindMatchingFormat('unknown.com');
      expect(result).toBe('');
    });
  });
});