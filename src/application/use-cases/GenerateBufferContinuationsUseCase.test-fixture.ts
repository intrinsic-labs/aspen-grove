import { computeSha256Hash } from '@application/services/content-hash-service';
import type {
  ILlmProvider,
  ProviderRequest,
  StreamChunk,
} from '@application/services/llm';
import { LlmProviderError } from '@application/services/llm';
import { reserveBufferDraft } from '@application/services/buffer/reserve-buffer-draft';
import type { BufferDraft } from '@application/services/buffer/buffer-draft';
import { createULID } from '@domain/value-objects';
// Integration fixture: exercise the use case through the production repositories.
// eslint-disable-next-line boundaries/element-types
import { WatermelonAgentRepository } from '@infrastructure/persistence/watermelon/repositories/WatermelonAgentRepository';
// eslint-disable-next-line boundaries/element-types
import { bufferOpenFixture } from '@infrastructure/persistence/watermelon/repositories/buffer-open-fixture';
import { GenerateBufferContinuationsUseCase } from './GenerateBufferContinuationsUseCase';

export type StreamScript = {
  readonly text?: string;
  readonly fail?: 'before' | 'after';
  readonly interruption?: 'timeout' | 'network' | 'provider_error';
  readonly wait?: Promise<void>;
};

export class ScriptedTextProvider implements ILlmProvider {
  readonly provider = 'lmstudio' as const;
  readonly requests: ProviderRequest[] = [];
  readonly evidenceIds: string[] = [];
  started = 0;
  open = 0;
  maxOpen = 0;
  private releaseAll!: () => void;
  private readonly allStarted: Promise<void>;

  constructor(private readonly scripts: readonly StreamScript[]) {
    this.allStarted = new Promise((resolve) => {
      this.releaseAll = resolve;
    });
  }

  async initialize() {
    return true;
  }

  getCapabilities() {
    return {
      supportsStreaming: true,
      supportsSystemPrompt: false,
      supportedModels: ['mock-base'],
    };
  }

  async generateCompletion(): Promise<never> {
    throw new Error('Unexpected non-streaming request');
  }

  async *generateStreamingCompletion(
    request: ProviderRequest
  ): AsyncIterable<StreamChunk> {
    const index = this.requests.length;
    const script = this.scripts[index];
    this.requests.push(request);
    this.evidenceIds.push(`request-${index}`);
    this.started += 1;
    this.open += 1;
    this.maxOpen = Math.max(this.maxOpen, this.open);
    if (this.started === this.scripts.length) this.releaseAll();
    await this.allStarted;
    try {
      if (script.fail === 'before') throw terminalFailure();
      if (script.text) yield { type: 'text', content: script.text };
      await script.wait;
      if (script.fail === 'after') throw retryableFailure();
      const headers = `{"slot":${index}}`;
      const body = `{"text":${JSON.stringify(script.text ?? '')}}`;
      const rawBytes = `${headers}\n\n${body}`;
      yield {
        type: 'done',
        content: script.text ?? '',
        finishReason: script.interruption ? 'error' : 'stop',
        interruptedReason: script.interruption,
        rawResponse: {
          rawBytes,
          rawBytesHash: await computeSha256Hash(rawBytes),
          requestTimestamp: new Date(1000 + index),
          responseTimestamp: new Date(2000 + index),
          latencyMs: 100,
          requestId: `request-${index}`,
          modelIdentifier: 'mock-base',
          responseHeaders: headers,
          responseBody: body,
        },
      };
    } finally {
      this.open -= 1;
    }
  }
}

const retryableFailure = () =>
  new LlmProviderError({
    code: 'timeout',
    message: 'scripted timeout',
    provider: 'lmstudio',
    retryable: true,
  });

const terminalFailure = () =>
  new LlmProviderError({
    code: 'contentFiltered',
    message: 'scripted pre-token failure',
    provider: 'lmstudio',
    retryable: false,
  });

export const bufferGenerationFixture = async (
  scripts: readonly StreamScript[]
) => {
  const f = await bufferOpenFixture();
  const agentRepo = new WatermelonAgentRepository(f.db);
  const modelAgent = await agentRepo.create({
    name: 'Mock base',
    type: 'model',
    modelRef: 'lmstudio:mock-base' as never,
    configuration: { customParameters: { maxContextTokens: 8192 } },
  });
  await f.treeRepo.update({
    id: f.treeId,
    changes: { defaultModelAgentId: modelAgent.id },
  });
  const provider = new ScriptedTextProvider(scripts);
  const generate = new GenerateBufferContinuationsUseCase({
    commitBufferChangesUseCase: f.commit,
    bufferMutationRepository: f.bufferMutationRepo,
    treeRepository: f.treeRepo,
    agentRepository: agentRepo,
    nodeRepository: f.nodeRepo,
    edgeRepository: f.edgeRepo,
    pathRepository: f.pathRepo,
    rawApiResponseRepository: f.rawApiResponseRepo,
    providerRegistry: {
      getProviderForAgent: () => provider,
    } as never,
    modelOutputLimits: { maxOutputTokens: async () => 1024 },
    findBaseModel: async () => ({
      id: 'mock-base',
      publisher: 'mock',
      connectionEndpoint: 'http://localhost:1235',
    }),
    resolveProviderConnection: async () => ({
      apiKey: '',
      endpoint: 'http://localhost:1235',
    }),
    retry: { maxRetries: 2, sleep: async () => undefined },
  });

  const draft = async (tail: string): Promise<BufferDraft> => {
    const opened = await f.open.execute({ treeId: f.treeId });
    return reserveBufferDraft(
      opened.graph,
      opened.path,
      {
        treeId: f.treeId,
        pathId: f.pathId,
        ownerAgentId: f.ownerAgentId,
        expectedSequence: opened.sequence,
        expectedRevision: opened.revision,
        edits: [],
        workingTail: tail,
      },
      {
        newId: createULID,
        now: Date.now,
        selections: opened.selections,
      }
    );
  };

  return { ...f, agentRepo, modelAgent, provider, generate, draft };
};
