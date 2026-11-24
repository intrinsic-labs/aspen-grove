import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import { browsableProvider } from '../../models/browsable-provider';
import { catalogModelForId } from '../../models/catalog-model-for-id';
import { ModelBrowserList } from '../../models/ModelBrowserList';
import { useModelPickerData } from '../../models/useModelPickerData';
import { treeModelRoutes } from './tree-model-routes';
import { useTreeModelChoice } from './useTreeModelChoice';

/**
 * A provider's Model page for a tree (TreeModelSettingsView.swift:101-117,
 * `.pickerStyle(.navigationLink)`), as Aspen Grove's model browser: a tap
 * opens the model's page, where "Use This Model" chooses it. The provider
 * (OpenRouter, Anthropic or OpenAI) comes with the route.
 */
const TreeModelListScreen = () => {
  const { treeId, provider: providerParam } = useLocalSearchParams<{
    treeId: string;
    provider?: string;
  }>();
  const provider = browsableProvider(providerParam);
  const router = useRouter();
  const picker = useModelPickerData(provider);
  const { currentId, error, choose } = useTreeModelChoice(
    treeId as ULID | undefined,
    provider
  );

  const onOpen = useCallback(
    (id: string) =>
      treeId && router.push(treeModelRoutes.modelDetail(treeId, provider, id)),
    [provider, router, treeId]
  );
  // A custom id naming a listed model is held to that model's limit.
  const onUseCustom = useCallback(
    (id: string) =>
      void choose(id, catalogModelForId(id, picker.options)).then(
        (saved) => saved && router.back()
      ),
    [choose, picker.options, router]
  );

  return (
    <ModelBrowserList
      testIDPrefix="tree-model"
      provider={provider}
      options={picker.options}
      loading={picker.loading}
      error={picker.error ?? error}
      currentId={currentId}
      onOpen={onOpen}
      onUseCustom={onUseCustom}
    />
  );
};

export default TreeModelListScreen;
