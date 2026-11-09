import { useCallback, useEffect, useState } from 'react';
import type { IContinuationCountPreferenceRepository } from '@application/repositories';
import {
  clampContinuationCount,
  DEFAULT_PARALLEL_CONTINUATIONS,
} from '@application/services/dialogue-continuation';

/**
 * How many continuations "Generate" starts, remembered app-wide. Loads once;
 * each change shows at once and is saved in the background (a failed save
 * only means the next launch starts from the old count).
 */
export const useContinuationCount = (
  repo: Pick<IContinuationCountPreferenceRepository, 'get' | 'set'>
) => {
  const [count, setCountState] = useState(DEFAULT_PARALLEL_CONTINUATIONS);

  useEffect(() => {
    let cancelled = false;
    repo
      .get()
      .then((stored) => {
        if (!cancelled) setCountState(stored);
      })
      .catch(() => {
        // Keep the default.
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const setCount = useCallback(
    (next: number) => {
      const clamped = clampContinuationCount(next);
      setCountState(clamped);
      repo.set(clamped).catch(() => {
        // Shown value stays; only persistence failed.
      });
    },
    [repo]
  );

  return { count, setCount };
};
