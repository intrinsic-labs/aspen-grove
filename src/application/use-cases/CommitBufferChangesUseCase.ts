import type {
  INodeRepository,
  IEdgeRepository,
  IPathRepository,
} from '@application/repositories';
import type { IBufferDraftStore } from '@application/repositories/core/IBufferDraftStore';
import type { IBufferMutationRepository } from '@application/repositories/core/IBufferMutationRepository';
import { indexBufferGraph } from '@application/services/buffer/buffer-graph';
import {
  planBufferCommand,
  type BufferDraft,
  type BufferEditPorts,
} from '@application/services/buffer/plan-buffer-edit';
import {
  resolveBufferPath,
  type BufferPathAction,
  type ResolvedBufferPath,
} from '@application/services/buffer/resolve-buffer-path';
import { computeHumanContentHash } from '@application/services/content-hash-service';
import type { ULID } from '@domain/value-objects';

export interface BufferCommandInput {
  treeId: ULID;
  pathId: ULID;
  draft: BufferDraft;
}

interface Dependencies {
  nodeRepo: INodeRepository;
  edgeRepo: IEdgeRepository;
  pathRepo: IPathRepository;
  bufferMutationRepo: IBufferMutationRepository;
  bufferDraftStore: IBufferDraftStore;
}

const ports: BufferEditPorts = {
  now: () => {
    throw new Error('Buffer draft requires a reserved timestamp');
  },
  nextId: () => {
    throw new Error('Insufficient reserved buffer IDs');
  },
  hashHuman: computeHumanContentHash,
};

/** The composition root shares this queue between commit and switch. */
export class BufferCommands {
  private readonly pending = new Map<ULID, Promise<unknown>>();
  constructor(private readonly repos: Dependencies) {}

  /** Runs the draft's own command: its switch if it carries one, else a commit. */
  execute(input: BufferCommandInput): Promise<ResolvedBufferPath> {
    const action: BufferPathAction = input.draft.action ?? { kind: 'open' };
    const previous = this.pending.get(input.treeId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => this.apply(input, action));
    this.pending.set(input.treeId, next);
    return next.finally(() => {
      if (this.pending.get(input.treeId) === next)
        this.pending.delete(input.treeId);
    });
  }

  private async apply(
    { treeId, pathId, draft }: BufferCommandInput,
    action: BufferPathAction
  ) {
    if (treeId !== draft.treeId || pathId !== draft.pathId)
      throw new Error('Buffer draft target mismatch');
    const {
      nodeRepo,
      edgeRepo,
      pathRepo,
      bufferMutationRepo,
      bufferDraftStore,
    } = this.repos;
    const [nodes, edges, path, rows, selections] = await Promise.all([
      nodeRepo.findByLoomTreeId(treeId, true),
      edgeRepo.findByLoomTreeId(treeId),
      pathRepo.findById(pathId),
      pathRepo.getNodeSequence(pathId),
      pathRepo.getSelections(pathId),
    ]);
    if (
      !path ||
      path.loomTreeId !== treeId ||
      path.ownerAgentId !== draft.ownerAgentId
    )
      throw new Error('Missing buffer path');
    const replay = rows[0]?.id === draft.operationId;
    if (!replay && path.updatedAt.getTime() !== draft.expectedRevision)
      throw new Error('Stale buffer revision');
    // Rebuild a lost acknowledgement's pre-edit graph using the reserved IDs.
    // The writer checks the planned result against the durable sequence again.
    const inserted = new Set(draft.nodeIds);
    const links = new Set(draft.edgeIds);
    const graph = replay
      ? indexBufferGraph(
          nodes.filter((node) => !inserted.has(node.id)),
          edges
            .filter((edge) => !links.has(edge.id))
            .map((edge) => ({
              ...edge,
              sources: edge.sources.filter(
                (source) => !inserted.has(source.nodeId)
              ),
            }))
        )
      : indexBufferGraph(nodes, edges);
    const sequence = replay
      ? draft.expectedSequence
      : rows.map((row) => row.nodeId);
    const opened = resolveBufferPath(graph, sequence, selections, {
      kind: 'open',
    });
    const { mutation, result } = await planBufferCommand(
      graph,
      opened,
      draft,
      ports,
      selections,
      action
    );
    // The writer's precondition is the durable rows, which can be shorter than
    // the path open resolved (a stored sequence that stops short of a leaf).
    const durable = replay
      ? mutation
      : { ...mutation, expectedSequence: rows.map((row) => row.nodeId) };
    if ((await bufferMutationRepo.apply(durable)) === 'stale')
      throw new Error('Stale buffer mutation');
    await bufferDraftStore.remove(treeId, pathId, draft);
    return result;
  }
}

/**
 * Commits a draft. A recovered draft that carries a switch replays that
 * switch, so retrying any stored draft repeats exactly what was asked.
 */
export class CommitBufferChangesUseCase {
  constructor(private readonly commands: BufferCommands) {}
  execute(input: BufferCommandInput): Promise<ResolvedBufferPath> {
    return this.commands.execute(input);
  }
}
