import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isSelectableProvider,
  type SelectableProvider,
} from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useModelPickerData } from '../../models/useModelPickerData';
import { modelChoiceChanges } from './model-choice';
import { providerDefaultModel } from '../../models/provider-default-model';
import {
  maxTokensAllowed,
  TEMPERATURE_RANGE,
  toTreeModelValues,
  UNKNOWN_MODEL_MAX_TOKENS,
} from './tree-model-values';
import { useTreeModelAgent } from './useTreeModelAgent';

const roundToStep = (value: number, step: number): number =>
  Number((Math.round(value / step) * step).toFixed(2));

/**
 * The Model Settings form (TreeModelSettingsView.swift): the tree's provider
 * and model, its parameters, and the slider values while a thumb is held.
 * Every change is saved at once, as Latent Spaces' bindings save the tree.
 * A new provider is applied with a model for it, once its list has loaded.
 */
export const useTreeModelSettings = (treeId: ULID | undefined) => {
  const treeModel = useTreeModelAgent(treeId);
  const { agent, model, apply } = treeModel;
  const [pendingProvider, setPendingProvider] =
    useState<SelectableProvider | null>(null);
  const [temperatureDraft, setTemperatureDraft] = useState<number | null>(null);
  const [maxTokensDraft, setMaxTokensDraft] = useState<number | null>(null);

  const agentProvider =
    model && isSelectableProvider(model.provider) ? model.provider : null;
  const provider = pendingProvider ?? agentProvider ?? 'openrouter';
  const picker = useModelPickerData(provider);
  const listReady = picker.settledFor === provider && !picker.error;
  const modelId = pendingProvider ? null : (model?.id ?? null);
  const selected = listReady
    ? picker.options.find((option) => option.id === modelId)
    : undefined;
  const configuration = agent?.configuration ?? {};
  // Until the list is in, don't clamp a saved value to the unknown limit.
  const maxAllowed = listReady
    ? maxTokensAllowed(selected)
    : Math.max(UNKNOWN_MODEL_MAX_TOKENS, configuration.maxTokens ?? 0);
  const values = toTreeModelValues(configuration, maxAllowed);

  const chooseModel = useCallback(
    (forProvider: SelectableProvider, id: string) =>
      apply(
        modelChoiceChanges(
          forProvider,
          id,
          picker.options.find((option) => option.id === id),
          values.useMaxTokens
        )
      ),
    [apply, picker.options, values.useMaxTokens]
  );

  // A new provider: once its list settles, switch to its default model.
  const switching = useRef(false);
  useEffect(() => {
    if (
      !pendingProvider ||
      picker.settledFor !== pendingProvider ||
      picker.loading ||
      switching.current
    ) {
      return;
    }
    const id = providerDefaultModel(
      pendingProvider,
      picker.options,
      treeModel.defaultAgentModel
    );
    if (!id) {
      return;
    }
    switching.current = true;
    void chooseModel(pendingProvider, id).then(() => {
      switching.current = false;
      setPendingProvider(null);
    });
  }, [
    chooseModel,
    pendingProvider,
    picker.loading,
    picker.options,
    picker.settledFor,
    treeModel.defaultAgentModel,
  ]);

  const commit = useCallback(
    async (changes: Parameters<typeof apply>[0], clearDraft: () => void) => {
      await apply(changes);
      clearDraft();
    },
    [apply]
  );

  return {
    loaded: treeModel.loaded,
    // A list that failed to load shows in the footer instead.
    error: treeModel.error,
    hasAgent: agent !== null,
    provider,
    chooseProvider: (next: SelectableProvider) =>
      setPendingProvider(next === agentProvider && agent ? null : next),
    modelId,
    selected,
    picker,
    chooseModel: (id: string) => void chooseModel(provider, id),
    maxAllowed,
    useMaxTokens: values.useMaxTokens,
    setUseMaxTokens: (on: boolean) =>
      void apply({
        useMaxTokens: on,
        ...(on ? { maxTokens: maxAllowed } : {}),
      }),
    maxTokens: maxTokensDraft ?? values.maxTokens,
    slideMaxTokens: (value: number) => setMaxTokensDraft(Math.round(value)),
    commitMaxTokens: (value: number) =>
      void commit({ maxTokens: Math.round(value) }, () =>
        setMaxTokensDraft(null)
      ),
    temperature: temperatureDraft ?? values.temperature,
    slideTemperature: (value: number) =>
      setTemperatureDraft(roundToStep(value, TEMPERATURE_RANGE.step)),
    commitTemperature: (value: number) =>
      void commit(
        { temperature: roundToStep(value, TEMPERATURE_RANGE.step) },
        () => setTemperatureDraft(null)
      ),
  };
};

export type TreeModelSettings = ReturnType<typeof useTreeModelSettings>;
