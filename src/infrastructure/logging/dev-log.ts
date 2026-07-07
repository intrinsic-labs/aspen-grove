/**
 * Development-only logging for non-interface layers.
 *
 * No-ops outside of `__DEV__` so infrastructure code stays quiet in
 * production builds.
 */

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const devLog = (message: string, details?: unknown): void => {
  if (!isDev) {
    return;
  }
  if (details !== undefined) {
    console.info(message, details);
    return;
  }
  console.info(message);
};

export const devWarn = (message: string, details?: unknown): void => {
  if (!isDev) {
    return;
  }
  if (details !== undefined) {
    console.warn(message, details);
    return;
  }
  console.warn(message);
};
