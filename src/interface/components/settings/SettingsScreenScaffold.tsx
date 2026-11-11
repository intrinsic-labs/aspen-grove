import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppScreen } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const form = loomUiTokens.settingsForm;

type SettingsScreenScaffoldProps = {
  readonly loading?: boolean;
  /**
   * A large title at the top of the Form (`.navigationBarTitleDisplayMode(
   * .large)`); the header shows it inline once it scrolls under the bar.
   */
  readonly largeTitle?: string;
  readonly children: ReactNode;
  /** Forwarded to the screen's host root View. */
  readonly testID?: string;
};

/** Where the large title's baseline passes under the header. */
const LARGE_TITLE_SCROLL_THRESHOLD = 34;

/**
 * Shared shell for every settings screen: Latent Spaces' inset-grouped Form
 * on black, keyboard-aware scroll, iOS keyboard toolbar, loading spinner.
 */
export const SettingsScreenScaffold = ({
  loading = false,
  largeTitle,
  children,
  testID,
}: SettingsScreenScaffoldProps) => {
  const { colors } = useAspenGroveTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [titleInline, setTitleInline] = useState(false);

  const onScroll = largeTitle
    ? (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const inline =
          event.nativeEvent.contentOffset.y > LARGE_TITLE_SCROLL_THRESHOLD;
        if (inline !== titleInline) {
          setTitleInline(inline);
          navigation.setOptions({ headerTitle: inline ? largeTitle : '' });
        }
      }
    : undefined;

  return (
    <AppScreen testID={testID} style={styles.screen}>
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          enabled
          bottomOffset={Platform.OS === 'ios' ? 62 : 0}
          extraKeyboardSpace={0}
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + form.sectionGap },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {largeTitle ? (
            <Text accessibilityRole="header" style={styles.largeTitle}>
              {largeTitle}
            </Text>
          ) : null}
          {children}
        </KeyboardAwareScrollView>
      )}

      {Platform.OS === 'ios' && !loading ? (
        <KeyboardToolbar insets={{ left: insets.left, right: insets.right }}>
          <KeyboardToolbar.Prev />
          <KeyboardToolbar.Next />
          <KeyboardToolbar.Done text="Done" />
        </KeyboardToolbar>
      ) : null}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: form.colors.background,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: form.sectionInset,
  },
  largeTitle: {
    fontSize: form.largeTitleSize,
    lineHeight: form.largeTitleLineHeight,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: form.largeTitleTopGap,
    marginBottom: -11,
  },
});
