/**
 * Edge Module
 *
 * Exports Edge entity and related types.
 */

export type { Edge, CreateEdgeInput, EdgeFilters } from './edge';
export type { EdgeSource } from './edge-source';
export {
  createEdgeSource,
  createPrimarySource,
  isEdgeSource,
  isEdgeSourceArray,
} from './edge-source';
