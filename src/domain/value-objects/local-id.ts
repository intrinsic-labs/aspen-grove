/**
 * Local ID
 * A context-efficient handle for loom-aware agents.
 * Derived from a ULID
 */

import { ULID } from './ulid';

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type LocalId = Brand<string, 'LocalId'>;

/**
 * Generates a LocalId from a ULID.
 *
 * NOTE: This needs access to existing localIds in the tree
 * to check for collisions. That's a repository concern.
 */
export const createLocalId = (
  ulid: ULID,
  existingLocalIds: Set<LocalId>
): LocalId => {
  for (let length = 6; length <= 8; length++) {
    const candidate = ulid.substring(0, length) as LocalId;
    if (!existingLocalIds.has(candidate)) {
      return candidate;
    }
  }
  
  throw new Error('Unable to satisfy uniqueness for localId')
};
