import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppScreen, SettingsList } from '@/interface/ui/value-objects';

type SettingsScreenScaffoldProps = {
  readonly loading?: boolean;
  readonly children: ReactNode;
};

/**
 * Shared shell for every settings sub-screen: keyboard-aware scroll,
 * iOS keyboard toolbar, loading spinner.
 */
export const SettingsScreenScaffold = ({
  loading = false,
  children,
}: SettingsScreenScaffoldProps) => {
  const { colors } = useAspenGroveTheme();
  const insets = useSafeAreaInsets();

  return (
    <AppScreen>
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
        >
          <SettingsList>{children}</SettingsList>
        </KeyboardAwareScrollView>
      )}

      {Platform.OS === 'ios' && !loading ? (
        <KeyboardToolbar insets={{ left: insets.left, right: insets.right }}>
          <KeyboardToolbar.Prev />
          <KeyboardToolbar.Next />
          <KeyboardToolbar.Done text="Close" />
        </KeyboardToolbar>
      ) : null}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
});
