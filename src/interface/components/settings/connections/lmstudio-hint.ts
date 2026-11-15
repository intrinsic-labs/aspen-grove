import type { LmStudioConnectionStatus } from './useConnectionsController';

/**
 * Whether the LM Studio section shows its setup hint ("Start the server…",
 * "Connect to your LM Studio server…"). It helps until a connection works:
 * untested, while checking and after a failure, never once it is connected.
 */
export const showsLmStudioHint = (status: LmStudioConnectionStatus): boolean =>
  status !== 'connected';
