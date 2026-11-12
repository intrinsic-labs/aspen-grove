import { LlmProviderError } from '@application/services/llm';
import { interruptionNotice, isStoppedBeforeText } from './stopped-generation';

const cancelled = new LlmProviderError({
  code: 'cancelled',
  message: 'cancelled',
  provider: 'lmstudio',
  retryable: false,
});

const aborted = () => {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
};

describe('isStoppedBeforeText', () => {
  it('is a stop when the signal aborted and the request was cancelled', () => {
    expect(isStoppedBeforeText(aborted(), cancelled)).toBe(true);
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    expect(isStoppedBeforeText(aborted(), abortError)).toBe(true);
  });

  it('is not a stop when the signal did not abort', () => {
    expect(isStoppedBeforeText(new AbortController().signal, cancelled)).toBe(
      false
    );
    expect(isStoppedBeforeText(undefined, cancelled)).toBe(false);
  });

  it('still reports a different failure that happened during a stop', () => {
    expect(isStoppedBeforeText(aborted(), new Error('disk full'))).toBe(false);
  });
});

describe('interruptionNotice', () => {
  it('says nothing for a finished reply or a user stop', () => {
    expect(interruptionNotice(undefined)).toBeNull();
    expect(interruptionNotice('cancelled')).toBeNull();
  });

  it('reports other interruptions', () => {
    expect(interruptionNotice('network')).toBe(
      'Stream interrupted (network). Saved partial response.'
    );
  });
});
