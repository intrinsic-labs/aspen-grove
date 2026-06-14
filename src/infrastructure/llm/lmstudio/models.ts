import { LlmProviderError } from '@application/services/llm';
import { fetch as expoFetch } from 'expo/fetch';
import { toLlmProviderError } from './errors';
import { toJsonString } from './helpers';
import type {
  LMStudioApiModel,
  LMStudioConfig,
  LMStudioModel,
  LMStudioModelsResponse,
} from './types';

/**
 * Convert raw API model to normalized model representation.
 */
const normalizeModel = (apiModel: LMStudioApiModel): LMStudioModel => ({
  id: apiModel.key,
  displayName: apiModel.display_name,
  type: apiModel.type,
  state: apiModel.loaded_instances.length > 0 ? 'loaded' : 'not-loaded',
  maxContextLength: apiModel.max_context_length,
  architecture: apiModel.architecture ?? undefined,
  paramsString: apiModel.params_string ?? undefined,
  sizeBytes: apiModel.size_bytes,
});

const DEFAULT_MODELS_TIMEOUT_MS = 10000;

/**
 * Fetches available models from LM Studio server.
 * Returns models sorted by state (loaded first) then alphabetically.
 */
export const fetchLMStudioModels = async (input: {
  readonly config: LMStudioConfig;
  readonly timeoutMs?: number;
}): Promise<LMStudioModel[]> => {
  const { config, timeoutMs = DEFAULT_MODELS_TIMEOUT_MS } = input;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const endpoint = config.endpoint.replace(/\/$/, '');
  const url = `${endpoint}/api/v1/models`;

  console.log('[LMStudio:models] Fetching models', {
    url,
    hasApiToken: !!config.apiToken,
    timeoutMs,
  });

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }

    console.log(
      '[LMStudio:models] Making request with headers:',
      Object.keys(headers)
    );

    const response = await expoFetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    console.log(
      '[LMStudio:models] Response status:',
      response.status,
      response.statusText
    );

    const responseText = await response.text();
    console.log(
      '[LMStudio:models] Response body (first 500 chars):',
      responseText.slice(0, 500)
    );

    if (!response.ok) {
      console.error(
        '[LMStudio:models] Request failed:',
        response.status,
        responseText
      );
      throw toLlmProviderError({
        status: response.status,
        responseHeaders: response.headers,
        responseBody: responseText,
        fallbackMessage: `LM Studio models request failed (${response.status})`,
      });
    }

    let payload: LMStudioModelsResponse;
    try {
      payload = JSON.parse(responseText) as LMStudioModelsResponse;
    } catch (parseError) {
      console.error('[LMStudio:models] Failed to parse JSON:', parseError);
      throw new LlmProviderError({
        code: 'invalidRequest',
        message: `Invalid JSON response: ${responseText.slice(0, 200)}`,
        provider: 'lmstudio',
        retryable: false,
      });
    }

    console.log('[LMStudio:models] Parsed payload:', {
      hasModels: !!payload.models,
      modelsLength: payload.models?.length,
      rawPayload: JSON.stringify(payload).slice(0, 500),
    });

    const apiModels = payload.models ?? [];

    // Filter to only LLM models (not embedding models) and normalize
    const models = apiModels
      .filter((m) => m.type === 'llm')
      .map(normalizeModel);

    console.log(
      '[LMStudio:models] Found LLM models:',
      models.length,
      models.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        state: m.state,
      }))
    );

    // Sort: loaded models first, then alphabetically
    return models.slice().sort((a, b) => {
      if (a.state === 'loaded' && b.state !== 'loaded') return -1;
      if (a.state !== 'loaded' && b.state === 'loaded') return 1;
      return a.id.localeCompare(b.id);
    });
  } catch (error) {
    if (error instanceof LlmProviderError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new LlmProviderError({
        code: 'timeout',
        message: 'LM Studio models request timed out.',
        provider: 'lmstudio',
        retryable: true,
      });
    }

    throw new LlmProviderError({
      code: 'networkError',
      message: `LM Studio models error: ${toJsonString(error)}`,
      provider: 'lmstudio',
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Loads a model into memory on the LM Studio server.
 */
export const loadLMStudioModel = async (input: {
  readonly config: LMStudioConfig;
  readonly modelId: string;
  readonly timeoutMs?: number;
}): Promise<void> => {
  const { config, modelId, timeoutMs = 30000 } = input;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = config.endpoint.replace(/\/$/, '');
    const url = `${endpoint}/api/v1/models/load`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }

    const response = await expoFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: modelId }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw toLlmProviderError({
        status: response.status,
        responseHeaders: response.headers,
        responseBody,
        fallbackMessage: `Failed to load model ${modelId} (${response.status})`,
      });
    }
  } catch (error) {
    if (error instanceof LlmProviderError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new LlmProviderError({
        code: 'timeout',
        message: `Loading model ${modelId} timed out.`,
        provider: 'lmstudio',
        retryable: true,
      });
    }

    throw new LlmProviderError({
      code: 'networkError',
      message: `Failed to load model: ${toJsonString(error)}`,
      provider: 'lmstudio',
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Unloads a model from memory on the LM Studio server.
 */
export const unloadLMStudioModel = async (input: {
  readonly config: LMStudioConfig;
  readonly modelId: string;
  readonly timeoutMs?: number;
}): Promise<void> => {
  const { config, modelId, timeoutMs = 10000 } = input;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = config.endpoint.replace(/\/$/, '');
    const url = `${endpoint}/api/v1/models/unload`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }

    const response = await expoFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: modelId }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw toLlmProviderError({
        status: response.status,
        responseHeaders: response.headers,
        responseBody,
        fallbackMessage: `Failed to unload model ${modelId} (${response.status})`,
      });
    }
  } catch (error) {
    if (error instanceof LlmProviderError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new LlmProviderError({
        code: 'timeout',
        message: `Unloading model ${modelId} timed out.`,
        provider: 'lmstudio',
        retryable: true,
      });
    }

    throw new LlmProviderError({
      code: 'networkError',
      message: `Failed to unload model: ${toJsonString(error)}`,
      provider: 'lmstudio',
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
