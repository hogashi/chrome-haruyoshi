// Global type definitions for tests

declare global {
  namespace NodeJS {
    interface Global {
      chrome: any;
    }
  }
  
  var chrome: any;
}

export {};