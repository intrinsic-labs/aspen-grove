import { ULID } from '../value-objects';

/**
 * Path
 *
 * A persisted, agent-owned "view" through a LoomTree. It changes often (navigation),
 * but is stored as durable state so it can survive restarts and (later) be synced/shared.
 *
 * A Path is shared across UI modes (Dialogue/Buffer). Mode-specific cursor state lives in PathState.
 */
export interface Path {
  readonly id: ULID;

  /** The LoomTree this Path belongs to. */
  readonly loomTreeId: ULID;

  /** The Agent who owns this Path (one Path belongs to one Agent). */
  readonly ownerAgentId: ULID;

  /** Optional human-friendly label (e.g., "Main", "Draft A"). */
  readonly name?: string;

  readonly createdAt: Date;
  readonly updatedAt: Date;

  /** Soft-delete/archival hook for future; not required for MVP. */
  readonly archivedAt?: Date;
}

/**
 * PathMode
 *
 * Used for storing mode-specific cursor positions in PathState.
 * Path itself is mode-agnostic and shared across modes.
 */
export type PathMode = 'dialogue' | 'buffer';

/**
 * PathNode
 *
 * A materialized, ordered sequence of nodes representing the current resolved path.
 * This is a persisted cache that is updated incrementally as the user navigates.
 *
 * Invariants (enforced by application/repository):
 * - Positions are contiguous from 0..N-1 for a given Path
 * - (pathId, position) is unique
 * - A nodeId may appear multiple times across different Paths, but typically only once per Path
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
 * These selections are contextual to a Path (not global graph state).
 *
 * Typical uses:
 * - Hyperedges in Buffer Mode (choose which source version is active for an edge targeting a node)
 * - Multiple incoming continuation edges (DAG/merge scenarios) where targetNodeId has >1 candidate parent edge
 *
 * Notes:
 * - You can store either `selectedEdgeId` and/or `selectedSourceNodeId` depending on ambiguity type.
 * - `targetNodeId` is the node being entered/resolved (the "to" side of continuation).
 */
export interface PathSelection {
  readonly id: ULID;
  readonly pathId: ULID;

  /** The node whose incoming resolution is being disambiguated. */
  readonly targetNodeId: ULID;

  /** If multiple incoming edges are valid, choose which edge is active for this Path. */
  readonly selectedEdgeId?: ULID;

  /** If the chosen edge is a hyperedge with multiple sources, choose which source node is active. */
  readonly selectedSourceNodeId?: ULID;

  readonly updatedAt: Date;
}

/**
 * PathState
 *
 * Fast-changing cursor state for a Path. This is UI-ish state, but persisted so it survives restarts
 * and can later be synced.
 *
 * The Path is shared across modes, but you can persist separate cursors per mode if desired.
 */
export interface PathState {
  readonly id: ULID;
  readonly pathId: ULID;

  /** Optional mode for separate per-mode cursor; shared Path across modes. */
  readonly mode?: PathMode;

  /** The "cursor" node (current focus) within the resolved path. */
  readonly activeNodeId: ULID;

  readonly updatedAt: Date;
}

/**
 * Application-layer repository contracts for Path persistence.
 *
 * NOTE: These are located in domain for now because tool access is disabled and the user requested
 * "entities and repository interfaces" in this file. In the preferred architecture, these
 * interfaces belong under `src/application/repositories/...` and should be moved there.
 */
export interface IPathRepository {
  /** Find a Path by ID, or null if not found. */
  findById(id: ULID): Promise<Path | null>;

  /** Find the Path for a given (loomTreeId, ownerAgentId), or null if none exists. */
  findByTreeAndOwner(loomTreeId: ULID, ownerAgentId: ULID): Promise<Path | null>;

  /** Create a new Path for (loomTreeId, ownerAgentId). */
  create(input: CreatePathInput): Promise<Path>;

  /** Update mutable fields (e.g., name). */
  update(input: UpdatePathInput): Promise<Path>;

  /** Permanently delete a Path and its PathNodes/Selections/State. */
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

export type CreatePathInput = {
  readonly loomTreeId: ULID;
  readonly ownerAgentId: ULID;
  readonly name?: string;
};

export type UpdatePathInput = {
  readonly id: ULID;
  readonly changes: {
    readonly name?: string;
    readonly archivedAt?: Date | null;
  };
};

export type UpsertPathSelectionInput = {
  readonly pathId: ULID;
  readonly targetNodeId: ULID;
  readonly selectedEdgeId?: ULID;
  readonly selectedSourceNodeId?: ULID;
};

export interface IPathStateRepository {
  /** Find PathState by (pathId, mode). Mode may be undefined for shared cursor. */
  findByPathId(pathId: ULID, mode?: PathMode): Promise<PathState | null>;

  /** Create initial PathState. */
  create(input: CreatePathStateInput): Promise<PathState>;

  /** Update active node cursor. */
  setActiveNode(pathId: ULID, activeNodeId: ULID, mode?: PathMode): Promise<PathState>;

  /** Permanently delete PathState records for a Path. */
  hardDeleteByPathId(pathId: ULID): Promise<boolean>;
}

export type CreatePathStateInput = {
  readonly pathId: ULID;
  readonly activeNodeId: ULID;
  readonly mode?: PathMode;
};
