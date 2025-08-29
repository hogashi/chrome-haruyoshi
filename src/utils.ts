export function matchesDomain(currentDomain: string, pattern: string): boolean {
  if (pattern === currentDomain) return true;
  
  if (pattern.startsWith('*.')) {
    const baseDomain = pattern.slice(2); // "*.github.com" → "github.com"
    return currentDomain.endsWith('.' + baseDomain) || currentDomain === baseDomain;
  }
  
  return false;
}

export async function findMatchingFormat(currentDomain: string): Promise<string> {
  try {
    const allSettings = await chrome.storage.sync.get(null) as Record<string, string>;
    
    // 完全一致を最優先
    if (allSettings[currentDomain]) {
      return allSettings[currentDomain];
    }
    
    // ワイルドカードパターンをチェック
    for (const [pattern, format] of Object.entries(allSettings)) {
      if (matchesDomain(currentDomain, pattern)) {
        return format;
      }
    }
    
    return '';
  } catch (error) {
    console.error('Failed to find matching format:', error);
    return '';
  }
}