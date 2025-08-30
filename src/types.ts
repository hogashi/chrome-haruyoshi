// Chrome extension message types
export interface Message {
  action:
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
