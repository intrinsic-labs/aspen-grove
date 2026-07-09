import { describe, expect, it } from '@jest/globals';
import type { IProviderRegistry } from '@application/services/llm';
import type { Agent, LoomTree, UserPreferences } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { GenerateTreeTitleUseCase } from './GenerateTreeTitleUseCase';

const now = new Date('2026-07-08T12:00:00.000Z');

const treeId = '01KTREE0000000000000000000' as ULID;
const modelAgentId = '01KMODEL000000000000000000' as ULID;

const modelAgent: Agent = {
  id: modelAgentId,
  name: 'Agent',
  type: 'model',
  modelRef: 'openrouter:some/model' as Agent['modelRef'],
  configuration: {},
  permissions: {
    loomAware: false,
    loomWrite: true,
    loomGenerate: false,
    docRead: false,
    docWrite: false,
  },
  createdAt: now,
  updatedAt: now,
};

const makeTree = (title: string): LoomTree => ({
  id: treeId,
  groveId: '01KGROVE000000000000000000' as ULID,
  title,
  rootNodeId: '01KROOT0000000000000000000' as ULID,
  mode: 'dialogue',
  createdAt: now,
  updatedAt: now,
});

const buildUseCase = (input: {
  autoTitleEnabled: boolean;
  treeTitle: string;
  completionContent: string;
  onUpdate?: (title: string) => void;
}) => {
  let requestedPrompt: string | null = null;
  const useCase = new GenerateTreeTitleUseCase({
    loomTreeRepository: {
      findById: async () => makeTree(input.treeTitle),
      update: async ({ changes }) => {
        input.onUpdate?.(changes.title ?? '');
        return makeTree(changes.title ?? input.treeTitle);
      },
    },
    agentRepository: {
      findById: async () => modelAgent,
    },
    userPreferencesRepository: {
      get: async () =>
        ({
          autoTitleEnabled: input.autoTitleEnabled,
        }) as unknown as UserPreferences,
    },
    providerRegistry: {
      getProviderForAgent: () => ({
        provider: 'openrouter',
        initialize: async () => true,
        getCapabilities: () => ({
          supportsStreaming: false,
          supportsSystemPrompt: true,
          supportedModels: ['some/model'],
        }),
        generateCompletion: async (request: {
          messages: readonly { content: unknown }[];
        }) => {
          requestedPrompt = String(request.messages[0]?.content ?? '');
          return {
            content: input.completionContent,
            finishReason: 'stop',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            rawResponse: {
              rawBytes: '{}',
              rawBytesHash: 'x',
              requestTimestamp: now,
              responseTimestamp: now,
              latencyMs: 5,
              modelIdentifier: 'some/model',
              responseBody: '{}',
              responseHeaders: '',
            },
          };
        },
        generateStreamingCompletion: async function* () {
          return;
        },
      }),
    } as unknown as IProviderRegistry,
  });
  return { useCase, getRequestedPrompt: () => requestedPrompt };
};

const execute = (
  useCase: GenerateTreeTitleUseCase
): ReturnType<GenerateTreeTitleUseCase['execute']> =>
  useCase.execute({
    treeId,
    modelAgentId,
    modelIdentifier: 'some/model',
    providerApiKey: 'key',
    userText: 'What are aspens?',
    assistantText: 'Aspens are clonal trees…',
  });

describe('GenerateTreeTitleUseCase', () => {
  it('titles default-titled trees, sanitizing the model output', async () => {
    let savedTitle: string | null = null;
    const { useCase, getRequestedPrompt } = buildUseCase({
      autoTitleEnabled: true,
      treeTitle: 'Loom Tree 2026-07-08T11:59:00.000Z',
      completionContent: '  "Aspen Clonal Colonies."  ',
      onUpdate: (title) => {
        savedTitle = title;
      },
    });

    const result = await execute(useCase);
    expect(result.title).toBe('Aspen Clonal Colonies');
    expect(savedTitle).toBe('Aspen Clonal Colonies');
    expect(getRequestedPrompt()).toContain('What are aspens?');
  });

  it('skips when the toggle is off', async () => {
    const { useCase } = buildUseCase({
      autoTitleEnabled: false,
      treeTitle: 'Loom Tree 2026-07-08T11:59:00.000Z',
      completionContent: 'Title',
    });
    const result = await execute(useCase);
    expect(result).toEqual({ title: null, skippedReason: 'disabled' });
  });

  it('skips trees the user already renamed', async () => {
    const { useCase } = buildUseCase({
      autoTitleEnabled: true,
      treeTitle: 'My Custom Title',
      completionContent: 'Title',
    });
    const result = await execute(useCase);
    expect(result).toEqual({ title: null, skippedReason: 'alreadyTitled' });
  });
});
