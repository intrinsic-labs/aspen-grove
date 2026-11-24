import type {
  IModelOutputLimits,
  OpenRouterCatalogModel,
} from '@application/services/llm';
import type { Provider } from '@domain/entities';
import type { OpenRouterModelCatalog } from './OpenRouterModelCatalog';

type CachedModelSource = {
  getCachedModels():
    | readonly OpenRouterCatalogModel[]
    | Promise<readonly OpenRouterCatalogModel[]>;
};

/** Output limits from catalogs already read by the app; sending never fetches a list. */
export class CatalogModelOutputLimits implements IModelOutputLimits {
  private readonly catalog: Pick<OpenRouterModelCatalog, 'getCachedModels'>;

  constructor(
    catalog: Pick<OpenRouterModelCatalog, 'getCachedModels'>,
    private readonly directCatalogs: Partial<
      Record<Provider, CachedModelSource>
    > = {}
  ) {
    this.catalog = catalog;
  }

  async maxOutputTokens(
    provider: Provider,
    model: string
  ): Promise<number | undefined> {
    const source =
      provider === 'openrouter' ? this.catalog : this.directCatalogs[provider];
    if (!source) {
      return undefined;
    }
    const models = await source.getCachedModels();
    return models.find((candidate) => candidate.id === model)
      ?.maxCompletionTokens;
  }
}
