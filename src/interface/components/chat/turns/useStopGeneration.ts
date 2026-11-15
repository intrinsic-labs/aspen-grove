import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * The stop button for a single send or regenerate. Each run takes an
 * `AbortSignal` from `begin()` and hands it to the use case as
 * `CompletionRequest.signal`, the same cancellation a parallel card's stop
 * uses (`useParallelContinuations`). Leaving the screen stops the run.
 */
export const useStopGeneration = () => {
  const controllerRef = useRef<AbortController | null>(null);
  const [stoppable, setStoppable] = useState(false);
  const [stopping, setStopping] = useState(false);

  const begin = useCallback((): AbortSignal => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setStoppable(true);
    setStopping(false);
    return controller.signal;
  }, []);

  /** Ends the run that `signal` belongs to; a later run is left alone. */
  const end = useCallback((signal: AbortSignal | undefined) => {
    if (!signal || controllerRef.current?.signal !== signal) {
      return;
    }
    controllerRef.current = null;
    setStoppable(false);
    setStopping(false);
  }, []);

  const stop = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller || controller.signal.aborted) {
      return;
    }
    controller.abort();
    setStopping(true);
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  // Stable, so the send and regenerate callbacks don't change with it.
  const run = useMemo(() => ({ begin, end }), [begin, end]);

  return { run, stop, stoppable, stopping };
};

/** What a send or regenerate needs: start a stoppable run, then end it. */
export type StopGeneration = ReturnType<typeof useStopGeneration>['run'];
