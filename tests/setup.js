// Jest setup file for Chrome extension testing

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    onInstalled: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    onActivated: {
      addListener: jest.fn(),
    },
    onUpdated: {
      addListener: jest.fn(),
    },
    get: jest.fn(),
    sendMessage: jest.fn(),
    query: jest.fn(),
  },
};

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    read: jest.fn(),
    readText: jest.fn(),
    write: jest.fn(),
    writeText: jest.fn(),
  },
  writable: true,
});

// Mock DOMParser
global.DOMParser = class MockDOMParser {
  parseFromString(str, type) {
    const doc = document.implementation.createHTMLDocument();
    doc.documentElement.innerHTML = str;
    return doc;
  }
};

// Mock URL constructor for tests
global.URL = class MockURL {
  constructor(url) {
    const match = url.match(/^https?:\/\/([^\/]+)/);
    this.hostname = match ? match[1] : 'localhost';
  }
};