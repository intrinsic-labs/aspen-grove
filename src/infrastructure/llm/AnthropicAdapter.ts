import { DirectTextAdapter } from './direct/DirectTextAdapter';
import { anthropicProtocol } from './anthropic/protocol';
import type { StreamTimeouts } from './shared/stream-timeouts';

/** Anthropic Messages API, with on-device credentials and stateless history. */
export class AnthropicAdapter extends DirectTextAdapter {
  /** `endpoint` replaces the full completion URL (a development mock). */
  constructor(
    timeoutMs?: number,
    streamTimeouts?: StreamTimeouts,
    endpoint?: string
  ) {
    super(
      endpoint ? { ...anthropicProtocol, endpoint } : anthropicProtocol,
      timeoutMs,
      streamTimeouts
    );
  }
}
