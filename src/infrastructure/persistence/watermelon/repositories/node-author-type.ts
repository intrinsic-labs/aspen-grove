import type { NodeAuthorType } from '@domain/entities';

const NODE_AUTHOR_TYPES: readonly NodeAuthorType[] = ['human', 'model', 'system'];

/**
 * Reads `nodes.author_type`. The column has always been a free string, so a
 * `system` row needs no schema change and every v9 row (`human` or `model`)
 * reads back as it was written. Anything unrecognized reads as `human`, the
 * role Aspen Grove gave imported non-model nodes before it had a system role.
 */
export const toNodeAuthorType = (stored: string | null | undefined): NodeAuthorType =>
  NODE_AUTHOR_TYPES.find((type) => type === stored) ?? 'human';
