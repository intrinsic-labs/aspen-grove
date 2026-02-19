import type { IAgentRepository } from '@application/repositories';
import type { Agent, AgentConfiguration } from '@domain/entities';
import { parseModelRef } from '@domain/value-objects';

export const OPENROUTER_PROVIDER = 'openrouter' as const;
export const OPENROUTER_MODEL_REF_PREFIX = `${OPENROUTER_PROVIDER}:`;
export const DEFAULT_OPENROUTER_MODEL_IDENTIFIER = 'anthropic/claude-haiku-4.5';
export const DEFAULT_OPENROUTER_ASSISTANT_NAME = 'OpenRouter Assistant';
export const DEFAULT_OPENROUTER_SYSTEM_PROMPT =
  'You are a helpful dialogue partner in Aspen Grove.';

const isOpenRouterModelRef = (modelRef?: string): boolean =>
  Boolean(modelRef?.startsWith(OPENROUTER_MODEL_REF_PREFIX));

const selectOpenRouterAssistant = (models: readonly Agent[]): Agent | null => {
  const openRouterAgents = models.filter((agent) => isOpenRouterModelRef(agent.modelRef));
  if (openRouterAgents.length === 0) {
    return null;
  }

  const named = openRouterAgents.find(
    (agent) => agent.name === DEFAULT_OPENROUTER_ASSISTANT_NAME
  );
  return named ?? openRouterAgents[0];
};

export const getOpenRouterModelIdentifier = (
  agent: Pick<Agent, 'modelRef'> | null | undefined
): string | null => {
  const modelRef = agent?.modelRef;
  if (!modelRef || !modelRef.startsWith(OPENROUTER_MODEL_REF_PREFIX)) {
    return null;
  }

  return modelRef.slice(OPENROUTER_MODEL_REF_PREFIX.length);
};

export const findOpenRouterAssistantAgent = async (
  agentRepository: IAgentRepository
): Promise<Agent | null> => {
  const modelAgents = await agentRepository.findModels(true);
  return selectOpenRouterAssistant(modelAgents);
};

const normalizeModelIdentifier = (value: string | undefined): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_OPENROUTER_MODEL_IDENTIFIER;
  }
  return trimmed;
};

const nextConfiguration = (
  existing: AgentConfiguration | undefined,
  input: {
    readonly temperature: number;
    readonly maxTokens?: number;
    readonly systemPrompt?: string;
  }
): AgentConfiguration => {
  const systemPrompt =
    input.systemPrompt ??
    existing?.systemPrompt ??
    DEFAULT_OPENROUTER_SYSTEM_PROMPT;

  return {
    ...existing,
    systemPrompt,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  };
};

export const ensureOpenRouterAssistantAgent = async (
  agentRepository: IAgentRepository,
  input: {
    readonly preferredModelIdentifier?: string;
    readonly defaultTemperature?: number;
  } = {}
): Promise<Agent> => {
  const existing = await findOpenRouterAssistantAgent(agentRepository);
  if (existing) {
    return existing;
  }

  const modelIdentifier = normalizeModelIdentifier(input.preferredModelIdentifier);

  return agentRepository.create({
    name: DEFAULT_OPENROUTER_ASSISTANT_NAME,
    type: 'model',
    modelRef: parseModelRef(`${OPENROUTER_MODEL_REF_PREFIX}${modelIdentifier}`),
    configuration: {
      systemPrompt: DEFAULT_OPENROUTER_SYSTEM_PROMPT,
      temperature: input.defaultTemperature ?? 1.0,
    },
    permissions: {
      loomAware: false,
      loomWrite: true,
      loomGenerate: false,
      docRead: true,
      docWrite: false,
    },
  });
};

export const upsertOpenRouterAssistantAgent = async (
  agentRepository: IAgentRepository,
  input: {
    readonly modelIdentifier: string;
    readonly temperature: number;
    readonly maxTokens?: number;
    readonly systemPrompt?: string;
  }
): Promise<Agent> => {
  const modelIdentifier = normalizeModelIdentifier(input.modelIdentifier);
  const modelRef = parseModelRef(
    `${OPENROUTER_MODEL_REF_PREFIX}${modelIdentifier}`
  );
  const existing = await findOpenRouterAssistantAgent(agentRepository);

  if (!existing) {
    return agentRepository.create({
      name: DEFAULT_OPENROUTER_ASSISTANT_NAME,
      type: 'model',
      modelRef,
      configuration: nextConfiguration(undefined, input),
      permissions: {
        loomAware: false,
        loomWrite: true,
        loomGenerate: false,
        docRead: true,
        docWrite: false,
      },
    });
  }

  return agentRepository.update({
    id: existing.id,
    changes: {
      modelRef,
      configuration: nextConfiguration(existing.configuration, input),
    },
  });
};
