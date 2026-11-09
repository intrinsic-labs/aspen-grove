export type ChatMessage = {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
};

export type CompletionRequest = {
  readonly messages: ChatMessage[];
  readonly maxTokens: number;
  readonly key: string;
  readonly seed: number;
  readonly targetTokens: number;
};

/** Produces one model reply for a request. */
export type Completer = (request: CompletionRequest) => Promise<string>;
