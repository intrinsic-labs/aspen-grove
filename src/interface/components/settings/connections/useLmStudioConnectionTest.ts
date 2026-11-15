import { useCallback, useRef, useState } from 'react';

export type LmStudioConnectionStatus =
  'connected' | 'disconnected' | 'checking' | 'idle';

/** The server a test runs against. */
export type LmStudioConnectionTarget = {
  readonly endpoint: string;
  readonly token: string;
};

type TestResult = {
  /** The target the test ran against (`targetKey`). */
  readonly key: string;
  readonly status: Exclude<LmStudioConnectionStatus, 'idle'>;
  readonly error: string | null;
};

const targetKey = (target: LmStudioConnectionTarget): string =>
  JSON.stringify([target.endpoint.trim(), target.token.trim()]);

/**
 * Connections' "Test Connection" for LM Studio. A result holds only for the
 * server address and token it was tested with: edit either and the status
 * reads Untested again until the next test, and the answer to a test still
 * running for the old address is dropped.
 */
export const useLmStudioConnectionTest = (
  target: LmStudioConnectionTarget,
  connect: (target: LmStudioConnectionTarget) => Promise<void>,
  describeError: (caught: unknown, target: LmStudioConnectionTarget) => string
) => {
  const [result, setResult] = useState<TestResult | null>(null);
  const key = targetKey(target);
  const current = result?.key === key ? result : null;

  const { endpoint, token } = target;
  const latestAttempt = useRef(0);
  const test = useCallback(async () => {
    const attempt = ++latestAttempt.current;
    const tested = { endpoint: endpoint.trim(), token: token.trim() };
    const testedKey = targetKey(tested);
    setResult({ key: testedKey, status: 'checking', error: null });
    // Only the latest test may report; its target may have been edited since.
    const settle = (next: Omit<TestResult, 'key'>) => {
      if (attempt === latestAttempt.current) {
        setResult({ key: testedKey, ...next });
      }
    };
    try {
      await connect(tested);
      settle({ status: 'connected', error: null });
    } catch (caught) {
      settle({ status: 'disconnected', error: describeError(caught, tested) });
    }
  }, [connect, describeError, endpoint, token]);

  return {
    status: current?.status ?? ('idle' as LmStudioConnectionStatus),
    error: current?.error ?? null,
    test,
  };
};
