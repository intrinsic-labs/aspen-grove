import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import { browsableProvider } from '../../models/browsable-provider';
import { ModelDetailView } from '../../models/ModelDetailView';
import { useCatalogModel } from '../../models/useCatalogModel';
import { useTreeModelChoice } from './useTreeModelChoice';

/**
 * A model's page, pushed from the tree's model browser. "Use This Model"
 * saves it as the tree's model and returns to Model Settings.
 */
const TreeModelDetailScreen = () => {
  const {
    treeId,
    modelId,
    provider: providerParam,
  } = useLocalSearchParams<{
    treeId: string;
    modelId: string;
    provider?: string;
  }>();
  const provider = browsableProvider(providerParam);
  const router = useRouter();
  const { model, option, loading, error } = useCatalogModel(provider, modelId);
  const choice = useTreeModelChoice(treeId as ULID | undefined, provider);

  return (
    <ModelDetailView
      provider={provider}
      model={model}
      loading={loading}
      error={error ?? choice.error}
      isCurrent={modelId === choice.currentId}
      onUse={async () => {
        const saved = await choice.choose(modelId, option);
        if (saved) {
          // Past the list, back to Model Settings.
          router.dismiss(2);
        }
        return saved;
      }}
    />
  );
};

export default TreeModelDetailScreen;
