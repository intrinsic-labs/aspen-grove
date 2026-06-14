import type { IAgentRepository } from '@application/repositories';
import type { Agent, AgentConfiguration } from '@domain/entities';
import { parseModelRef } from '@domain/value-objects';

export const LMSTUDIO_PROVIDER = 'lmstudio' as const;
export const LMSTUDIO_MODEL_REF_PREFIX = `${LMSTUDIO_PROVIDER}:`;
export const DEFAULT_LMSTUDIO_ASSISTANT_NAME = 'LM Studio Assistant';
export const DEFAULT_LMSTUDIO_SYSTEM_PROMPT =
  'You are a helpful dialogue partner in Aspen Grove.';

const isLMStudioModelRef = (modelRef?: string): boolean =>
  Boolean(modelRef?.startsWith(LMSTUDIO_MODEL_REF_PREFIX));

const selectLMStudioAssistant = (models: readonly Agent[]): Agent | null => {
  const lmstudioAgents = models.filter((agent) =>
    isLMStudioModelRef(agent.modelRef)
  );
  if (lmstudioAgents.length === 0) {
    return null;
  }

  const named = lmstudioAgents.find(
    (agent) => agent.name === DEFAULT_LMSTUDIO_ASSISTANT_NAME
  );
  return named ?? lmstudioAgents[0];
};

export const getLMStudioModelIdentifier = (
  agent: Pick<Agent, 'modelRef'> | null | undefined
): string | null => {
  const modelRef = agent?.modelRef;
  if (!modelRef || !modelRef.startsWith(LMSTUDIO_MODEL_REF_PREFIX)) {
    return null;
  }

  return modelRef.slice(LMSTUDIO_MODEL_REF_PREFIX.length);
};

export const findLMStudioAssistantAgent = async (
  agentRepository: IAgentRepository
): Promise<Agent | null> => {
  const modelAgents = await agentRepository.findModels(true);
  return selectLMStudioAssistant(modelAgents);
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
    input.systemPrompt ?? existing?.systemPrompt ?? DEFAULT_LMSTUDIO_SYSTEM_PROMPT;

  return {
    ...existing,
    systemPrompt,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  };
};

export const ensureLMStudioAssistantAgent = async (
  agentRepository: IAgentRepository,
  input: {
    readonly preferredModelIdentifier?: string;
    readonly defaultTemperature?: number;
  } = {}
): Promise<Agent | null> => {
  const existing = await findLMStudioAssistantAgent(agentRepository);
  if (existing) {
    return existing;
  }

  // Unlike OpenRouter, we can't create an LM Studio agent without a selected model
  const modelIdentifier = input.preferredModelIdentifier?.trim();
  if (!modelIdentifier) {
    return null;
  }

  return agentRepository.create({
    name: DEFAULT_LMSTUDIO_ASSISTANT_NAME,
    type: 'model',
    modelRef: parseModelRef(`${LMSTUDIO_MODEL_REF_PREFIX}${modelIdentifier}`),
    configuration: {
      systemPrompt: DEFAULT_LMSTUDIO_SYSTEM_PROMPT,
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

export const upsertLMStudioAssistantAgent = async (
  agentRepository: IAgentRepository,
  input: {
    readonly modelIdentifier: string;
    readonly temperature: number;
    readonly maxTokens?: number;
    readonly systemPrompt?: string;
  }
): Promise<Agent | null> => {
  const modelIdentifier = input.modelIdentifier?.trim();
  if (!modelIdentifier) {
    return null;
  }

  const modelRef = parseModelRef(`${LMSTUDIO_MODEL_REF_PREFIX}${modelIdentifier}`);
  const existing = await findLMStudioAssistantAgent(agentRepository);

  if (!existing) {
    return agentRepository.create({
      name: DEFAULT_LMSTUDIO_ASSISTANT_NAME,
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
