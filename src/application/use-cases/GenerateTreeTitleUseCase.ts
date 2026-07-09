import type {
  IAgentRepository,
  ILoomTreeRepository,
  IUserPreferencesRepository,
} from '@application/repositories';
import {
  collectCompletion,
  type IProviderRegistry,
} from '@application/services/llm';
import type { ULID } from '@domain/value-objects';

export type GenerateTreeTitleInput = {
  readonly treeId: ULID;
  readonly modelAgentId: ULID;
  readonly modelIdentifier: string;
  readonly providerApiKey: string;
  readonly providerAppName?: string;
  /** The first exchange, used as titling context. */
  readonly userText: string;
  readonly assistantText: string;
};

export type GenerateTreeTitleResult = {
  /** Null when skipped (toggle off, or the tree was already titled). */
  readonly title: string | null;
  readonly skippedReason?: 'disabled' | 'alreadyTitled';
};

export type GenerateTreeTitleDependencies = {
  readonly loomTreeRepository: Pick<ILoomTreeRepository, 'findById' | 'update'>;
  readonly agentRepository: Pick<IAgentRepository, 'findById'>;
  readonly userPreferencesRepository: Pick<IUserPreferencesRepository, 'get'>;
  readonly providerRegistry: IProviderRegistry;
};

/** Titles the repository assigns by default: `Loom Tree <ISO timestamp>`. */
const DEFAULT_TITLE_PATTERN = /^Loom Tree \d{4}-\d{2}-\d{2}T/;

const TITLE_MAX_LENGTH = 60;
const CONTEXT_SNIPPET_LENGTH = 1500;

const sanitizeTitle = (raw: string): string | null => {
  const cleaned = raw
    .replace(/^["'\s#*`]+|["'\s#*`.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length === 0) {
    return null;
  }
  return cleaned.slice(0, TITLE_MAX_LENGTH);
};

/**
 * One extra model call after the first model response in a tree: asks the
 * tree's own agent model for a short conversation title and replaces the
 * default timestamp title. Gated by `UserPreferences.autoTitleEnabled` and
 * skipped when the user has already renamed the tree.
 */
export class GenerateTreeTitleUseCase {
  private readonly deps: GenerateTreeTitleDependencies;

  constructor(dependencies: GenerateTreeTitleDependencies) {
    this.deps = dependencies;
  }

  async execute(
    input: GenerateTreeTitleInput
  ): Promise<GenerateTreeTitleResult> {
    const preferences = await this.deps.userPreferencesRepository.get();
    if (!preferences.autoTitleEnabled) {
      return { title: null, skippedReason: 'disabled' };
    }

    const tree = await this.deps.loomTreeRepository.findById(input.treeId);
    if (!tree) {
      throw new Error(`Tree not found: ${input.treeId}`);
    }
    if (!DEFAULT_TITLE_PATTERN.test(tree.title)) {
      return { title: null, skippedReason: 'alreadyTitled' };
    }

    const modelAgent = await this.deps.agentRepository.findById(
      input.modelAgentId
    );
    if (!modelAgent) {
      throw new Error(`Model agent not found: ${input.modelAgentId}`);
    }

    const llmProvider =
      this.deps.providerRegistry.getProviderForAgent(modelAgent);
    const initialized = await llmProvider.initialize(
      { apiKey: input.providerApiKey },
      { appName: input.providerAppName }
    );
    if (!initialized) {
      throw new Error('Failed to initialize LLM provider for titling.');
    }

    const completion = await collectCompletion({
      llmProvider,
      stream: false,
      request: {
        model: input.modelIdentifier,
        systemPrompt:
          'You title conversations. Reply with only a title: at most six words, no quotes, no trailing punctuation.',
        messages: [
          {
            role: 'user',
            content: [
              'Title this conversation.',
              '',
              `User: ${input.userText.slice(0, CONTEXT_SNIPPET_LENGTH)}`,
              '',
              `Assistant: ${input.assistantText.slice(0, CONTEXT_SNIPPET_LENGTH)}`,
            ].join('\n'),
          },
        ],
        temperature: 0.3,
        maxTokens: 32,
      },
    });

    const title = sanitizeTitle(completion.content);
    if (!title) {
      return { title: null };
    }

    await this.deps.loomTreeRepository.update({
      id: input.treeId,
      changes: { title },
    });

    return { title };
  }
}
