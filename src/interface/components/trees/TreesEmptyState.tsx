import { StyleSheet, View } from 'react-native';
import type { SetupStatus } from '@application/services/onboarding';
import { AppPillButton, AppText } from '@/interface/ui/value-objects';
import { SetupHint } from '../setup/SetupHint';

type TreesEmptyStateProps = {
  /** A tag filter is active, so the grove isn't empty, only the filter. */
  readonly filtered: boolean;
  readonly status: SetupStatus | null;
  readonly creating: boolean;
  readonly onCreateTree: () => void;
};

/**
 * The Loom Trees list with nothing in it: says so in one line and offers
 * the next step, a new tree, or the setup a tree still needs.
 */
export const TreesEmptyState = ({
  filtered,
  status,
  creating,
  onCreateTree,
}: TreesEmptyStateProps) => {
  if (filtered) {
    return (
      <AppText
        testID="trees-empty"
        variant="meta"
        tone="secondary"
        style={styles.filteredText}
      >
        No trees with this tag.
      </AppText>
    );
  }

  return (
    <View testID="trees-empty" style={styles.container}>
      <AppText variant="body" tone="primary" style={styles.title}>
        No loom trees yet.
      </AppText>
      {status === 'ready' ? (
        <AppPillButton
          testID="trees-empty-new-tree"
          label={creating ? 'Creating…' : 'New Loom Tree'}
          variant="outline"
          disabled={creating}
          onPress={onCreateTree}
        />
      ) : status ? (
        <SetupHint status={status} testIDPrefix="trees" />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 18,
    paddingTop: 72,
  },
  title: {
    textAlign: 'center',
  },
  filteredText: {
    marginTop: 18,
  },
});
