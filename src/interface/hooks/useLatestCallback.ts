import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A function whose identity never changes but always calls the latest
 * `callback`. Hand it to memoized children so a parent's changing handler
 * (new closure on every state change) doesn't re-render all of them.
 * Call it from events and effects, not during render.
 */
export const useLatestCallback = <Args extends unknown[], Result>(
  callback: (...args: Args) => Result
): ((...args: Args) => Result) => {
  const latestRef = useRef(callback);
  useLayoutEffect(() => {
    latestRef.current = callback;
  });
  return useCallback((...args: Args) => latestRef.current(...args), []);
};
