/**
 * Edge Repository Implementation
 *
 * WatermelonDB implementation of IEdgeRepository.
 * Manages persistence for Edge entities (hyperedges connecting nodes).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type { IEdgeRepository, Observable, Observer } from '../../../application/repositories';
import type { Edge, CreateEdgeInput, EdgeFilters, EdgeSourceRole, Ulid } from '../../../domain';
import { NotFoundError, ValidationError, EdgeType } from '../../../domain';
import { EdgeModel, NodeModel } from '../models';

/**
 * Convert an EdgeModel to a domain Edge entity.
 */
function toDomain(model: EdgeModel): Edge {
  return model.toEntity();
}

/**
 * WatermelonDB implementation of Edge repository.
 */
export class EdgeRepository implements IEdgeRepository {
  constructor(private database: Database) {}

  async create(input: CreateEdgeInput): Promise<Edge> {
    const edgesCollection = this.database.get<EdgeModel>('edges');
    const nodesCollection = this.database.get<NodeModel>('nodes');

    // Validate all nodes belong to the same LoomTree
    const sourceNodeIds = input.sources.map((s) => s.nodeId);
    const allNodeIds = [...sourceNodeIds, input.targetNodeId];

    const nodes = await nodesCollection.query(Q.where('id', Q.oneOf(allNodeIds))).fetch();

    const treeIds = new Set(nodes.map((n) => n.loomTreeId));
    if (treeIds.size > 1 || !treeIds.has(input.loomTreeId)) {
      throw new ValidationError('All edge nodes must belong to the same LoomTree');
    }

    const created = await this.database.write(async () => {
      return edgesCollection.create((edge) => {
        edge._raw.id = input.id;
        edge.loomTreeId = input.loomTreeId;
        edge.sources = input.sources;
        edge.targetNodeId = input.targetNodeId;
        edge.edgeType = input.edgeType;
      });
    });

    return toDomain(created);
  }

  async findById(id: Ulid): Promise<Edge | null> {
    try {
      const edgesCollection = this.database.get<EdgeModel>('edges');
      const model = await edgesCollection.find(id);
      return toDomain(model);
    } catch {
      return null;
    }
  }

  async findByTarget(targetNodeId: Ulid): Promise<Edge[]> {
    const edgesCollection = this.database.get<EdgeModel>('edges');
    const results = await edgesCollection.query(Q.where('target_node_id', targetNodeId)).fetch();

    return results.map(toDomain);
  }

  async findBySource(sourceNodeId: Ulid): Promise<Edge[]> {
    const edgesCollection = this.database.get<EdgeModel>('edges');
    const allEdges = await edgesCollection.query().fetch();

    // Filter edges where sourceNodeId is in sources array
    const filtered = allEdges.filter((edge) => edge.sources.some((s) => s.nodeId === sourceNodeId));

    return filtered.map(toDomain);
  }

  async findByLoomTree(loomTreeId: Ulid, filters?: EdgeFilters): Promise<Edge[]> {
    const edgesCollection = this.database.get<EdgeModel>('edges');

    const conditions: Q.Clause[] = [Q.where('loom_tree_id', loomTreeId)];

    if (filters?.edgeType) {
      conditions.push(Q.where('edge_type', filters.edgeType));
    }

    const results = await edgesCollection.query(...conditions).fetch();
    return results.map(toDomain);
  }

  async delete(id: Ulid): Promise<boolean> {
    const edgesCollection = this.database.get<EdgeModel>('edges');

    try {
      const model = await edgesCollection.find(id);
      await this.database.write(async () => {
        await model.markAsDeleted();
      });
      return true;
    } catch {
      return false;
    }
  }

  async addVersionSource(edgeId: Ulid, versionNodeId: Ulid, role: EdgeSourceRole): Promise<Edge> {
    const edgesCollection = this.database.get<EdgeModel>('edges');
    const nodesCollection = this.database.get<NodeModel>('nodes');

    let model: EdgeModel;
    try {
      model = await edgesCollection.find(edgeId);
    } catch {
      throw new NotFoundError('Edge', edgeId);
    }

    // Validate version node belongs to same tree
    try {
      const versionNode = await nodesCollection.find(versionNodeId);
      if (versionNode.loomTreeId !== model.loomTreeId) {
        throw new ValidationError('Version node must belong to the same LoomTree');
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new NotFoundError('Node', versionNodeId);
    }

    await this.database.write(async () => {
      await model.update((edge) => {
        edge.sources = [...edge.sources, { nodeId: versionNodeId, role }];
      });
    });

    return toDomain(model);
  }

  async findContinuations(sourceNodeId: Ulid): Promise<Edge[]> {
    const allEdges = await this.findBySource(sourceNodeId);
    return allEdges.filter((edge) => edge.edgeType === EdgeType.Continuation);
  }

  async findAnnotations(targetNodeId: Ulid): Promise<Edge[]> {
    const allEdges = await this.findByTarget(targetNodeId);
    return allEdges.filter((edge) => edge.edgeType === EdgeType.Annotation);
  }

  async hasChildren(nodeId: Ulid): Promise<boolean> {
    const continuations = await this.findContinuations(nodeId);
    return continuations.length > 0;
  }

  async hasParent(nodeId: Ulid): Promise<boolean> {
    const edgesCollection = this.database.get<EdgeModel>('edges');
    const results = await edgesCollection
      .query(Q.where('target_node_id', nodeId), Q.where('edge_type', EdgeType.Continuation))
      .fetch();

    return results.length > 0;
  }

  async findParentEdge(nodeId: Ulid): Promise<Edge | null> {
    const edgesCollection = this.database.get<EdgeModel>('edges');
    const results = await edgesCollection
      .query(Q.where('target_node_id', nodeId), Q.where('edge_type', EdgeType.Continuation))
      .fetch();

    if (results.length === 0) {
      return null;
    }

    return toDomain(results[0]);
  }

  async count(loomTreeId: Ulid, filters?: EdgeFilters): Promise<number> {
    const edgesCollection = this.database.get<EdgeModel>('edges');

    const conditions: Q.Clause[] = [Q.where('loom_tree_id', loomTreeId)];

    if (filters?.edgeType) {
      conditions.push(Q.where('edge_type', filters.edgeType));
    }

    return edgesCollection.query(...conditions).fetchCount();
  }

  async deleteByLoomTree(loomTreeId: Ulid): Promise<number> {
    const edgesCollection = this.database.get<EdgeModel>('edges');
    const edges = await edgesCollection.query(Q.where('loom_tree_id', loomTreeId)).fetch();

    const count = edges.length;

    await this.database.write(async () => {
      for (const edge of edges) {
        await edge.markAsDeleted();
      }
    });

    return count;
  }

  observeByNode(nodeId: Ulid): Observable<Edge[]> {
    const edgesCollection = this.database.get<EdgeModel>('edges');

    return {
      subscribe: (observerOrNext: Observer<Edge[]> | ((value: Edge[]) => void)) => {
        const observer: Observer<Edge[]> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        // Observe edges where this node is the target
        const subscription = edgesCollection
          .query(Q.where('target_node_id', nodeId))
          .observe()
          .subscribe({
            next: async (targetEdges) => {
              // Also get edges where this node is a source
              const sourceEdges = await this.findBySource(nodeId);
              const allEdges = [...targetEdges.map(toDomain), ...sourceEdges];
              // Dedupe by ID
              const uniqueEdges = Array.from(new Map(allEdges.map((e) => [e.id, e])).values());
              observer.next(uniqueEdges);
            },
            error: (err) => observer.error?.(err),
          });

        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }
}
