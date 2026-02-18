import type {
  Agent,
  Content,
  Grove,
  LoomTree,
  Node,
} from '@domain/entities';
import {
  createLocalId,
  createULID,
  type ULID,
} from '@domain/value-objects';
import type {
  IAgentRepository,
  IGroveRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
  Path,
  PathState,
} from '@application/repositories';
import { computeHumanContentHash } from '@application/services/content-hash-service';

const TITLE_MAX_LENGTH = 50;

export type CreateDialogueLoomTreeInput = {
  readonly groveId: ULID;
  readonly ownerAgentId: ULID;
  readonly title?: string;
  readonly description?: string;
  readonly systemContext?: string;
  readonly initialContent?: Content;
  readonly pathName?: string;
};

export type CreateDialogueLoomTreeResult = {
  readonly tree: LoomTree;
  readonly rootNode: Node;
  readonly path: Path;
  readonly pathState: PathState;
};

export type CreateDialogueLoomTreeDependencies = {
  readonly groveRepository: IGroveRepository;
  readonly agentRepository: IAgentRepository;
  readonly nodeRepository: INodeRepository;
  readonly loomTreeRepository: ILoomTreeRepository;
  readonly pathRepository: IPathRepository;
  readonly pathStateRepository: IPathStateRepository;
};

/**
 * Creates a new dialogue-mode Loom Tree and initializes persisted path cursor state.
 *
 * Flow:
 * 1) Validate Grove + owner agent
 * 2) Create root human node (provenance-correct hash)
 * 3) Create LoomTree(mode=dialogue)
 * 4) Create Path + PathState at root
 */
export class CreateDialogueLoomTreeUseCase {
  private readonly groveRepository: IGroveRepository;
  private readonly agentRepository: IAgentRepository;
  private readonly nodeRepository: INodeRepository;
  private readonly loomTreeRepository: ILoomTreeRepository;
  private readonly pathRepository: IPathRepository;
  private readonly pathStateRepository: IPathStateRepository;

  constructor(dependencies: CreateDialogueLoomTreeDependencies) {
    this.groveRepository = dependencies.groveRepository;
    this.agentRepository = dependencies.agentRepository;
    this.nodeRepository = dependencies.nodeRepository;
    this.loomTreeRepository = dependencies.loomTreeRepository;
    this.pathRepository = dependencies.pathRepository;
    this.pathStateRepository = dependencies.pathStateRepository;
  }

  async execute(
    input: CreateDialogueLoomTreeInput
  ): Promise<CreateDialogueLoomTreeResult> {
    const grove = await this.requireGrove(input.groveId);
    this.ensureGroveOwnership(grove, input.ownerAgentId);

    const ownerAgent = await this.requireAgent(input.ownerAgentId);
    this.ensureHumanOwner(ownerAgent);

    const treeId = createULID();
    const rootNodeId = createULID();
    const rootNodeCreatedAt = new Date();
    const content =
      input.initialContent ?? {
        type: 'text',
        text: '',
      };

    const existingLocalIds = await this.nodeRepository.getAllLocalIds(
      treeId
    );
    const localId = createLocalId(rootNodeId, existingLocalIds);
    const contentHash = await computeHumanContentHash(
      content,
      [],
      rootNodeCreatedAt,
      ownerAgent.id
    );

    let rootNode: Node | null = null;
    let tree: LoomTree | null = null;

    try {
      rootNode = await this.nodeRepository.create({
        id: rootNodeId,
        createdAt: rootNodeCreatedAt,
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
        mode: 'dialogue',
        title: input.title ?? this.deriveTitle(content),
        description: input.description,
        systemContext: input.systemContext,
      });

      const path = await this.pathRepository.create({
        loomTreeId: tree.id,
        ownerAgentId: ownerAgent.id,
        name: input.pathName,
      });

      await this.pathRepository.appendNode(path.id, rootNode.id);

      const pathState = await this.pathStateRepository.create({
        pathId: path.id,
        agentId: ownerAgent.id,
        mode: 'dialogue',
        activeNodeId: rootNode.id,
      });

      return {
        tree,
        rootNode,
        path,
        pathState,
      };
    } catch (error) {
      // Best-effort rollback to avoid partial tree creation artifacts.
      if (tree) {
        try {
          await this.loomTreeRepository.hardDelete(tree.id);
        } catch {
          // no-op
        }
      } else if (rootNode) {
        try {
          await this.nodeRepository.hardDelete(rootNode.id);
        } catch {
          // no-op
        }
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

  private async requireAgent(agentId: ULID): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  private ensureGroveOwnership(grove: Grove, ownerAgentId: ULID): void {
    if (grove.ownerAgentId !== ownerAgentId) {
      throw new Error('Owner agent does not own the target grove');
    }
  }

  private ensureHumanOwner(ownerAgent: Agent): void {
    if (ownerAgent.type !== 'human') {
      throw new Error('Dialogue tree owner must be a human agent');
    }
  }

  private deriveTitle(content: Content): string {
    const fallback = `Loom Tree ${new Date().toISOString()}`;
    if (content.type !== 'text') {
      return fallback;
    }

    const normalized = content.text.replace(/\s+/g, ' ').trim();
    if (normalized.length === 0) {
      return fallback;
    }

    return normalized.slice(0, TITLE_MAX_LENGTH);
  }
}
