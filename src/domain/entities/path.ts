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

  /** The agent whose cursor this represents. */
  readonly agentId: ULID;

  /** Optional mode for separate per-mode cursor; shared Path across modes. */
  readonly mode?: PathMode;

  /** The "cursor" node (current focus) within the resolved path. */
  readonly activeNodeId: ULID;

  readonly updatedAt: Date;
}
