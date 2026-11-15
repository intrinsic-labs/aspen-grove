import type { IModelOutputLimits } from '@application/services/llm';
import type { Provider } from '@domain/entities';
import type { OpenRouterModelCatalog } from './OpenRouterModelCatalog';

/**
 * Output limits from OpenRouter's saved catalog (`top_provider
 * .max_completion_tokens`), read without going to the network so a send
 * never waits on it. LM Studio reports a context length, not an output
 * limit, so its models have none here.
 */
export class CatalogModelOutputLimits implements IModelOutputLimits {
  private readonly catalog: Pick<OpenRouterModelCatalog, 'getCachedModels'>;

  constructor(catalog: Pick<OpenRouterModelCatalog, 'getCachedModels'>) {
    this.catalog = catalog;
  }

  async maxOutputTokens(
    provider: Provider,
    model: string
  ): Promise<number | undefined> {
    if (provider !== 'openrouter') {
      return undefined;
    }
    const models = await this.catalog.getCachedModels();
    return models.find((candidate) => candidate.id === model)
      ?.maxCompletionTokens;
  }
}
