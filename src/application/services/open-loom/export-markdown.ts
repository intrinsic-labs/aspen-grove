import type { Content, LoomTree, Node } from '@domain/entities';

export type ExportPathMarkdownInput = {
  readonly tree: LoomTree;
  /** Nodes of the active path, root first. */
  readonly pathNodes: readonly Node[];
  /** Display names for author agents, keyed by agent id. */
  readonly agentNamesById: ReadonlyMap<string, string>;
  readonly exportedAt?: Date;
};

const contentToText = (content: Content): string => {
  switch (content.type) {
    case 'text':
      return content.text;
    case 'image':
      return content.altText
        ? `![${content.altText}](${content.ref})`
        : `![image](${content.ref})`;
    case 'audio':
      return `[audio: ${content.ref}]`;
    case 'mixed':
      return content.blocks.map(contentToText).join('\n\n');
  }
};

/**
 * Renders the active path as a human-readable Markdown transcript.
 *
 * Dialogue trees render as speaker-labelled turns; buffer trees as
 * continuous text. Empty root scaffolding nodes are skipped.
 */
export const renderPathMarkdown = (input: ExportPathMarkdownInput): string => {
  const lines: string[] = [];
  lines.push(`# ${input.tree.title}`);
  lines.push('');
  const exportedAt = (input.exportedAt ?? new Date()).toISOString();
  lines.push(
    `> Exported from Aspen Grove on ${exportedAt} · OpenLoom path export`
  );
  if (input.tree.description) {
    lines.push(`> ${input.tree.description}`);
  }
  lines.push('');

  const meaningfulNodes = input.pathNodes.filter((node) => {
    const text = contentToText(node.content).trim();
    return text.length > 0;
  });

  if (input.tree.mode === 'buffer') {
    lines.push(meaningfulNodes.map((n) => contentToText(n.content)).join(''));
    lines.push('');
    return lines.join('\n');
  }

  for (const node of meaningfulNodes) {
    const agentName = input.agentNamesById.get(node.authorAgentId);
    const speaker =
      node.authorType === 'human'
        ? (agentName ?? 'Human')
        : (agentName ?? 'Model');
    lines.push(`**${speaker}:**`);
    lines.push('');
    lines.push(contentToText(node.content).trim());
    lines.push('');
  }

  return lines.join('\n');
};
