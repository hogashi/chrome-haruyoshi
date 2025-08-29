import { matchesDomain } from '../src/utils';

describe('Simple Tests', () => {
  describe('Domain matching', () => {
    it('should match exact domains', () => {
      expect(matchesDomain('github.com', 'github.com')).toBe(true);
      expect(matchesDomain('github.com', 'gitlab.com')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      expect(matchesDomain('docs.github.com', '*.github.com')).toBe(true);
      expect(matchesDomain('api.github.com', '*.github.com')).toBe(true);
      expect(matchesDomain('github.com', '*.github.com')).toBe(true);
    });

    it('should not match different domains with wildcards', () => {
      expect(matchesDomain('github.org', '*.github.com')).toBe(false);
      expect(matchesDomain('mygithub.com', '*.github.com')).toBe(false);
    });
  });

  describe('Template formatting', () => {
    it('should replace template variables', () => {
      const template = '[{{title}}]({{url}})';
      const title = 'GitHub';
      const url = 'https://github.com';
      
      const result = template
        .replace(/\{\{title\}\}/g, title)
        .replace(/\{\{url\}\}/g, url);
      
      expect(result).toBe('[GitHub](https://github.com)');
    });

    it('should handle plain text template', () => {
      const template = '{{title}}: {{url}}';
      const title = 'Example';
      const url = 'https://example.com';
      
      const result = template
        .replace(/\{\{title\}\}/g, title)
        .replace(/\{\{url\}\}/g, url);
      
      expect(result).toBe('Example: https://example.com');
    });
  });

  describe('Utility functions', () => {
    it('should detect paste keyboard shortcuts', () => {
      const isPasteKey = (event: { ctrlKey?: boolean; metaKey?: boolean; key: string }) => 
        Boolean((event.ctrlKey || event.metaKey) && event.key === 'v');

      expect(isPasteKey({ ctrlKey: true, key: 'v' })).toBe(true);
      expect(isPasteKey({ metaKey: true, key: 'v' })).toBe(true);
      expect(isPasteKey({ ctrlKey: true, key: 'c' })).toBe(false);
      expect(isPasteKey({ key: 'v' })).toBe(false);
    });
  });
});