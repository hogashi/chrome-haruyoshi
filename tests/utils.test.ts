import { matchesDomain, findMatchingFormat } from '../src/utils';

describe('matchesDomain', () => {
  it('should match exact domains', () => {
    expect(matchesDomain('github.com', 'github.com')).toBe(true);
    expect(matchesDomain('github.com', 'gitlab.com')).toBe(false);
  });

  it('should match wildcard patterns', () => {
    expect(matchesDomain('docs.github.com', '*.github.com')).toBe(true);
    expect(matchesDomain('api.github.com', '*.github.com')).toBe(true);
    expect(matchesDomain('github.com', '*.github.com')).toBe(true);
    expect(matchesDomain('sub.docs.github.com', '*.github.com')).toBe(true);
  });

  it('should not match different domains with wildcards', () => {
    expect(matchesDomain('github.org', '*.github.com')).toBe(false);
    expect(matchesDomain('mygithub.com', '*.github.com')).toBe(false);
    expect(matchesDomain('example.com', '*.github.com')).toBe(false);
  });

  it('should not match when pattern does not start with wildcard', () => {
    expect(matchesDomain('docs.github.com', 'github.com')).toBe(false);
  });
});

describe('findMatchingFormat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return exact domain match when available', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      'github.com': '[{{title}}]({{url}})',
      '*.github.com': '{{title}}: {{url}}',
    });

    (chrome.storage.sync.get as jest.Mock) = mockGet;

    const result = await findMatchingFormat('github.com');
    expect(result).toBe('[{{title}}]({{url}})');
  });

  it('should return wildcard match when exact match not available', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      '*.github.com': '{{title}}: {{url}}',
    });

    (chrome.storage.sync.get as jest.Mock) = mockGet;

    const result = await findMatchingFormat('docs.github.com');
    expect(result).toBe('{{title}}: {{url}}');
  });

  it('should prioritize exact match over wildcard', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      'github.com': '[{{title}}]({{url}})',
      '*.github.com': '{{title}}: {{url}}',
    });

    (chrome.storage.sync.get as jest.Mock) = mockGet;

    const result = await findMatchingFormat('github.com');
    expect(result).toBe('[{{title}}]({{url}})');
  });

  it('should return empty string when no match found', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      'example.com': '[{{title}}]({{url}})',
    });

    (chrome.storage.sync.get as jest.Mock) = mockGet;

    const result = await findMatchingFormat('github.com');
    expect(result).toBe('');
  });

  it('should return empty string when storage is empty', async () => {
    const mockGet = jest.fn().mockResolvedValue({});

    (chrome.storage.sync.get as jest.Mock) = mockGet;

    const result = await findMatchingFormat('github.com');
    expect(result).toBe('');
  });

  it('should handle storage errors gracefully', async () => {
    const mockGet = jest.fn().mockRejectedValue(new Error('Storage error'));

    (chrome.storage.sync.get as jest.Mock) = mockGet;

    // Mock console.error to avoid error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await findMatchingFormat('github.com');
    expect(result).toBe('');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to find matching format:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should handle multiple wildcard patterns correctly', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      '*.github.com': 'GitHub: {{title}} - {{url}}',
      '*.google.com': 'Google: {{title}} ({{url}})',
      '*.stackoverflow.com': 'SO: {{title}} | {{url}}',
    });

    (chrome.storage.sync.get as jest.Mock) = mockGet;

    const githubResult = await findMatchingFormat('api.github.com');
    expect(githubResult).toBe('GitHub: {{title}} - {{url}}');

    const googleResult = await findMatchingFormat('docs.google.com');
    expect(googleResult).toBe('Google: {{title}} ({{url}})');

    const soResult = await findMatchingFormat('meta.stackoverflow.com');
    expect(soResult).toBe('SO: {{title}} | {{url}}');
  });
});
