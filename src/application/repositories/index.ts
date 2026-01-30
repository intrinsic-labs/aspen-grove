/**
 * Repository Interfaces Module
 *
 * Exports all repository interfaces for the application layer.
 * These abstract contracts define data access operations without
 * specifying implementation details.
 *
 * Infrastructure layer provides concrete implementations.
 */

// Common types
export {
  type Pagination,
  type PaginatedResult,
  type SortOptions,
  type DateRangeFilter,
  SortDirection,
  DEFAULT_PAGINATION,
  createPagination,
  createPaginatedResult,
  isInDateRange,
} from './common';

// Observable types (shared across repositories)
export type {
  Observable,
  Observer,
  Subscription,
} from './loom-tree-repository';

// Core repositories
export type { IGroveRepository } from './grove-repository';
export type { ILoomTreeRepository } from './loom-tree-repository';
export type { INodeRepository } from './node-repository';
export type { IEdgeRepository } from './edge-repository';
export type { IAgentRepository } from './agent-repository';

// Organization repositories
export type { IDocumentRepository } from './document-repository';
export type { ILinkRepository } from './link-repository';
export type { ITagRepository } from './tag-repository';

// Provenance repositories
export type {
  IRawApiResponseRepository,
  ITimestampCertificateRepository,
} from './provenance-repository';

// User repositories
export type { IUserPreferencesRepository } from './user-preferences-repository';
export type { ILocalModelRepository } from './local-model-repository';
