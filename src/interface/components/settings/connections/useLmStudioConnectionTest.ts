import { useCallback, useEffect, useRef, useState } from 'react';

export type LmStudioConnectionStatus =
  'connected' | 'disconnected' | 'checking' | 'idle';

/** The server a test runs against. */
export type LmStudioConnectionTarget = {
  readonly endpoint: string;
  readonly token: string;
};

/** A failed test: the plain line, and the technical form when there is one. */
export type LmStudioTestFailure = {
  readonly message: string;
  readonly detail?: string;
};

type TestResult = {
  /** The target the test ran against (`targetKey`). */
  readonly key: string;
  readonly status: Exclude<LmStudioConnectionStatus, 'idle'>;
  readonly error: string | null;
  readonly errorDetail?: string;
};

const targetKey = (target: LmStudioConnectionTarget): string =>
  JSON.stringify([target.endpoint.trim(), target.token.trim()]);

/**
 * Connections' "Test Connection" for LM Studio. A result holds only for the
 * server address and token it was tested with: edit either and the status
 * reads Untested again until the next test, even once the edit is undone,
 * and the answer to a test still running for the old address is dropped.
 */
export const useLmStudioConnectionTest = (
  target: LmStudioConnectionTarget,
  connect: (target: LmStudioConnectionTarget) => Promise<void>,
  describeError: (
    caught: unknown,
    target: LmStudioConnectionTarget
  ) => LmStudioTestFailure
) => {
  const [result, setResult] = useState<TestResult | null>(null);
  const key = targetKey(target);
  const current = result?.key === key ? result : null;

  const { endpoint, token } = target;
  const latestAttempt = useRef(0);

  // An edit ends the result and any test still running: restoring the old
  // address must not bring its answer back.
  useEffect(() => {
    latestAttempt.current += 1;
    setResult((previous) => (previous?.key === key ? previous : null));
  }, [key]);
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
      const failure = describeError(caught, tested);
      settle({
        status: 'disconnected',
        error: failure.message,
        errorDetail: failure.detail,
      });
    }
  }, [connect, describeError, endpoint, token]);

  return {
    status: current?.status ?? ('idle' as LmStudioConnectionStatus),
    error: current?.error ?? null,
    errorDetail: current?.errorDetail,
    test,
  };
};
