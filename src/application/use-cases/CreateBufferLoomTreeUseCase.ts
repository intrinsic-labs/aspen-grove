import type { Agent, Grove, LoomTree, Node } from '@domain/entities';
import { createLocalId, createULID, type ULID } from '@domain/value-objects';
import type {
  IAgentRepository,
  IGroveRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
} from '@application/repositories';
import { computeHumanContentHash } from '@application/services/content-hash-service';
import type {
  CreateDialogueLoomTreeDependencies,
  CreateDialogueLoomTreeResult,
} from './CreateDialogueLoomTreeUseCase';

export const DEFAULT_BUFFER_TITLE = 'Untitled Buffer';

export type CreateBufferLoomTreeInput = {
  readonly groveId: ULID;
  readonly ownerAgentId: ULID;
  readonly title?: string;
};

export type CreateBufferLoomTreeResult = CreateDialogueLoomTreeResult;

export type CreateBufferLoomTreeDependencies =
  CreateDialogueLoomTreeDependencies;

/**
 * Creates a new buffer-mode Loom Tree: an invisible, empty human root, the
 * tree itself, one path through the root and a buffer-mode cursor on it.
 * Unlike a dialogue tree it names no model agent; a base model is chosen
 * later, from the buffer itself.
 *
 * Flow mirrors `CreateDialogueLoomTreeUseCase`: validate the Grove and owner,
 * create the root, the tree, the path and its cursor, and roll back what was
 * written if any step fails.
 */
export class CreateBufferLoomTreeUseCase {
  private readonly groveRepository: IGroveRepository;
  private readonly agentRepository: IAgentRepository;
  private readonly nodeRepository: INodeRepository;
  private readonly loomTreeRepository: ILoomTreeRepository;
  private readonly pathRepository: IPathRepository;
  private readonly pathStateRepository: IPathStateRepository;

  constructor(dependencies: CreateBufferLoomTreeDependencies) {
    this.groveRepository = dependencies.groveRepository;
    this.agentRepository = dependencies.agentRepository;
    this.nodeRepository = dependencies.nodeRepository;
    this.loomTreeRepository = dependencies.loomTreeRepository;
    this.pathRepository = dependencies.pathRepository;
    this.pathStateRepository = dependencies.pathStateRepository;
  }

  async execute(
    input: CreateBufferLoomTreeInput
  ): Promise<CreateBufferLoomTreeResult> {
    const grove = await this.requireGrove(input.groveId);
    if (grove.ownerAgentId !== input.ownerAgentId) {
      throw new Error('Owner agent does not own the target grove');
    }

    const ownerAgent = await this.requireOwner(input.ownerAgentId);

    const treeId = createULID();
    const rootNodeId = createULID();
    const rootCreatedAt = new Date();
    const content = { type: 'text', text: '' } as const;

    const existingLocalIds = await this.nodeRepository.getAllLocalIds(treeId);
    const localId = createLocalId(rootNodeId, existingLocalIds);
    const contentHash = await computeHumanContentHash(
      content,
      [],
      rootCreatedAt,
      ownerAgent.id
    );

    let rootNode: Node | null = null;
    let tree: LoomTree | null = null;

    try {
      rootNode = await this.nodeRepository.create({
        id: rootNodeId,
        createdAt: rootCreatedAt,
        loomTreeId: treeId,
        localId,
        content,
        authorAgentId: ownerAgent.id,
        authorType: 'human',
        contentHash,
      });

      tree = await this.loomTreeRepository.create({
        id: treeId,
        groveId: input.groveId,
        rootNodeId: rootNode.id,
        mode: 'buffer',
        title: input.title?.trim() || DEFAULT_BUFFER_TITLE,
      });

      const path = await this.pathRepository.create({
        loomTreeId: tree.id,
        ownerAgentId: ownerAgent.id,
        name: 'Main',
      });
      await this.pathRepository.appendNode(path.id, rootNode.id);

      const pathState = await this.pathStateRepository.create({
        pathId: path.id,
        agentId: ownerAgent.id,
        mode: 'buffer',
        activeNodeId: rootNode.id,
      });

      return { tree, rootNode, path, pathState };
    } catch (error) {
      // Best-effort rollback to avoid partial tree creation artifacts.
      if (tree) {
        await this.loomTreeRepository.hardDelete(tree.id).catch(() => false);
      } else if (rootNode) {
        await this.nodeRepository.hardDelete(rootNode.id).catch(() => false);
      }
      throw error;
    }
  }

  private async requireGrove(groveId: ULID): Promise<Grove> {
    const grove = await this.groveRepository.findById(groveId);
    if (!grove) {
      throw new Error(`Grove not found: ${groveId}`);
    }
    return grove;
  }

  private async requireOwner(agentId: ULID): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    if (agent.type !== 'human') {
      throw new Error('Buffer tree owner must be a human agent');
    }
    return agent;
  }
}
