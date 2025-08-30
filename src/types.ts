// Chrome extension message types
export interface Message {
  action:
    | 'getFormat'
    | 'setFormat'
    | 'deleteFormat'
    | 'getAllFormats'
    | 'startListening'
    | 'stopListening';
  domain?: string;
  format?: string;
}

export interface MessageResponse {
  format?: string;
  formats?: Record<string, string>;
  success?: boolean;
}

// Link information extracted from clipboard
export interface LinkInfo {
  title: string;
  url: string;
}

// Domain matching function type
export type DomainMatcher = (currentDomain: string, pattern: string) => boolean;

// Format finder function type
export type FormatFinder = (currentDomain: string) => Promise<string>;
