import type { LMStudioModel } from './types';

/**
 * Loaded models first, then by the name the list shows, then by key. The
 * first loaded model is the default a new agent or tree picks, so the order
 * follows what the user reads rather than the raw key.
 */
export const compareLMStudioModels = (
  a: Pick<LMStudioModel, 'state' | 'displayName' | 'id'>,
  b: Pick<LMStudioModel, 'state' | 'displayName' | 'id'>
): number => {
  if (a.state === 'loaded' && b.state !== 'loaded') return -1;
  if (a.state !== 'loaded' && b.state === 'loaded') return 1;
  // Lowercased so the order doesn't depend on the runtime's collation of case.
  return (
    a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()) ||
    a.id.localeCompare(b.id)
  );
};
