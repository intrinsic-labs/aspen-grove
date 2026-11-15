import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ModelBrowserList } from '../../../models/ModelBrowserList';
import { useModelPickerData } from '../../../models/useModelPickerData';
import { agentEditorRoutes } from './agent-editor-routes';
import { useAgentEditor } from './agent-editor-context';

/**
 * The agent editor's model browser, pushed inside its sheet from Model: a
 * tap opens the model's page; a typed id OpenRouter doesn't list can be
 * used as it is.
 */
export const AgentModelListScreen = () => {
  const router = useRouter();
  const picker = useModelPickerData('openrouter');
  const { draft, patchDraft } = useAgentEditor();

  const onOpen = useCallback(
    (id: string) => router.push(agentEditorRoutes.modelDetail(id)),
    [router]
  );
  const onUseCustom = useCallback(
    (id: string) => {
      patchDraft({ provider: 'openrouter', modelIdentifier: id });
      router.back();
    },
    [patchDraft, router]
  );

  return (
    <ModelBrowserList
      testIDPrefix="agent-editor-model"
      options={picker.options}
      loading={picker.loading}
      error={picker.error}
      currentId={draft.provider === 'openrouter' ? draft.modelIdentifier : null}
      onOpen={onOpen}
      onUseCustom={onUseCustom}
    />
  );
};
