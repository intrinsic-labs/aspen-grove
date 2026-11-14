import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHeaderHeight } from '@react-navigation/elements';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LoomTree } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { useCreateLoomTree } from '@/interface/hooks/useCreateLoomTree';
import { useSetupStatus } from '@/interface/hooks/useSetupStatus';
import { TextPromptDialog } from '@/interface/ui/components/text-prompt/TextPromptDialog';
import { AppScreen } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { useDialogueDisplayPreferences } from '../chat/useDialogueDisplayPreferences';
import { useFirstRunRedirect } from '../onboarding/useFirstRunRedirect';
import { DateHeader } from './DateHeader';
import { HomeComposer } from './HomeComposer';
import { HomeListHeader } from './HomeListHeader';
import { TreeList } from './TreeList';
import { useDisplayName } from './useDisplayName';
import { useHomeHeader } from './useHomeHeader';
import { useHomeTrees } from './useHomeTrees';
import { useImportTree } from './useImportTree';
import { useTreeRowActions } from './useTreeRowActions';

/**
 * Home, Latent Spaces' one landing screen (HomeScreenView.swift): the
 * greeting and date, the trees most recent first, and a composer whose first
 * message starts a new tree. The toolbar's `···` menu holds import, links,
 * onboarding, Search and the tag filter; the trailing button opens Settings.
 */
const HomeView = () => {
  const { colors } = useAspenGroveTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { repositories } = useAppServices();
  const [composerHeight, setComposerHeight] = useState(72);

  const displayName = useDisplayName();
  const { status } = useSetupStatus();
  useFirstRunRedirect(status);
  const { preferences } = useDialogueDisplayPreferences({
    userPreferencesRepo: repositories.userPreferencesRepo,
  });

  const home = useHomeTrees();
  const { creating, createTree } = useCreateLoomTree(home.setError);
  const { importing, importTree } = useImportTree({
    reload: home.reload,
    setError: home.setError,
  });
  const rowActions = useTreeRowActions({
    reload: home.reload,
    setError: home.setError,
  });
  useHomeHeader({
    tags: home.tags,
    activeTagId: home.activeTag?.id ?? null,
    setActiveTagId: home.setActiveTagId,
    busy: importing,
    importTree,
  });

  const openTree = (tree: LoomTree) => {
    Keyboard.dismiss();
    router.push({ pathname: '/tree/[treeId]', params: { treeId: tree.id } });
  };

  return (
    <AppScreen testID="home-welcome" style={styles.screen}>
      <Pressable
        accessible={false}
        onPress={Keyboard.dismiss}
        style={{ paddingTop: headerHeight }}
      >
        <DateHeader displayName={displayName} />
      </Pressable>

      <TreeList
        trees={home.trees}
        header={
          <HomeListHeader
            setupStatus={status}
            activeTag={home.activeTag}
            onClearTag={() => home.setActiveTagId(null)}
            error={home.error}
          />
        }
        bottomInset={composerHeight}
        onOpen={openTree}
        onRename={rowActions.rename}
        onDelete={(tree) => void rowActions.remove(tree)}
      />

      {/* The screen fades to black over its last 10%
          (HomeScreenView.swift:210-220). */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'transparent', colors.oppositePrimary]}
        locations={[0, loomUiTokens.bottomFade.clearUntil, 1]}
        style={StyleSheet.absoluteFill}
      />

      <HomeComposer
        bottomInset={insets.bottom}
        displayPreferences={preferences}
        autoFocus={status !== null && status !== 'first-run'}
        creating={creating}
        onSubmit={(text) => createTree({ firstMessage: text })}
        onLayoutHeight={setComposerHeight}
      />

      <TextPromptDialog pending={rowActions.renamePrompt} />
    </AppScreen>
  );
};

export default HomeView;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
