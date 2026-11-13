import type { Node, NodeAuthorType } from '@domain/entities';
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

const ROLE_BY_AUTHOR_TYPE: Record<NodeAuthorType, DialogueRole> = {
  human: 'user',
  model: 'assistant',
  system: 'system',
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
 *
 * System nodes stay where they are on the path and go out as `system`
 * messages, as Latent Spaces sends them (OpenRouterRequest.swift:100-117).
 * The agent prompt and tree context still go out once, as the request's
 * system prompt; a system node whose text repeats one of them (an import
 * that carried the prompt both ways) is dropped so it isn't sent twice.
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

  const systemParts = [agentSystemPrompt, treeSystemContext]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  const systemContext =
    systemParts.length > 0 ? systemParts.join('\n\n') : undefined;

  const messages: DialogueMessage[] = [];

  for (const node of visibleNodes) {
    const role = ROLE_BY_AUTHOR_TYPE[node.authorType];
    const content = toText(node).trim();

    if (!content) {
      continue;
    }
    if (role === 'system' && systemParts.includes(content)) {
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
