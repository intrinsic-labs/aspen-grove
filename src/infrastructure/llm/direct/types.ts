import type {
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  TokenUsage,
} from '@application/services/llm';

export type DirectProvider = 'anthropic' | 'openai';
export type DirectConfig = {
  readonly apiKey: string;
  readonly endpoint: string;
  readonly workspaceId?: string;
};
export type StreamState = {
  content: string;
  model?: string;
  usage?: TokenUsage;
  finishReason: CompletionResponse['finishReason'];
  terminal: boolean;
};
export type DirectProtocol = {
  readonly provider: DirectProvider;
  readonly endpoint: string;
  readonly headers: (
    apiKey: string,
    workspaceId?: string
  ) => Record<string, string>;
  readonly body: (request: CompletionRequest, stream: boolean) => object;
  readonly completion: (
    payload: unknown
  ) => Omit<CompletionResponse, 'rawResponse'> & { model?: string };
  readonly event: (payload: unknown, state: StreamState) => StreamChunk | null;
};
