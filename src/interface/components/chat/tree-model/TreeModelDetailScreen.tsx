import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import { ModelDetailView } from '../../models/ModelDetailView';
import { useOpenRouterModel } from '../../models/useOpenRouterModel';
import { useTreeOpenRouterChoice } from './useTreeOpenRouterChoice';

/**
 * A model's page, pushed from the tree's model browser. "Use This Model"
 * saves it as the tree's model and returns to Model Settings.
 */
const TreeModelDetailScreen = () => {
  const { treeId, modelId } = useLocalSearchParams<{
    treeId: string;
    modelId: string;
  }>();
  const router = useRouter();
  const { model, option, loading, error } = useOpenRouterModel(modelId);
  const choice = useTreeOpenRouterChoice(treeId as ULID | undefined);

  return (
    <ModelDetailView
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
