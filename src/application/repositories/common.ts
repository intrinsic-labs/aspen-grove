/**
 * Common Repository Types
 *
 * Shared types used across all repositories for pagination,
 * filtering, and standard return types.
 */

/**
 * Pagination parameters for list operations.
 */
export interface Pagination {
  /** Maximum items to return */
  limit: number;

  /** Number of items to skip */
  offset: number;
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGINATION: Pagination = {
  limit: 50,
  offset: 0,
};

/**
 * Create pagination with defaults for unspecified values
 */
export function createPagination(partial: Partial<Pagination> = {}): Pagination {
  return {
    ...DEFAULT_PAGINATION,
    ...partial,
  };
}

/**
 * Paginated result wrapper.
 * Contains both the items and metadata about the full result set.
 */
export interface PaginatedResult<T> {
  /** The items for the current page */
  items: T[];

  /** Total count of items matching the query (ignoring pagination) */
  total: number;

  /** Whether there are more items after this page */
  hasMore: boolean;
}

/**
 * Create a paginated result
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  pagination: Pagination
): PaginatedResult<T> {
  return {
    items,
    total,
    hasMore: pagination.offset + items.length < total,
  };
}

/**
 * Sort direction for ordered queries
 */
export enum SortDirection {
  Ascending = 'asc',
  Descending = 'desc',
}

/**
 * Sort options for list operations
 */
export interface SortOptions<TField extends string = string> {
  /** Field to sort by */
  field: TField;

  /** Sort direction */
  direction: SortDirection;
}

/**
 * Common date range filter
 */
export interface DateRangeFilter {
  /** Start of range (inclusive) */
  from?: number;

  /** End of range (inclusive) */
  to?: number;
}

/**
 * Check if a timestamp falls within a date range
 */
export function isInDateRange(
  timestamp: number,
  range: DateRangeFilter
): boolean {
  if (range.from !== undefined && timestamp < range.from) {
    return false;
  }
  if (range.to !== undefined && timestamp > range.to) {
    return false;
  }
  return true;
}
