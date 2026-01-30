/**
 * Node Repository Implementation
 *
 * WatermelonDB implementation of INodeRepository.
 * Manages persistence for Node entities (immutable content units in Loom Trees).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type {
  INodeRepository,
  Pagination,
  PaginatedResult,
  Observable,
  Observer,
} from '../../../application/repositories';
import type {
  Node,
  CreateNodeInput,
  NodeFilters,
  NodeMetadata,
  Ulid,
  Timestamp,
} from '../../../domain';
import { NotFoundError, DEFAULT_NODE_METADATA, EdgeSourceRole, EdgeType } from '../../../domain';
import { generateLocalId } from '../../../domain/values';
import { NodeModel, EdgeModel } from '../models';

/**
 * Convert a NodeModel to a domain Node entity.
 */
function toDomain(model: NodeModel): Node {
  return {
    id: model.id as Ulid,
    localId: model.localId,
    loomTreeId: model.loomTreeId as Ulid,
    content: model.content,
    summary: model.summary,
    authorAgentId: model.authorAgentId as Ulid,
    authorType: model.authorType,
    contentHash: model.contentHash,
    createdAt: model.createdAt.getTime() as Timestamp,
    metadata: model.metadata,
    editedFrom: model.editedFrom as Ulid | null,
  };
}

/**
 * WatermelonDB implementation of Node repository.
 */
export class NodeRepository implements INodeRepository {
  constructor(private database: Database) {}

  async create(input: CreateNodeInput): Promise<Node> {
    const nodesCollection = this.database.get<NodeModel>('nodes');
    const edgesCollection = this.database.get<EdgeModel>('edges');

    // Get existing localIds to avoid collisions
    const existingLocalIds = await this.getExistingLocalIds(input.loomTreeId);
    const localId = generateLocalId(input.id, existingLocalIds);

    const created = await this.database.write(async () => {
      const node = await nodesCollection.create((record) => {
        record._raw.id = input.id;
        record.localId = localId;
        record.loomTreeId = input.loomTreeId;
        record.content = input.content;
        record.summary = null;
        record.authorAgentId = input.authorAgentId;
        record.authorType = input.authorType;
        record.contentHash = input.contentHash;
        record.metadata = {
          ...DEFAULT_NODE_METADATA,
          ...input.metadata,
        };
        record.editedFrom = input.editedFrom ?? null;
      });

      // Create edges from parent nodes if provided
      if (input.parentNodeIds && input.parentNodeIds.length > 0) {
        for (const parentId of input.parentNodeIds) {
          await edgesCollection.create((edge) => {
            edge.loomTreeId = input.loomTreeId;
            edge.sources = [{ nodeId: parentId, role: EdgeSourceRole.Primary }];
            edge.targetNodeId = input.id;
            edge.edgeType = EdgeType.Continuation;
          });
        }
      }

      return node;
    });

    return toDomain(created);
  }

  async findById(id: Ulid): Promise<Node | null> {
    try {
      const nodesCollection = this.database.get<NodeModel>('nodes');
      const model = await nodesCollection.find(id);
      return toDomain(model);
    } catch {
      return null;
    }
  }

  async findByLocalId(loomTreeId: Ulid, localId: string): Promise<Node | null> {
    const nodesCollection = this.database.get<NodeModel>('nodes');
    const results = await nodesCollection
      .query(Q.where('loom_tree_id', loomTreeId), Q.where('local_id', localId))
      .fetch();

    if (results.length === 0) {
      return null;
    }

    return toDomain(results[0]);
  }

  async findByLoomTree(
    loomTreeId: Ulid,
    filters?: NodeFilters,
    pagination?: Pagination
  ): Promise<PaginatedResult<Node>> {
    const nodesCollection = this.database.get<NodeModel>('nodes');

    const conditions: Q.Clause[] = [Q.where('loom_tree_id', loomTreeId)];

    if (filters?.authorAgentId) {
      conditions.push(Q.where('author_agent_id', filters.authorAgentId));
    }
    if (filters?.authorType) {
      conditions.push(Q.where('author_type', filters.authorType));
    }
    if (filters?.bookmarked !== undefined) {
      conditions.push(Q.where('bookmarked', filters.bookmarked));
    }
    if (filters?.pruned !== undefined) {
      conditions.push(Q.where('pruned', filters.pruned));
    }

    const query = nodesCollection.query(...conditions);
    const total = await query.fetchCount();

    let results: NodeModel[];
    if (pagination) {
      results = await query.extend(Q.skip(pagination.offset), Q.take(pagination.limit)).fetch();
    } else {
      results = await query.fetch();
    }

    return {
      items: results.map(toDomain),
      total,
      hasMore: pagination ? pagination.offset + results.length < total : false,
    };
  }

  async findRoot(loomTreeId: Ulid): Promise<Node> {
    const nodesCollection = this.database.get<NodeModel>('nodes');
    const edgesCollection = this.database.get<EdgeModel>('edges');

    // Get all nodes in the tree
    const nodes = await nodesCollection.query(Q.where('loom_tree_id', loomTreeId)).fetch();

    // Get all edges targeting nodes in this tree
    const edges = await edgesCollection
      .query(Q.where('loom_tree_id', loomTreeId), Q.where('edge_type', 'continuation'))
      .fetch();

    // Find node IDs that are targets of continuation edges
    const targetIds = new Set(edges.map((e) => e.targetNodeId));

    // Root is the node that is not a target of any continuation edge
    const root = nodes.find((n) => !targetIds.has(n.id));

    if (!root) {
      throw new NotFoundError('Node', `root of tree ${loomTreeId}`);
    }

    return toDomain(root);
  }

  async findChildren(nodeId: Ulid): Promise<Node[]> {
    const nodesCollection = this.database.get<NodeModel>('nodes');
    const edgesCollection = this.database.get<EdgeModel>('edges');

    // Find continuation edges where this node is a source
    const edges = await edgesCollection.query(Q.where('edge_type', 'continuation')).fetch();

    // Filter edges where nodeId is in sources
    const childEdges = edges.filter((edge) => edge.sources.some((s) => s.nodeId === nodeId));

    if (childEdges.length === 0) {
      return [];
    }

    // Get the target nodes
    const childIds = childEdges.map((e) => e.targetNodeId);
    const children = await nodesCollection.query(Q.where('id', Q.oneOf(childIds))).fetch();

    return children.map(toDomain);
  }

  async findSiblings(nodeId: Ulid): Promise<Node[]> {
    const edgesCollection = this.database.get<EdgeModel>('edges');

    // Find the edge pointing to this node
    const incomingEdges = await edgesCollection
      .query(Q.where('target_node_id', nodeId), Q.where('edge_type', 'continuation'))
      .fetch();

    if (incomingEdges.length === 0) {
      return []; // Root node has no siblings
    }

    // Get the parent node ID
    const parentId = incomingEdges[0].sources[0]?.nodeId;
    if (!parentId) {
      return [];
    }

    // Find all children of the parent
    const allChildren = await this.findChildren(parentId);

    // Exclude the current node
    return allChildren.filter((child) => child.id !== nodeId);
  }

  async findPath(nodeId: Ulid): Promise<Node[]> {
    const path: Node[] = [];
    let currentId: Ulid | null = nodeId;

    while (currentId) {
      const node = await this.findById(currentId);
      if (!node) {
        break;
      }

      path.unshift(node); // Add to beginning

      // Find parent via incoming continuation edge
      const edgesCollection = this.database.get<EdgeModel>('edges');
      const incomingEdges = await edgesCollection
        .query(Q.where('target_node_id', currentId), Q.where('edge_type', 'continuation'))
        .fetch();

      if (incomingEdges.length === 0) {
        break; // Reached root
      }

      currentId = incomingEdges[0].sources[0]?.nodeId as Ulid | null;
    }

    return path;
  }

  async updateMetadata(id: Ulid, metadata: Partial<NodeMetadata>): Promise<Node> {
    const nodesCollection = this.database.get<NodeModel>('nodes');

    let model: NodeModel;
    try {
      model = await nodesCollection.find(id);
    } catch {
      throw new NotFoundError('Node', id);
    }

    await this.database.write(async () => {
      await model.update((record) => {
        record.metadata = { ...record.metadata, ...metadata };
      });
    });

    return toDomain(model);
  }

  async updateSummary(id: Ulid, summary: string): Promise<Node> {
    const nodesCollection = this.database.get<NodeModel>('nodes');

    let model: NodeModel;
    try {
      model = await nodesCollection.find(id);
    } catch {
      throw new NotFoundError('Node', id);
    }

    await this.database.write(async () => {
      await model.update((record) => {
        record.summary = summary;
      });
    });

    return toDomain(model);
  }

  async findVersions(nodeId: Ulid): Promise<Node[]> {
    const nodesCollection = this.database.get<NodeModel>('nodes');
    const results = await nodesCollection.query(Q.where('edited_from', nodeId)).fetch();

    return results.map(toDomain);
  }

  async getExistingLocalIds(loomTreeId: Ulid): Promise<Set<string>> {
    const nodesCollection = this.database.get<NodeModel>('nodes');
    const nodes = await nodesCollection.query(Q.where('loom_tree_id', loomTreeId)).fetch();

    return new Set(nodes.map((n) => n.localId));
  }

  async count(loomTreeId: Ulid, filters?: NodeFilters): Promise<number> {
    const nodesCollection = this.database.get<NodeModel>('nodes');

    const conditions: Q.Clause[] = [Q.where('loom_tree_id', loomTreeId)];

    if (filters?.authorAgentId) {
      conditions.push(Q.where('author_agent_id', filters.authorAgentId));
    }
    if (filters?.authorType) {
      conditions.push(Q.where('author_type', filters.authorType));
    }
    if (filters?.bookmarked !== undefined) {
      conditions.push(Q.where('bookmarked', filters.bookmarked));
    }
    if (filters?.pruned !== undefined) {
      conditions.push(Q.where('pruned', filters.pruned));
    }

    return nodesCollection.query(...conditions).fetchCount();
  }

  async findBookmarked(loomTreeId: Ulid): Promise<Node[]> {
    const nodesCollection = this.database.get<NodeModel>('nodes');
    const results = await nodesCollection
      .query(Q.where('loom_tree_id', loomTreeId), Q.where('bookmarked', true))
      .fetch();

    return results.map(toDomain);
  }

  observe(id: Ulid): Observable<Node | null> {
    const nodesCollection = this.database.get<NodeModel>('nodes');

    return {
      subscribe: (observerOrNext: Observer<Node | null> | ((value: Node | null) => void)) => {
        const observer: Observer<Node | null> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = nodesCollection.findAndObserve(id).subscribe({
          next: (model) => observer.next(toDomain(model)),
          error: () => observer.next(null),
        });

        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }

  observeByLoomTree(loomTreeId: Ulid, filters?: NodeFilters): Observable<Node[]> {
    const nodesCollection = this.database.get<NodeModel>('nodes');

    const conditions: Q.Clause[] = [Q.where('loom_tree_id', loomTreeId)];

    if (filters?.authorAgentId) {
      conditions.push(Q.where('author_agent_id', filters.authorAgentId));
    }
    if (filters?.authorType) {
      conditions.push(Q.where('author_type', filters.authorType));
    }
    if (filters?.bookmarked !== undefined) {
      conditions.push(Q.where('bookmarked', filters.bookmarked));
    }

    return {
      subscribe: (observerOrNext: Observer<Node[]> | ((value: Node[]) => void)) => {
        const observer: Observer<Node[]> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = nodesCollection
          .query(...conditions)
          .observe()
          .subscribe({
            next: (models) => observer.next(models.map(toDomain)),
            error: (err) => observer.error?.(err),
          });

        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }
}
