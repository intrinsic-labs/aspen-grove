import { useLocalSearchParams, useRouter } from 'expo-router';
import { ModelDetailView } from '../../../models/ModelDetailView';
import { useOpenRouterModel } from '../../../models/useOpenRouterModel';
import { useAgentEditor } from './agent-editor-context';

/**
 * A model's page inside the agent editor's sheet. "Use This Model" puts it
 * in the draft and returns to the editor's Form (saved with the agent).
 */
export const AgentModelDetailScreen = () => {
  const { modelId } = useLocalSearchParams<{ modelId: string }>();
  const router = useRouter();
  const { model, loading, error } = useOpenRouterModel(modelId);
  const { draft, patchDraft } = useAgentEditor();

  return (
    <ModelDetailView
      model={model}
      loading={loading}
      error={error}
      isCurrent={
        draft.provider === 'openrouter' && draft.modelIdentifier === modelId
      }
      onUse={() => {
        patchDraft({ provider: 'openrouter', modelIdentifier: modelId });
        // Past the list, back to the Form.
        router.dismiss(2);
        return Promise.resolve(true);
      }}
    />
  );
};
