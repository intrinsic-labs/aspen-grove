export type SerialQueue = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Runs tasks one at a time in submission order. A failed task doesn't block
 * the ones after it; its error goes only to its own caller.
 *
 * Parallel continuations stream concurrently but persist through one of
 * these: node creation reads every localId in the tree and then picks a free
 * one, which is a read-then-write that concurrent writers could race.
 */
export const createSerialQueue = (): SerialQueue => {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
};
