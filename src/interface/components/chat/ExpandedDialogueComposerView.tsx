import { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { useAppServices } from '@/interface/composition';
import { AppScreen, AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import {
  setDialogueDraft,
  useDialogueDraft,
} from './dialogue-draft-store';
import { useDialogueDisplayPreferences } from './useDialogueDisplayPreferences';

const getParamString = (
  value: string | string[] | undefined
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export const ExpandedDialogueComposerView = () => {
  const router = useRouter();
  const inputRef = useRef<TextInputType>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useAspenGroveTheme();
  const { repositories } = useAppServices();
  const routeParams = useLocalSearchParams<{ treeId?: string | string[] }>();
  const treeId = getParamString(routeParams.treeId);
  const draft = useDialogueDraft(treeId);
  const displayPreferences = useDialogueDisplayPreferences({
    userPreferencesRepo: repositories.userPreferencesRepo,
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <AppScreen style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={styles.avoidingView}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 8,
              borderBottomColor: colors.secondaryVariant,
            },
          ]}
        >
          <AppText variant="meta" tone="secondary">
            Draft
          </AppText>
          <Pressable
            onPress={() => router.back()}
            hitSlop={loomUiTokens.composer.closeHitSlop}
            accessibilityLabel="Collapse message input"
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <MaterialIcons
              name="close-fullscreen"
              size={22}
              color={colors.primary}
            />
          </Pressable>
        </View>

        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={(value) => setDialogueDraft(treeId, value)}
          multiline
          scrollEnabled
          textAlignVertical="top"
          autoCorrect
          style={[
            styles.input,
            {
              color: colors.primary,
              fontSize: displayPreferences.messageFontSize,
              lineHeight: displayPreferences.messageLineHeight,
              paddingBottom: insets.bottom + 20,
              ...(displayPreferences.messageFontFamily
                ? { fontFamily: displayPreferences.messageFontFamily }
                : {}),
            },
          ]}
        />
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  avoidingView: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingTop: 18,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
});
