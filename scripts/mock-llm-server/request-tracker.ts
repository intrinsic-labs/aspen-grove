import type { ServerResponse } from 'node:http';

/**
 * The counters every completion route shares, so a chat request and a text
 * request are numbered in one sequence and open together in one burst:
 * `--fail-every` and `--fail-in-burst` mean the same on both.
 *
 * `arrive` runs on arrival, before the body is read, so positions follow the
 * order the app opened its requests (bodies can finish arriving in another
 * order). A burst is the run of requests that arrive while some are open.
 */
export const createRequestTracker = () => {
  let requestCount = 0;
  let active = 0;
  let openCompletions = 0;
  let burstSize = 0;
  return {
    arrive(res: ServerResponse) {
      const number = ++requestCount;
      burstSize = openCompletions === 0 ? 1 : burstSize + 1;
      const arrival = burstSize;
      openCompletions += 1;
      res.on('close', () => {
        openCompletions -= 1;
      });
      return { number, id: `mock-${number}`, arrival };
    },
    /** Marks one request as being served; returns how many are. */
    begin: () => ++active,
    end: () => --active,
    activeCount: () => active,
  };
};

export type RequestTracker = ReturnType<typeof createRequestTracker>;
