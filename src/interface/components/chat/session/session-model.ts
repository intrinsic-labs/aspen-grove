import type { DialogueTurnSession } from '@application/use-cases';
import type { ChatSession, ChatSessionModel } from '../types';

/** Shown when something that generates runs on a tree with no agent. */
export const NEEDS_AGENT_MESSAGE =
  'This tree needs an agent to continue. Choose one in the dialogue settings.';

/** The use cases' session: the chat session with its model filled in. */
export const toTurnSession = (
  session: ChatSession,
  model: ChatSessionModel
): DialogueTurnSession => ({
  ownerAgentId: session.ownerAgentId,
  modelAgentId: model.modelAgentId,
  modelIdentifier: model.modelIdentifier,
  treeId: session.treeId,
  pathId: session.pathId,
  activeNodeId: session.activeNodeId,
});
