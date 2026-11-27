import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import {
  FormButtonRow,
  FormLinkRow,
  FormSection,
} from '@/interface/ui/components/form';
import { ModelBrowserList } from '../models/ModelBrowserList';
import { PROVIDER_LABELS } from '../models/provider-options';
import { SettingsScreenScaffold } from '../settings/SettingsScreenScaffold';
import { FormCheckRow } from '../settings/agents/editor/FormCheckRow';
import { useBufferModel } from './useBufferModel';

const BufferModelScreen = () => {
  const { treeId } = useLocalSearchParams<{ treeId?: string }>();
  const router = useRouter();
  const model = useBufferModel(treeId as ULID | undefined);

  const select = useCallback(
    (modelId: string) => {
      void model.select(modelId).then((saved) => saved && router.back());
    },
    [model, router]
  );

  if (!model.loaded) {
    return (
      <SettingsScreenScaffold testID="buffer-model-screen" loading>
        {null}
      </SettingsScreenScaffold>
    );
  }

  if (!model.provider) {
    return (
      <SettingsScreenScaffold testID="buffer-model-screen">
        <FormSection
          testID="buffer-model-empty"
          footer="Connect OpenRouter or set up LM Studio in Settings → Connections to choose a verified base model."
        >
          <FormLinkRow
            title="Connections"
            onPress={() => router.push('/settings/connections')}
          />
        </FormSection>
      </SettingsScreenScaffold>
    );
  }

  const providerSection = (
    <FormSection header="Provider">
      {model.providers.map((provider) => (
        <FormCheckRow
          key={provider}
          testID={`buffer-model-provider-${provider}`}
          title={PROVIDER_LABELS[provider]}
          selected={provider === model.provider}
          onPress={() => model.chooseProvider(provider)}
        />
      ))}
      <FormButtonRow
        testID="buffer-model-refresh"
        title="Refresh Models"
        disabled={model.loading || model.saving}
        onPress={() => void model.refresh()}
      />
    </FormSection>
  );

  const status = model.error ? (
    <FormSection testID="buffer-model-error" footer={model.error}>
      <FormButtonRow title="Retry" onPress={() => void model.refresh()} />
    </FormSection>
  ) : !model.loading && model.options.length === 0 ? (
    <FormSection
      testID="buffer-model-empty"
      footer="This provider lists no verified base models. You can keep writing, but you can’t generate yet."
    />
  ) : undefined;

  return (
    <ModelBrowserList
      screenTestID="buffer-model-screen"
      testIDPrefix="buffer-model"
      provider={model.provider}
      options={model.options}
      loading={model.loading}
      error={null}
      currentId={model.currentId}
      onOpen={select}
      header={providerSection}
      emptyComponent={status}
    />
  );
};

export default BufferModelScreen;
