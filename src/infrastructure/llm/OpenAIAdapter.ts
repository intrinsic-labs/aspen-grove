import { DirectTextAdapter } from './direct/DirectTextAdapter';
import { openAIProtocol } from './openai/protocol';
import type { StreamTimeouts } from './shared/stream-timeouts';

/** OpenAI Responses API; each request carries the full local branch history. */
export class OpenAIAdapter extends DirectTextAdapter {
  constructor(timeoutMs?: number, streamTimeouts?: StreamTimeouts) {
    super(openAIProtocol, timeoutMs, streamTimeouts);
  }
}
