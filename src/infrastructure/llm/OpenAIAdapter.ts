import { DirectTextAdapter } from './direct/DirectTextAdapter';
import { openAIProtocol } from './openai/protocol';
import type { StreamTimeouts } from './shared/stream-timeouts';

/** OpenAI Responses API; each request carries the full local branch history. */
export class OpenAIAdapter extends DirectTextAdapter {
  /** `endpoint` replaces the full completion URL (a development mock). */
  constructor(
    timeoutMs?: number,
    streamTimeouts?: StreamTimeouts,
    endpoint?: string
  ) {
    super(
      endpoint ? { ...openAIProtocol, endpoint } : openAIProtocol,
      timeoutMs,
      streamTimeouts
    );
  }
}
