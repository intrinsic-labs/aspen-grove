import type {
  IAgentRepository,
  IEdgeRepository,
  ILoomTreeRepository,
  INodeRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import {
  buildOpenLoomDocument,
  type ExportOpenLoomOptions,
} from '@application/services/open-loom';
import type { Agent, RawApiResponse } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

export type ExportLoomTreeInput = {
  readonly treeId: ULID;
  /** Active node at export time (becomes `currentNodeId`). */
  readonly currentNodeId?: ULID;
  readonly options?: ExportOpenLoomOptions;
};

export type ExportLoomTreeResult = {
  /** Pretty-printed Open Loom v2 JSON. */
  readonly json: string;
  readonly suggestedFileName: string;
  readonly nodeCount: number;
};

export type ExportLoomTreeDependencies = {
  readonly loomTreeRepository: Pick<ILoomTreeRepository, 'findById'>;
  readonly nodeRepository: Pick<INodeRepository, 'findByLoomTreeId'>;
  readonly edgeRepository: Pick<IEdgeRepository, 'findByLoomTreeId'>;
  readonly agentRepository: Pick<IAgentRepository, 'findById'>;
  readonly rawApiResponseRepository: Pick<
    IRawApiResponseRepository,
    'findByNodeId'
  >;
};

const toFileName = (title: string): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'loom-tree'}.openloom`;
};

/**
 * Exports a full tree — nodes, edges, agents, provenance — as an Open Loom
 * v2 document (docs/open-loom/spec.md). Open Loom is Aspen Grove's only
 * tree export format.
 */
export class ExportLoomTreeUseCase {
  private readonly deps: ExportLoomTreeDependencies;

  constructor(dependencies: ExportLoomTreeDependencies) {
    this.deps = dependencies;
  }

  async execute(input: ExportLoomTreeInput): Promise<ExportLoomTreeResult> {
    const tree = await this.deps.loomTreeRepository.findById(input.treeId);
    if (!tree) {
      throw new Error(`Tree not found: ${input.treeId}`);
    }

    const [nodes, edges] = await Promise.all([
      this.deps.nodeRepository.findByLoomTreeId(input.treeId, true),
      this.deps.edgeRepository.findByLoomTreeId(input.treeId),
    ]);

    const agentIds = new Set<ULID>(nodes.map((node) => node.authorAgentId));
    if (tree.defaultModelAgentId) {
      agentIds.add(tree.defaultModelAgentId);
    }
    const agentsById = new Map<string, Agent>();
    for (const agentId of agentIds) {
      const agent = await this.deps.agentRepository.findById(agentId);
      if (agent) {
        agentsById.set(agentId, agent);
      }
    }

    const rawResponsesByNodeId = new Map<string, RawApiResponse>();
    for (const node of nodes) {
      if (node.authorType !== 'model') {
        continue;
      }
      const raw = await this.deps.rawApiResponseRepository.findByNodeId(
        node.id
      );
      if (raw) {
        rawResponsesByNodeId.set(node.id, raw);
      }
    }

    const document = await buildOpenLoomDocument({
      tree,
      nodes,
      edges,
      agentsById,
      rawResponsesByNodeId,
      currentNodeId: input.currentNodeId,
      options: input.options,
    });

    return {
      json: JSON.stringify(document, null, 2),
      suggestedFileName: toFileName(tree.title),
      nodeCount: nodes.length,
    };
  }
}
