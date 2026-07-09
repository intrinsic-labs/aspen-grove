import type {
  IAgentRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
} from '@application/repositories';
import { renderPathMarkdown } from '@application/services/open-loom';
import type { Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

export type ExportPathMarkdownInput = {
  readonly treeId: ULID;
  readonly pathId: ULID;
};

export type ExportPathMarkdownResult = {
  readonly markdown: string;
  readonly suggestedFileName: string;
};

export type ExportPathMarkdownDependencies = {
  readonly loomTreeRepository: Pick<ILoomTreeRepository, 'findById'>;
  readonly nodeRepository: Pick<INodeRepository, 'findById'>;
  readonly pathRepository: Pick<IPathRepository, 'getNodeSequence'>;
  readonly agentRepository: Pick<IAgentRepository, 'findById'>;
};

const toFileName = (title: string): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'loom-path'}.md`;
};

/** Exports the active path as a human-readable Markdown transcript. */
export class ExportPathMarkdownUseCase {
  private readonly deps: ExportPathMarkdownDependencies;

  constructor(dependencies: ExportPathMarkdownDependencies) {
    this.deps = dependencies;
  }

  async execute(
    input: ExportPathMarkdownInput
  ): Promise<ExportPathMarkdownResult> {
    const tree = await this.deps.loomTreeRepository.findById(input.treeId);
    if (!tree) {
      throw new Error(`Tree not found: ${input.treeId}`);
    }

    const sequence = await this.deps.pathRepository.getNodeSequence(
      input.pathId
    );
    const resolved = await Promise.all(
      sequence.map((entry) =>
        this.deps.nodeRepository.findById(entry.nodeId, true)
      )
    );
    const pathNodes = resolved.filter((node): node is Node => Boolean(node));

    const agentNamesById = new Map<string, string>();
    for (const node of pathNodes) {
      if (agentNamesById.has(node.authorAgentId)) {
        continue;
      }
      const agent = await this.deps.agentRepository.findById(
        node.authorAgentId
      );
      if (agent) {
        agentNamesById.set(node.authorAgentId, agent.name);
      }
    }

    const markdown = renderPathMarkdown({ tree, pathNodes, agentNamesById });

    return { markdown, suggestedFileName: toFileName(tree.title) };
  }
}
