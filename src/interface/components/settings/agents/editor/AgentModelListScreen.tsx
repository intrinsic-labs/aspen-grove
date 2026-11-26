import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { browsableProvider } from '../../../models/browsable-provider';
import { ModelBrowserList } from '../../../models/ModelBrowserList';
import { useModelPickerData } from '../../../models/useModelPickerData';
import { agentEditorRoutes } from './agent-editor-routes';
import { useAgentEditor } from './agent-editor-context';

/**
 * The agent editor's model browser, pushed inside its sheet from Model, for
 * the draft's provider: a tap opens the model's page; a typed id the provider
 * doesn't list can be used as it is.
 */
export const AgentModelListScreen = () => {
  const router = useRouter();
  const { draft, patchDraft } = useAgentEditor();
  const provider = browsableProvider(draft.provider);
  const picker = useModelPickerData(provider);

  const onOpen = useCallback(
    (id: string) => router.push(agentEditorRoutes.modelDetail(id)),
    [router]
  );
  const onUseCustom = useCallback(
    (id: string) => {
      patchDraft({ provider, modelIdentifier: id });
      router.back();
    },
    [patchDraft, provider, router]
  );

  return (
    <ModelBrowserList
      testIDPrefix="agent-editor-model"
      provider={provider}
      options={picker.options}
      loading={picker.loading}
      error={picker.error}
      currentId={draft.provider === provider ? draft.modelIdentifier : null}
      onOpen={onOpen}
      onUseCustom={onUseCustom}
    />
  );
};
