import type { AgentType, Node } from '@domain/entities';

export type DialogueRole = 'user' | 'assistant';

export type DialogueMessage = {
  readonly role: DialogueRole;
  readonly content: string;
};

export type AssembledDialogueContext = {
  readonly systemContext?: string;
  readonly messages: readonly DialogueMessage[];
};

type AssembleDialogueContextInput = {
  readonly nodes: readonly Node[];
  readonly agentSystemPrompt?: string;
  readonly treeSystemContext?: string;
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

export const assembleDialogueContext = ({
  nodes,
  agentSystemPrompt,
  treeSystemContext,
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

  return {
    systemContext: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
    messages,
  };
};
