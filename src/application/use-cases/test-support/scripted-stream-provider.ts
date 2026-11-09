import { computeSha256Hash } from '@application/services/content-hash-service';
import {
  LlmProviderError,
  type CompletionRequest,
  type ILlmProvider,
  type IProviderRegistry,
  type StreamChunk,
  type StreamInterruptionReason,
} from '@application/services/llm';

/** One thing a scripted stream does, in order. */
export type StreamStep =
  | { readonly text: string }
  /** Waits (abortably) until this many streams are open at once. */
  | { readonly waitForOpenStreams: number }
  /** Waits (abortably) until the test releases it. */
  | { readonly waitFor: Promise<void> }
  /** Throws, as a failed request does before or during streaming. */
  | { readonly throw: Error }
  /** Emits a provider `error` chunk mid-stream. */
  | { readonly errorChunk: string }
  /** Ends early with partial text, as adapters do on network loss. */
  | { readonly interrupt: Exclude<StreamInterruptionReason, 'cancelled'> };

const abortable = (wait: Promise<void>, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    signal?.addEventListener('abort', () => resolve());
    void wait.then(resolve);
  });

/**
 * A fake provider whose Nth streaming call follows `scripts[N]`, honouring
 * `request.signal` the way the real adapters do: abort after text ends the
 * stream as `cancelled` with the partial text, abort before text throws a
 * non-retryable `cancelled` error. Every call gets its own raw response.
 */
export const createScriptedStreamProvider = (
  scripts: readonly (readonly StreamStep[])[]
) => {
  let callCount = 0;
  let openStreams = 0;
  let maxOpenStreams = 0;
  const openWaiters: (() => void)[] = [];
  const requests: CompletionRequest[] = [];

  const waitForOpen = (count: number) =>
    new Promise<void>((resolve) => {
      const check = () => {
        if (openStreams >= count) {
          resolve();
          return true;
        }
        return false;
      };
      if (!check()) {
        openWaiters.push(() => void check());
      }
    });

  const rawResponseFor = async (call: number, text: string) => {
    const responseHeaders = `x-request-id: req_${call}`;
    const responseBody = JSON.stringify({ call, text });
    const rawBytes = `${responseHeaders}\n\n${responseBody}`;
    return {
      rawBytes,
      rawBytesHash: await computeSha256Hash(rawBytes),
      requestTimestamp: new Date(),
      responseTimestamp: new Date(),
      latencyMs: 5,
      requestId: `req_${call}`,
      modelIdentifier: 'test/model',
      responseBody,
      responseHeaders,
    };
  };

  async function* stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const call = callCount;
    callCount += 1;
    requests.push(request);
    const steps = scripts[call] ?? [{ text: `call ${call}` }];
    let text = '';
    openStreams += 1;
    maxOpenStreams = Math.max(maxOpenStreams, openStreams);
    openWaiters.forEach((wake) => wake());

    const endIfAborted = async (): Promise<StreamChunk | null> => {
      if (!request.signal?.aborted) {
        return null;
      }
      if (!text) {
        throw new LlmProviderError({
          code: 'cancelled',
          message: 'cancelled',
          provider: 'openrouter',
          retryable: false,
        });
      }
      return {
        type: 'done',
        content: text,
        finishReason: 'error',
        interruptedReason: 'cancelled',
        rawResponse: await rawResponseFor(call, text),
      };
    };

    try {
      for (const step of steps) {
        if ('waitForOpenStreams' in step) {
          await abortable(waitForOpen(step.waitForOpenStreams), request.signal);
        } else if ('waitFor' in step) {
          await abortable(step.waitFor, request.signal);
        }
        const aborted = await endIfAborted();
        if (aborted) {
          yield aborted;
          return;
        }
        if ('text' in step) {
          text += step.text;
          yield { type: 'text', content: step.text };
        } else if ('throw' in step) {
          throw step.throw;
        } else if ('errorChunk' in step) {
          yield { type: 'error', error: step.errorChunk };
          return;
        } else if ('interrupt' in step) {
          yield {
            type: 'done',
            content: text,
            finishReason: 'error',
            interruptedReason: step.interrupt,
            rawResponse: await rawResponseFor(call, text),
          };
          return;
        }
      }
      yield {
        type: 'done',
        content: text,
        finishReason: 'stop',
        rawResponse: await rawResponseFor(call, text),
      };
    } finally {
      openStreams -= 1;
    }
  }

  const provider: ILlmProvider = {
    provider: 'openrouter',
    initialize: async () => true,
    getCapabilities: () => ({
      supportsStreaming: true,
      supportsSystemPrompt: true,
      supportedModels: [],
    }),
    generateCompletion: async () => {
      throw new Error('Parallel continuations must stream.');
    },
    generateStreamingCompletion: stream,
  };

  return {
    provider,
    registry: {
      getProviderForAgent: () => provider,
    } as unknown as IProviderRegistry,
    callCount: () => callCount,
    maxOpenStreams: () => maxOpenStreams,
    requests,
  };
};
