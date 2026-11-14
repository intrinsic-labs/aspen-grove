import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { SetupStatus } from '@application/services/onboarding';
import type { Tag } from '@domain/entities';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { SetupHint } from '../setup/SetupHint';

const form = loomUiTokens.settingsForm;

type HomeListHeaderProps = {
  readonly setupStatus: SetupStatus | null;
  readonly activeTag: Tag | null;
  readonly onClearTag: () => void;
  readonly error: string | null;
};

/**
 * What sits above Home's tree card, all Aspen Grove's own: the setup hint
 * until a tree can start, the tag the list is filtered by, and an error.
 * Renders nothing in the usual case, as Latent Spaces has nothing there.
 */
export const HomeListHeader = ({
  setupStatus,
  activeTag,
  onClearTag,
  error,
}: HomeListHeaderProps) => {
  const showSetup = setupStatus !== null && setupStatus !== 'ready';
  if (!showSetup && !activeTag && !error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showSetup ? (
        <SetupHint
          status={setupStatus}
          testIDPrefix="home"
          style={styles.setup}
        />
      ) : null}
      {error ? (
        <AppText
          testID="home-error"
          variant="meta"
          tone="accent"
          style={styles.error}
        >
          {error}
        </AppText>
      ) : null}
      {activeTag ? (
        <View testID="home-tag-filter" style={styles.tagRow}>
          <Text style={styles.tagText} numberOfLines={1}>
            Tagged “{activeTag.name}”
          </Text>
          <Pressable
            testID="home-tag-filter-clear"
            accessibilityRole="button"
            accessibilityLabel="Show all trees"
            hitSlop={10}
            onPress={onClearTag}
          >
            <Ionicons
              name="close-circle"
              size={form.headerTextSize}
              color={form.colors.secondaryLabel}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: form.sectionInset,
    gap: 16,
  },
  setup: {
    paddingTop: 8,
  },
  error: {
    textAlign: 'center',
  },
  // An inset-grouped section header (as Settings draws them).
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: form.rowPaddingHorizontal,
  },
  tagText: {
    flexShrink: 1,
    fontSize: form.headerTextSize,
    lineHeight: form.headerLineHeight,
    fontWeight: '600',
    color: form.colors.secondaryLabel,
  },
});
