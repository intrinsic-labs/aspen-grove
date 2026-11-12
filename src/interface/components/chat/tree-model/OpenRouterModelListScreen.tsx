import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import { formText } from '@/interface/ui/components/form';
import { AppScreen } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { filterModelOptions } from '../../settings/agents/model-option-filter';
import { useModelPickerData } from '../../settings/agents/useModelPickerData';
import { modelChoiceChanges } from './model-choice';
import { ModelListRow } from './ModelListRow';
import { useTreeModelAgent } from './useTreeModelAgent';

const form = loomUiTokens.settingsForm;

/**
 * OpenRouter's Model picker page (TreeModelSettingsView.swift:101-117,
 * `.pickerStyle(.navigationLink)`): every model by name, a check on the
 * tree's, and a tap chooses it and goes back. Aspen Grove adds a search
 * field in the bar, since the catalog runs to hundreds of models.
 */
const OpenRouterModelListScreen = () => {
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const treeModel = useTreeModelAgent(treeId as ULID | undefined);
  const picker = useModelPickerData('openrouter');
  const [search, setSearch] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: 'Search',
        hideWhenScrolling: false,
        onChangeText: (event: { nativeEvent: { text: string } }) =>
          setSearch(event.nativeEvent.text),
      },
    });
  }, [navigation]);

  const models = useMemo(
    () =>
      filterModelOptions(
        [...picker.options].sort((a, b) => a.label.localeCompare(b.label)),
        search,
        Number.POSITIVE_INFINITY
      ),
    [picker.options, search]
  );
  const currentId =
    treeModel.model?.provider === 'openrouter' ? treeModel.model.id : null;

  const { apply } = treeModel;
  const useMaxTokens = treeModel.agent?.configuration.useMaxTokens ?? false;
  const onSelect = useCallback(
    (id: string) => {
      const option = picker.options.find((candidate) => candidate.id === id);
      void apply(
        modelChoiceChanges('openrouter', id, option, useMaxTokens)
      ).then((saved) => saved && router.back());
    },
    [apply, picker.options, router, useMaxTokens]
  );

  return (
    <AppScreen testID="tree-model-list-screen" style={styles.screen}>
      <FlatList
        testID="tree-model-list"
        data={models}
        keyExtractor={(model) => model.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        initialNumToRender={20}
        renderItem={({ item, index }) => (
          <ModelListRow
            id={item.id}
            label={item.label}
            selected={item.id === currentId}
            first={index === 0}
            last={index === models.length - 1}
            onSelect={onSelect}
          />
        )}
        ListEmptyComponent={
          picker.loading ? (
            <ActivityIndicator style={styles.status} />
          ) : (
            <Text style={[formText.footer, styles.status]}>
              {picker.error ?? treeModel.error ?? 'No models match.'}
            </Text>
          )
        }
      />
    </AppScreen>
  );
};

export default OpenRouterModelListScreen;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: form.colors.background,
  },
  content: {
    paddingHorizontal: form.sectionInset,
    paddingTop: form.sectionGap,
    paddingBottom: form.sectionGap,
  },
  status: {
    marginTop: 24,
    textAlign: 'center',
  },
});
