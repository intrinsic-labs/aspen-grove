import { DirectTextAdapter } from './direct/DirectTextAdapter';
import { anthropicProtocol } from './anthropic/protocol';
import type { StreamTimeouts } from './shared/stream-timeouts';

/** Anthropic Messages API, with on-device credentials and stateless history. */
export class AnthropicAdapter extends DirectTextAdapter {
  constructor(timeoutMs?: number, streamTimeouts?: StreamTimeouts) {
    super(anthropicProtocol, timeoutMs, streamTimeouts);
  }
}
