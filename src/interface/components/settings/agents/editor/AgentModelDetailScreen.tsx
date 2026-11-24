import { useLocalSearchParams, useRouter } from 'expo-router';
import { browsableProvider } from '../../../models/browsable-provider';
import { ModelDetailView } from '../../../models/ModelDetailView';
import { useCatalogModel } from '../../../models/useCatalogModel';
import { useAgentEditor } from './agent-editor-context';

/**
 * A model's page inside the agent editor's sheet. "Use This Model" puts it
 * in the draft and returns to the editor's Form (saved with the agent).
 */
export const AgentModelDetailScreen = () => {
  const { modelId } = useLocalSearchParams<{ modelId: string }>();
  const router = useRouter();
  const { draft, patchDraft } = useAgentEditor();
  const provider = browsableProvider(draft.provider);
  const { model, loading, error } = useCatalogModel(provider, modelId);

  return (
    <ModelDetailView
      provider={provider}
      model={model}
      loading={loading}
      error={error}
      isCurrent={
        draft.provider === provider && draft.modelIdentifier === modelId
      }
      onUse={() => {
        patchDraft({ provider, modelIdentifier: modelId });
        // Past the list, back to the Form.
        router.dismiss(2);
        return Promise.resolve(true);
      }}
    />
  );
};
