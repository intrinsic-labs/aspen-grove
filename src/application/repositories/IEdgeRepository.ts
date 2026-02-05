import { Edge, EdgeSource, EdgeType } from '@domain/entities';
import { ULID } from '@domain/value-objects';

/**
 * Repository interface for Edge persistence operations.
 * Infrastructure layer implements this contract.
 */
export interface IEdgeRepository {
  // === Basic CRUD ===

  /** Find an Edge by ID, or null if not found. */
  findById(id: ULID): Promise<Edge | null>;

  /** Create a new Edge. */
  create(input: CreateEdgeInput): Promise<Edge>;

  /** Delete an Edge by ID. */
  delete(id: ULID): Promise<boolean>;

  // === Queries ===

  /** Find all edges in a tree. */
  findByLoomTreeId(loomTreeId: ULID): Promise<Edge[]>;

  /** Find incoming edges to a node (for path computation). */
  findByTargetNodeId(targetNodeId: ULID): Promise<Edge[]>;

  /** Find outgoing edges from a node (for children lookup). */
  findBySourceNodeId(sourceNodeId: ULID): Promise<Edge[]>;

  /** Find edges by type within a tree. */
  findByEdgeType(loomTreeId: ULID, edgeType: EdgeType): Promise<Edge[]>;

  /** Find the continuation edge(s) targeting a node. Returns empty array for root. */
  findContinuationsByTargetNodeId(targetNodeId: ULID): Promise<Edge[]>;

  /** Find annotation edges attached to a node. */
  findAnnotationsByTargetNodeId(targetNodeId: ULID): Promise<Edge[]>;

  // === Hyperedge Support (Buffer Mode) ===

  /**
   * Add a version node as an alternate source to an edge.
   * Used when editing a node in Buffer Mode to preserve downstream.
   */
  addSourceToEdge(edgeId: ULID, source: EdgeSource): Promise<Edge>;

  /**
   * Remove a source from an edge's sources array.
   * Edge is deleted if no sources remain.
   */
  removeSourceFromEdge(edgeId: ULID, sourceNodeId: ULID): Promise<Edge | null>;
}

export type CreateEdgeInput = {
  readonly loomTreeId: ULID;
  readonly sources: EdgeSource[];
  readonly targetNodeId: ULID;
  readonly edgeType: EdgeType;
};
