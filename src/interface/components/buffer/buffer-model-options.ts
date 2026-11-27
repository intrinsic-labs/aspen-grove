import { selectEligibleBaseModels } from '@application/services/llm/base-model-eligibility';
import type { OpenRouterCatalogModel } from '@application/services/llm';
import type { AgentConfiguration } from '@domain/entities';
import type { LMStudioModel } from '@infrastructure/llm';
import {
  catalogModelOption,
  lmStudioModelOption,
  type ModelOption,
} from '../models/model-options';
import type { BufferModelProvider } from './buffer-model-providers';

/** The spec's short default keeps an unconfigured first draw deliberate. */
export const DEFAULT_BUFFER_MAX_TOKENS = 50;

export const bufferModelTokenCap = (
  configuration: AgentConfiguration | null | undefined
): number => configuration?.maxTokens ?? DEFAULT_BUFFER_MAX_TOKENS;

export const eligibleOpenRouterOptions = (
  catalog: readonly OpenRouterCatalogModel[] | null | undefined
): readonly ModelOption[] =>
  selectEligibleBaseModels('openrouter', catalog).map((model) =>
    catalogModelOption(model)
  );

export const eligibleLmStudioOptions = (
  catalog: readonly LMStudioModel[] | null | undefined
): readonly ModelOption[] =>
  selectEligibleBaseModels('lmstudio', catalog).map(lmStudioModelOption);

export const loadEligibleBufferModelOptions = async (
  provider: BufferModelProvider,
  adapters: {
    readonly openRouterCatalog: {
      getModels(input: {
        readonly forceRefresh: boolean;
      }): Promise<readonly OpenRouterCatalogModel[]>;
    };
    readonly providerRegistry: {
      getLMStudioAdapter(): {
        fetchModels(): Promise<LMStudioModel[]>;
      };
    };
  },
  forceRefresh: boolean
): Promise<readonly ModelOption[]> =>
  provider === 'openrouter'
    ? eligibleOpenRouterOptions(
        await adapters.openRouterCatalog.getModels({ forceRefresh })
      )
    : eligibleLmStudioOptions(
        await adapters.providerRegistry.getLMStudioAdapter().fetchModels()
      );
