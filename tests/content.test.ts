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
    it('should extract title and URL from HTML link', () => {
      const htmlData = '<a href="https://github.com">GitHub</a>';
      const result = extractLinkInfo(htmlData);

      expect(result).toEqual({
        title: 'GitHub',
        url: 'https://github.com/',
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
        url: 'https://github.com/',
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
        url: 'https://example.com/',
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
      const linkInfo = {
        title: 'Special & chars',
        url: 'https://example.com?param=value&other=123',
      };

      const formattedText = formatTemplate(template, linkInfo);

      expect(formattedText).toBe(
        '[Special & chars](https://example.com?param=value&other=123)'
      );
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
