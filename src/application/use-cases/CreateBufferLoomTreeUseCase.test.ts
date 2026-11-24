import { describe, expect, it, jest } from '@jest/globals';
import type { Agent, Grove } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import {
  CreateBufferLoomTreeUseCase,
  DEFAULT_BUFFER_TITLE,
  type CreateBufferLoomTreeDependencies,
} from './CreateBufferLoomTreeUseCase';
import { CreateDialogueLoomTreeUseCase } from './CreateDialogueLoomTreeUseCase';

const ownerAgentId = '01KOWNER000000000000000000' as ULID;
const groveId = '01KGROVE000000000000000000' as ULID;
const modelAgentId = '01KMODEL000000000000000000' as ULID;
const now = new Date('2026-11-23T12:00:00.000Z');

const owner = { id: ownerAgentId, type: 'human' } as Agent;
const modelAgent = { id: modelAgentId, type: 'model' } as Agent;
const grove = { id: groveId, ownerAgentId } as Grove;

type Overrides = Partial<{
  [K in keyof CreateBufferLoomTreeDependencies]: Partial<
    CreateBufferLoomTreeDependencies[K]
  >;
}>;

/** Repositories that record what the use case wrote. */
const createHarness = (overrides: Overrides = {}) => {
  const calls = {
    nodeCreate: jest.fn(),
    treeCreate: jest.fn(),
    treeHardDelete: jest.fn(),
    nodeHardDelete: jest.fn(),
    appendNode: jest.fn(),
    pathStateCreate: jest.fn(),
  };
  const dependencies = {
    groveRepository: {
      findById: async (id: ULID) => (id === groveId ? grove : null),
      ...overrides.groveRepository,
    },
    agentRepository: {
      findById: async (id: ULID) =>
        id === ownerAgentId ? owner : id === modelAgentId ? modelAgent : null,
      ...overrides.agentRepository,
    },
    nodeRepository: {
      getAllLocalIds: async () => new Set<string>(),
      create: async (input: Record<string, unknown>) => {
        calls.nodeCreate(input);
        return { ...input, metadata: {} };
      },
      hardDelete: async (id: ULID) => {
        calls.nodeHardDelete(id);
        return true;
      },
      ...overrides.nodeRepository,
    },
    loomTreeRepository: {
      create: async (input: Record<string, unknown>) => {
        calls.treeCreate(input);
        return { ...input, createdAt: now, updatedAt: now };
      },
      hardDelete: async (id: ULID) => {
        calls.treeHardDelete(id);
        return true;
      },
      ...overrides.loomTreeRepository,
    },
    pathRepository: {
      create: async (input: Record<string, unknown>) => ({
        id: '01KPATH0000000000000000000',
        ...input,
      }),
      appendNode: async (pathId: ULID, nodeId: ULID) => {
        calls.appendNode(pathId, nodeId);
      },
      ...overrides.pathRepository,
    },
    pathStateRepository: {
      create: async (input: Record<string, unknown>) => {
        calls.pathStateCreate(input);
        return { id: '01KSTATE000000000000000000', ...input };
      },
      ...overrides.pathStateRepository,
    },
  };
  const useCase = new CreateBufferLoomTreeUseCase(
    dependencies as unknown as CreateBufferLoomTreeDependencies
  );
  const dialogueUseCase = new CreateDialogueLoomTreeUseCase(
    dependencies as unknown as CreateBufferLoomTreeDependencies
  );
  return { useCase, dialogueUseCase, calls };
};

describe('CreateBufferLoomTreeUseCase', () => {
  it('creates a buffer tree with an empty human root and no model agent', async () => {
    const { useCase, calls } = createHarness();

    const result = await useCase.execute({ groveId, ownerAgentId });

    expect(result.tree).toMatchObject({
      mode: 'buffer',
      title: DEFAULT_BUFFER_TITLE,
      rootNodeId: result.rootNode.id,
    });
    expect(calls.treeCreate.mock.calls[0]?.[0]).not.toHaveProperty(
      'defaultModelAgentId'
    );
    expect(calls.nodeCreate.mock.calls[0]?.[0]).toMatchObject({
      content: { type: 'text', text: '' },
      authorAgentId: ownerAgentId,
      authorType: 'human',
    });
    expect(calls.appendNode).toHaveBeenCalledWith(
      result.path.id,
      result.rootNode.id
    );
    expect(calls.pathStateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'buffer',
        agentId: ownerAgentId,
        activeNodeId: result.rootNode.id,
      })
    );
  });

  it('uses a given title, trimmed', async () => {
    const { useCase } = createHarness();
    const result = await useCase.execute({
      groveId,
      ownerAgentId,
      title: '  Field notes ',
    });
    expect(result.tree.title).toBe('Field notes');
  });

  it('rejects an owner who does not own the grove', async () => {
    const { useCase, calls } = createHarness();
    await expect(
      useCase.execute({
        groveId,
        ownerAgentId: '01KOTHER000000000000000000' as ULID,
      })
    ).rejects.toThrow('does not own');
    expect(calls.nodeCreate).not.toHaveBeenCalled();
  });

  it('rejects a model agent as owner', async () => {
    const { useCase } = createHarness({
      groveRepository: {
        findById: async () =>
          ({ id: groveId, ownerAgentId: modelAgentId }) as Grove,
      },
    });
    await expect(
      useCase.execute({ groveId, ownerAgentId: modelAgentId })
    ).rejects.toThrow('human agent');
  });

  it('hard-deletes the tree when a later step fails', async () => {
    const { useCase, calls } = createHarness({
      pathRepository: {
        appendNode: async () => {
          throw new Error('disk full');
        },
      },
    });

    await expect(useCase.execute({ groveId, ownerAgentId })).rejects.toThrow(
      'disk full'
    );
    expect(calls.treeHardDelete).toHaveBeenCalledTimes(1);
    expect(calls.nodeHardDelete).not.toHaveBeenCalled();
  });

  it('hard-deletes the root when the tree cannot be created', async () => {
    const { useCase, calls } = createHarness({
      loomTreeRepository: {
        create: async () => {
          throw new Error('constraint');
        },
      },
    });

    await expect(useCase.execute({ groveId, ownerAgentId })).rejects.toThrow(
      'constraint'
    );
    expect(calls.nodeHardDelete).toHaveBeenCalledTimes(1);
    expect(calls.treeHardDelete).not.toHaveBeenCalled();
  });

  it('leaves dialogue creation from the Home composer on its own path', async () => {
    const { dialogueUseCase, calls } = createHarness();

    const result = await dialogueUseCase.execute({
      groveId,
      ownerAgentId,
      defaultModelAgentId: modelAgentId,
      initialContent: { type: 'text', text: '' },
      pathName: 'Main',
    });

    expect(result.tree.mode).toBe('dialogue');
    expect(calls.treeCreate.mock.calls[0]?.[0]).toMatchObject({
      defaultModelAgentId: modelAgentId,
    });
    expect(calls.pathStateCreate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'dialogue' })
    );
  });
});
