import { ULID } from '@domain/value-objects';

/**
 * PathMode
 *
 * Path is shared across modes, but PathState can optionally store mode-specific cursors.
 */
export type PathMode = 'dialogue' | 'buffer';

/**
 * Path
 *
 * A persisted, agent-owned "view" through a LoomTree.
 *
 * - Changes often (navigation), but is stored as durable state so it can survive restarts
 *   and later be synced/shared.
 * - Path is mode-agnostic and shared across modes.
 */
export interface Path {
  readonly id: ULID;
  readonly loomTreeId: ULID;
  readonly ownerAgentId: ULID;
  readonly name?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt?: Date;
}

/**
 * PathNode
 *
 * A materialized, ordered sequence of nodes representing the current resolved path.
 * This is persisted to make rendering (especially Buffer Mode) fast and deterministic.
 */
export interface PathNode {
  readonly id: ULID;
  readonly pathId: ULID;
  readonly position: number;
  readonly nodeId: ULID;
  readonly createdAt: Date;
}

/**
 * PathSelection
 *
 * Disambiguation choices required to deterministically resolve a path through a permissive graph.
 *
 * Typical uses:
 * - Hyperedges: choose which source node is active for a given target node
 * - DAG merges: choose which incoming continuation edge is active for a given target node
 */
export interface PathSelection {
  readonly id: ULID;
  readonly pathId: ULID;
  readonly targetNodeId: ULID;
  readonly selectedEdgeId?: ULID;
  readonly selectedSourceNodeId?: ULID;
  readonly updatedAt: Date;
}

/**
 * PathState
 *
 * Fast-changing cursor state for a Path. Persisted so it survives restarts and can later be synced.
 *
 * Mode is optional — if provided, you can keep separate cursors per mode while sharing the same Path.
 */
export interface PathState {
  readonly id: ULID;
  readonly pathId: ULID;
  readonly mode?: PathMode;
  readonly activeNodeId: ULID;
  readonly updatedAt: Date;
}

/**
 * Repository interface for Path persistence operations.
 * Infrastructure layer implements this contract.
 */
export interface IPathRepository {
  // === Basic CRUD ===

  /** Find a Path by ID, or null if not found. */
  findById(id: ULID): Promise<Path | null>;

  /** Find the Path for a given (loomTreeId, ownerAgentId), or null if none exists. */
  findByTreeAndOwner(loomTreeId: ULID, ownerAgentId: ULID): Promise<Path | null>;

  /** Create a new Path for (loomTreeId, ownerAgentId). */
  create(input: CreatePathInput): Promise<Path>;

  /** Update mutable fields (e.g., name, archivedAt). */
  update(input: UpdatePathInput): Promise<Path>;

  /** Permanently delete a Path and all related PathNodes/Selections/State. */
  hardDelete(id: ULID): Promise<boolean>;

  // === Materialized sequence (PathNodes) ===

  /** Get the current materialized node sequence for this Path (ordered by position). */
  getNodeSequence(pathId: ULID): Promise<PathNode[]>;

  /**
   * Append a node to the end of the Path sequence.
   * Use this for incremental forward navigation/generation.
   */
  appendNode(pathId: ULID, nodeId: ULID): Promise<PathNode>;

  /**
   * Truncate the Path sequence to a given length (keep positions [0..newLength-1]).
   * Use this for back navigation and suffix replacement.
   */
  truncate(pathId: ULID, newLength: number): Promise<void>;

  /**
   * Replace the suffix of a Path starting at `startPosition` with `nodeIds`.
   * This is the core operation for "switch sibling branch at position K".
   */
  replaceSuffix(pathId: ULID, startPosition: number, nodeIds: readonly ULID[]): Promise<void>;

  // === Selections ===

  /** Get all selections for a Path. */
  getSelections(pathId: ULID): Promise<PathSelection[]>;

  /** Get selection for a specific target node within a Path. */
  getSelection(pathId: ULID, targetNodeId: ULID): Promise<PathSelection | null>;

  /** Upsert selection for a target node (edge and/or source). */
  upsertSelection(input: UpsertPathSelectionInput): Promise<PathSelection>;

  /** Delete selection for a target node within a Path. */
  deleteSelection(pathId: ULID, targetNodeId: ULID): Promise<boolean>;
}

/** Input for creating a new Path. */
export type CreatePathInput = {
  readonly loomTreeId: ULID;
  readonly ownerAgentId: ULID;
  readonly name?: string;
};

/** Input for updating a Path's mutable fields. */
export type UpdatePathInput = {
  readonly id: ULID;
  readonly changes: {
    readonly name?: string;
    /** Set to null to clear archive state. */
    readonly archivedAt?: Date | null;
  };
};

export type UpsertPathSelectionInput = {
  readonly pathId: ULID;
  readonly targetNodeId: ULID;
  readonly selectedEdgeId?: ULID;
  readonly selectedSourceNodeId?: ULID;
};

/**
 * Repository interface for PathState persistence operations.
 * Infrastructure layer implements this contract.
 */
export interface IPathStateRepository {
  /** Find PathState by (pathId, mode). Mode may be undefined for shared cursor. */
  findByPathId(pathId: ULID, mode?: PathMode): Promise<PathState | null>;

  /** Create initial PathState. */
  create(input: CreatePathStateInput): Promise<PathState>;

  /** Update active node cursor. */
  setActiveNode(pathId: ULID, activeNodeId: ULID, mode?: PathMode): Promise<PathState>;

  /** Permanently delete PathState records for a Path. */
  hardDeleteByPathId(pathId: ULID): Promise<boolean>;
};

export type CreatePathStateInput = {
  readonly pathId: ULID;
  readonly activeNodeId: ULID;
  readonly mode?: PathMode;
};
