import type {
  IEdgeRepository,
  IGroveRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import type {
  IBufferDraftStore,
  StoredBufferDraft,
} from '@application/repositories/core/IBufferDraftStore';
import type { IBufferMutationRepository } from '@application/repositories/core/IBufferMutationRepository';
import {
  describeBufferChoices,
  type BufferPositionChoices,
} from '@application/services/buffer/buffer-choices';
import {
  indexBufferGraph,
  type BufferGraph,
  type BufferGraphIssue,
} from '@application/services/buffer/buffer-graph';
import { bufferPassageText } from '@application/services/buffer/buffer-passage-text';
import {
  resolveBufferPath,
  type BufferPathIssue,
  type ResolvedBufferPath,
} from '@application/services/buffer/resolve-buffer-path';
import type { Node, PathSelection } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { repairPendingBufferGeneration } from '@application/services/buffer/repair-pending-buffer-generation';

/** One resolved version on the path, as the editor shows it. */
export type OpenedPassage = {
  readonly nodeId: ULID;
  /** The node's literal text. */
  readonly text: string;
  readonly author: 'human' | 'model';
  /** The earliest model ancestor's text, when this is an edit of model text. */
  readonly ancestorText?: string;
};

export type OpenedBufferDocument = {
  readonly treeId: ULID;
  readonly pathId: ULID;
  readonly ownerAgentId: ULID;
  readonly path: ResolvedBufferPath;
  /** The resolved ids a draft is written against (`path.nodeIds`). */
  readonly sequence: readonly ULID[];
  readonly passages: readonly OpenedPassage[];
  /** The writer's optimistic token: `path.updatedAt` in epoch milliseconds. */
  readonly revision: number;
  /** The id of the path's first membership row: the last operation that wrote it. */
  readonly headOperationId: ULID | undefined;
  /** Choices at every path position. */
  readonly choices: readonly BufferPositionChoices[];
  readonly issues: readonly (BufferGraphIssue | BufferPathIssue)[];
  /** The snapshot, so a draft can reserve ids without reading the database. */
  readonly graph: BufferGraph;
  readonly selections: readonly PathSelection[];
  /** The draft left behind by an earlier session, if any. */
  readonly storedDraft: StoredBufferDraft | null;
};

export type OpenBufferDocumentDependencies = {
  treeRepo: ILoomTreeRepository;
  groveRepo: IGroveRepository;
  nodeRepo: INodeRepository;
  edgeRepo: IEdgeRepository;
  pathRepo: IPathRepository;
  bufferDraftStore: IBufferDraftStore;
  bufferMutationRepo: IBufferMutationRepository;
  rawApiResponseRepo: Pick<IRawApiResponseRepository, 'findByNodeId'>;
};

/** The earliest model-authored ancestor along `editedFrom`, if the node is an edit. */
const modelAncestorText = (
  graph: BufferGraph,
  node: Node
): string | undefined => {
  let found: Node | undefined;
  const seen = new Set<ULID>([node.id]);
  let at: Node | undefined = node.editedFrom
    ? graph.nodesById.get(node.editedFrom)
    : undefined;
  while (at && !seen.has(at.id)) {
    seen.add(at.id);
    if (at.authorType === 'model') found = at;
    at = at.editedFrom ? graph.nodesById.get(at.editedFrom) : undefined;
  }
  return found ? bufferPassageText(found) : undefined;
};

/**
 * Opens a buffer tree on its stored path: the owner's path, resolved from
 * its exact stored sequence, with the literal text of each passage. Resolver
 * and graph defects come back as `issues`; nothing here throws on them.
 */
export class OpenBufferDocumentUseCase {
  constructor(private readonly repos: OpenBufferDocumentDependencies) {}

  async execute({ treeId }: { treeId: ULID }): Promise<OpenedBufferDocument> {
    const { treeRepo, groveRepo, nodeRepo, edgeRepo, pathRepo } = this.repos;
    const tree = await treeRepo.findById(treeId);
    if (!tree || tree.mode !== 'buffer') throw new Error('Not a buffer tree');
    const grove = await groveRepo.findById(tree.groveId);
    if (!grove) throw new Error('Buffer tree has no grove');
    let path = await pathRepo.findByTreeAndOwner(treeId, grove.ownerAgentId);
    if (!path) throw new Error('Buffer tree has no path for its owner');

    await repairPendingBufferGeneration(treeId, path.id, {
      bufferMutationRepository: this.repos.bufferMutationRepo,
      nodeRepository: nodeRepo,
      edgeRepository: edgeRepo,
      rawApiResponseRepository: this.repos.rawApiResponseRepo,
    });
    path = await pathRepo.findById(path.id);
    if (!path) throw new Error('Buffer tree path disappeared during recovery');

    const [nodes, edges, rows, selections] = await Promise.all([
      nodeRepo.findByLoomTreeId(treeId, true),
      edgeRepo.findByLoomTreeId(treeId),
      pathRepo.getNodeSequence(path.id),
      pathRepo.getSelections(path.id),
    ]);
    const graph = indexBufferGraph(nodes, edges);
    const resolved = resolveBufferPath(
      graph,
      rows.map((row) => row.nodeId),
      selections,
      { kind: 'open' }
    );
    const passages = resolved.nodeIds.map<OpenedPassage>((id) => {
      const node = graph.nodesById.get(id) as Node;
      const ancestorText = modelAncestorText(graph, node);
      return {
        nodeId: id,
        text: bufferPassageText(node),
        author: node.authorType === 'model' ? 'model' : 'human',
        ...(ancestorText === undefined ? {} : { ancestorText }),
      };
    });
    const revision = path.updatedAt.getTime();
    return {
      treeId,
      pathId: path.id,
      ownerAgentId: path.ownerAgentId,
      path: resolved,
      sequence: resolved.nodeIds,
      passages,
      revision,
      headOperationId: rows[0]?.id,
      choices: resolved.nodeIds.map((_, position) =>
        describeBufferChoices(graph, resolved, position, selections)
      ),
      issues: [...graph.issues, ...resolved.issues],
      graph,
      selections,
      storedDraft: await this.repos.bufferDraftStore.get(
        treeId,
        path.id,
        resolved.nodeIds,
        revision
      ),
    };
  }
}
