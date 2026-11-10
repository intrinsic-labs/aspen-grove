import type { ULID } from '@domain/value-objects';
import type { ChatSession, ChatSessionModel } from '../types';
import { toTurnSession } from './session-model';

const session: ChatSession = {
  ownerAgentId: '01KOWNER000000000000000000' as ULID,
  treeId: '01KTREE0000000000000000000' as ULID,
  pathId: '01KPATH0000000000000000000' as ULID,
  activeNodeId: '01KNODE0000000000000000000' as ULID,
  model: null,
};

const model: ChatSessionModel = {
  modelAgentId: '01KAGENT000000000000000000' as ULID,
  modelIdentifier: 'anthropic/claude-haiku',
  provider: 'openrouter',
};

describe('toTurnSession', () => {
  it("fills the use cases' session from the path and the model", () => {
    expect(toTurnSession(session, model)).toEqual({
      ownerAgentId: session.ownerAgentId,
      modelAgentId: model.modelAgentId,
      modelIdentifier: model.modelIdentifier,
      treeId: session.treeId,
      pathId: session.pathId,
      activeNodeId: session.activeNodeId,
    });
  });
});
