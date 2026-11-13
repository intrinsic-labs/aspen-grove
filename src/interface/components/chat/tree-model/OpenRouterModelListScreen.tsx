import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import { ModelBrowserList } from '../../models/ModelBrowserList';
import { useModelPickerData } from '../../models/useModelPickerData';
import { treeModelRoutes } from './tree-model-routes';
import { useTreeOpenRouterChoice } from './useTreeOpenRouterChoice';

/**
 * OpenRouter's Model page for a tree (TreeModelSettingsView.swift:101-117,
 * `.pickerStyle(.navigationLink)`), as Aspen Grove's model browser: a tap
 * opens the model's page, where "Use This Model" chooses it.
 */
const OpenRouterModelListScreen = () => {
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  const router = useRouter();
  const picker = useModelPickerData('openrouter');
  const { currentId, error, choose } = useTreeOpenRouterChoice(
    treeId as ULID | undefined
  );

  const onOpen = useCallback(
    (id: string) =>
      treeId && router.push(treeModelRoutes.modelDetail(treeId, id)),
    [router, treeId]
  );
  const onUseCustom = useCallback(
    (id: string) =>
      void choose(id, undefined).then((saved) => saved && router.back()),
    [choose, router]
  );

  return (
    <ModelBrowserList
      testIDPrefix="tree-model"
      options={picker.options}
      loading={picker.loading}
      error={picker.error ?? error}
      currentId={currentId}
      onOpen={onOpen}
      onUseCustom={onUseCustom}
    />
  );
};

export default OpenRouterModelListScreen;
