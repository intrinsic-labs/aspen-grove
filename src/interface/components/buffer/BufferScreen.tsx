import { useLayoutEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useHeaderHeight, useNavigation } from 'expo-router/react-navigation';
import type { LoomTree } from '@domain/entities';
import { HeaderScrollEdge } from '@/interface/ui/components/header/HeaderScrollEdge';
import { AppScreen, AppText } from '@/interface/ui/value-objects';

type BufferScreenProps = {
  readonly tree: LoomTree;
};

/**
 * A buffer-mode tree: continuous prose, no message boundaries. The editor
 * itself arrives in the next change; this is the empty document.
 */
export const BufferScreen = ({ tree }: BufferScreenProps) => {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();

  useLayoutEffect(() => {
    navigation.setOptions({ title: tree.title ?? 'Buffer' });
  }, [navigation, tree.title]);

  return (
    <AppScreen testID="buffer-screen" style={styles.screen}>
      <AppText
        variant="meta"
        tone="secondary"
        style={[styles.empty, { paddingTop: headerHeight + 24 }]}
      >
        An empty buffer.
      </AppText>
      <HeaderScrollEdge />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  empty: { paddingHorizontal: 24 },
});
