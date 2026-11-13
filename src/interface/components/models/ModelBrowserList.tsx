import { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from 'expo-router';
import {
  FormRow,
  FormSection,
  formText,
  useFormColors,
} from '@/interface/ui/components/form';
import { AppScreen } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { browserRows } from './browser-rows';
import { customModelIdentifier } from './model-option-filter';
import type { ModelOption } from './model-options';
import { ModelBrowserRow } from './ModelBrowserRow';

const form = loomUiTokens.settingsForm;

export type ModelBrowserListProps = {
  readonly options: readonly ModelOption[];
  readonly loading: boolean;
  readonly error: string | null;
  /** The chosen model's id, checked in the list. */
  readonly currentId: string | null;
  /** A row's tap: open that model's page. */
  readonly onOpen: (id: string) => void;
  /** Use a typed id OpenRouter doesn't list (it may be newer than the cache). */
  readonly onUseCustom: (id: string) => void;
  /** Ids: `<prefix>-list-screen`, `<prefix>-list`, `<prefix>-option-<id>`. */
  readonly testIDPrefix: string;
};

/**
 * The OpenRouter model browser: every catalog model in one inset card, each
 * row with its name, maker, context and price; the native search field in
 * the bar narrows it by name, maker or id. A tap opens the model's page.
 * Shared by the agent editor and a tree's Model Settings.
 */
export const ModelBrowserList = ({
  options,
  loading,
  error,
  currentId,
  onOpen,
  onUseCustom,
  testIDPrefix,
}: ModelBrowserListProps) => {
  const navigation = useNavigation();
  const colors = useFormColors();
  const [search, setSearch] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: 'Search models',
        hideWhenScrolling: false,
        autoCapitalize: 'none',
        onChangeText: (event: { nativeEvent: { text: string } }) =>
          setSearch(event.nativeEvent.text),
      },
    });
  }, [navigation]);

  const rows = useMemo(() => browserRows(options, search), [options, search]);
  const custom = loading
    ? null
    : customModelIdentifier('openrouter', search, options);

  return (
    <AppScreen
      testID={`${testIDPrefix}-list-screen`}
      style={{ backgroundColor: colors.page }}
    >
      <FlatList
        testID={`${testIDPrefix}-list`}
        data={rows}
        keyExtractor={(row) => row.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        initialNumToRender={14}
        ListHeaderComponent={
          custom ? (
            <FormSection style={styles.customSection}>
              <FormRow
                testID={`${testIDPrefix}-custom`}
                onPress={() => onUseCustom(custom)}
                accessibilityLabel={`Use ${custom}`}
              >
                <Text numberOfLines={1} style={[formText.accent, styles.grow]}>
                  Use “{custom}” as a model id
                </Text>
              </FormRow>
            </FormSection>
          ) : null
        }
        renderItem={({ item, index }) => (
          <ModelBrowserRow
            testID={`${testIDPrefix}-option-${item.id}`}
            id={item.id}
            title={item.title}
            author={item.author}
            meta={item.meta}
            selected={item.id === currentId}
            first={index === 0}
            last={index === rows.length - 1}
            onOpen={onOpen}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.status} />
          ) : (
            <View style={styles.status}>
              <Text style={[formText.footer, styles.center]}>
                {error ?? (custom ? null : 'No models match.')}
              </Text>
            </View>
          )
        }
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: form.sectionInset,
    paddingTop: form.sectionGap / 2,
    paddingBottom: form.sectionGap,
  },
  customSection: {
    marginTop: 0,
    marginBottom: form.sectionGap / 2,
  },
  grow: {
    flex: 1,
  },
  status: {
    marginTop: 24,
  },
  center: {
    textAlign: 'center',
  },
});
