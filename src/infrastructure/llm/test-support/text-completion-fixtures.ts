import { createHash } from 'crypto';
import type {
  ILlmProvider,
  StreamChunk,
  TextCompletionRequest,
} from '@application/services/llm';
import { LMStudioAdapter } from '../LMStudioAdapter';
import { OpenRouterAdapter } from '../OpenRouterAdapter';

/** Shared by the text-completion tests: requests, SSE events and both providers. */

export const textRequest = (
  overrides: Partial<TextCompletionRequest> = {}
): TextCompletionRequest => ({
  kind: 'text',
  model: 'base/model',
  prompt: 'The snow fell ',
  maxTokens: 50,
  ...overrides,
});

export const sse = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
export const delta = (text: string) =>
  sse({
    model: 'base/model',
    choices: [{ index: 0, text, finish_reason: null }],
  });
export const finish = (reason = 'stop') =>
  sse({ choices: [{ index: 0, text: '', finish_reason: reason }] });
export const DONE = 'data: [DONE]\n\n';

export const drain = async (stream: AsyncIterable<StreamChunk>) => {
  const chunks: StreamChunk[] = [];
  try {
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return { chunks };
  } catch (error) {
    return { chunks, error };
  }
};

export const sha = (text: string) =>
  createHash('sha256').update(text, 'utf8').digest('hex');
export const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

export type Create = (timeouts?: {
  firstByteMs: number;
  idleMs: number;
}) => Promise<ILlmProvider>;

export const providers: [string, Create][] = [
  [
    'OpenRouterAdapter',
    async (timeouts) => {
      const adapter = new OpenRouterAdapter(45_000, timeouts);
      await adapter.initialize({ apiKey: 'sk-or-test' });
      return adapter;
    },
  ],
  [
    'LMStudioAdapter',
    async (timeouts) => {
      const adapter = new LMStudioAdapter({ streamTimeouts: timeouts });
      await adapter.initialize({ apiKey: '' }, { endpoint: 'http://lan:1234' });
      return adapter;
    },
  ],
];
