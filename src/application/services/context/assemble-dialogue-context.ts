import type { AgentType, Node } from '@domain/entities';
import type { DialogueMessage, DialogueRole } from './dialogue-message';
import {
  truncateDialogueMessages,
  type TruncationOptions,
} from './truncate-dialogue-messages';

export type AssembledDialogueContext = {
  readonly systemContext?: string;
  readonly messages: readonly DialogueMessage[];
  /** True when messages were dropped to fit the model context limit. */
  readonly truncated: boolean;
  readonly droppedMessageCount: number;
};

type AssembleDialogueContextInput = {
  readonly nodes: readonly Node[];
  readonly agentSystemPrompt?: string;
  readonly treeSystemContext?: string;
  readonly truncation?: TruncationOptions;
};

const toRole = (authorType: AgentType): DialogueRole => {
  return authorType === 'human' ? 'user' : 'assistant';
};

const toText = (node: Node): string => {
  if (node.content.type === 'text') {
    return node.content.text;
  }
  return `[${node.content.type} content]`;
};

/**
 * Dialogue-mode context assembly per
 * docs/architecture/specs/context-assembly.md:
 * exclusion filtering, system context combination (agent first, then tree),
 * consecutive same-author merging, and truncation.
 */
export const assembleDialogueContext = ({
  nodes,
  agentSystemPrompt,
  treeSystemContext,
  truncation,
}: AssembleDialogueContextInput): AssembledDialogueContext => {
  const visibleNodes = nodes.filter(
    (node) => !node.metadata.pruned && !node.metadata.excluded
  );

  const messages: DialogueMessage[] = [];

  for (const node of visibleNodes) {
    const role = toRole(node.authorType);
    const content = toText(node).trim();

    if (!content) {
      continue;
    }

    const previous = messages[messages.length - 1];
    if (previous && previous.role === role) {
      messages[messages.length - 1] = {
        role,
        content: `${previous.content}\n\n${content}`,
      };
      continue;
    }

    messages.push({ role, content });
  }

  const systemParts = [agentSystemPrompt, treeSystemContext]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  const systemContext =
    systemParts.length > 0 ? systemParts.join('\n\n') : undefined;

  const truncated = truncateDialogueMessages({
    messages,
    systemContext,
    options: truncation,
  });

  return {
    systemContext,
    messages: truncated.messages,
    truncated: truncated.truncated,
    droppedMessageCount: truncated.droppedMessageCount,
  };
};
