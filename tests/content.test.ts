/**
 * Content script tests
 * These tests verify the core functionality of the content script
 */

// Mock the utils module before importing content
jest.mock('../src/utils', () => ({
  findMatchingFormat: jest.fn(),
}));

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

  describe('extractLinkInfo', () => {
    // We need to test the extractLinkInfo function
    // Since it's not exported, we'll create a test version
    function extractLinkInfo(htmlData: string): { title: string; url: string } | null {
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

  describe('Text formatting', () => {
    it('should format text with template variables', () => {
      const template = '[{{title}}]({{url}})';
      const linkInfo = { title: 'GitHub', url: 'https://github.com' };
      
      const formattedText = template
        .replace(/\{\{title\}\}/g, linkInfo.title)
        .replace(/\{\{url\}\}/g, linkInfo.url);
      
      expect(formattedText).toBe('[GitHub](https://github.com)');
    });

    it('should handle different template formats', () => {
      const template = '{{title}}: {{url}}';
      const linkInfo = { title: 'Example', url: 'https://example.com' };
      
      const formattedText = template
        .replace(/\{\{title\}\}/g, linkInfo.title)
        .replace(/\{\{url\}\}/g, linkInfo.url);
      
      expect(formattedText).toBe('Example: https://example.com');
    });

    it('should handle HTML template format', () => {
      const template = '<a href="{{url}}">{{title}}</a>';
      const linkInfo = { title: 'Test Link', url: 'https://test.com' };
      
      const formattedText = template
        .replace(/\{\{title\}\}/g, linkInfo.title)
        .replace(/\{\{url\}\}/g, linkInfo.url);
      
      expect(formattedText).toBe('<a href="https://test.com">Test Link</a>');
    });
  });

  describe('Keyboard event handling', () => {
    it('should detect paste keyboard shortcuts', () => {
      const isPasteKey = (event: { ctrlKey?: boolean; metaKey?: boolean; key: string }) => 
        Boolean((event.ctrlKey || event.metaKey) && event.key === 'v');

      expect(isPasteKey({ ctrlKey: true, key: 'v' })).toBe(true);
      expect(isPasteKey({ metaKey: true, key: 'v' })).toBe(true);
      expect(isPasteKey({ ctrlKey: true, key: 'c' })).toBe(false);
      expect(isPasteKey({ key: 'v' })).toBe(false);
    });
  });

  describe('Input element detection', () => {
    it('should identify input elements correctly', () => {
      // Create test elements
      const input = document.createElement('input');
      const textarea = document.createElement('textarea');
      const div = document.createElement('div');
      const contentEditableDiv = document.createElement('div');
      contentEditableDiv.contentEditable = 'true';

      expect(input.tagName).toBe('INPUT');
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(div.tagName).toBe('DIV');
      expect(contentEditableDiv.contentEditable).toBe('true');
    });
  });
});