import { useLayoutEffect } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from 'expo-router/react-navigation';
import { useRouter } from 'expo-router';
import type { Tag } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { HOME_LINKS } from './home-links';
import type { HomeMenuCommand } from './home-menu';
import { HomeMenu } from './HomeMenu';
import { HomeSettingsButton } from './HomeSettingsButton';

type UseHomeHeaderInput = {
  readonly tags: readonly Tag[];
  readonly activeTagId: ULID | null;
  readonly setActiveTagId: (tagId: ULID | null) => void;
  readonly busy: boolean;
  readonly importTree: () => Promise<void>;
  /** Buffer developer preview: the menu offers New Buffer. */
  readonly bufferPreview?: boolean;
  readonly createBuffer?: () => Promise<boolean>;
};

/**
 * Home's toolbar (HomeScreenView.swift:122-164): the `···` menu leading and
 * the Settings button trailing, in the transparent navigation bar.
 */
export const useHomeHeader = ({
  tags,
  activeTagId,
  setActiveTagId,
  busy,
  importTree,
  bufferPreview = false,
  createBuffer,
}: UseHomeHeaderInput) => {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    const onCommand = (command: HomeMenuCommand) => {
      switch (command.type) {
        case 'import':
          void importTree();
          break;
        case 'docs':
          void Linking.openURL(HOME_LINKS.openLoomDocs);
          break;
        case 'info':
          void Linking.openURL(HOME_LINKS.infoAndTutorials);
          break;
        case 'onboarding':
          router.push('/onboarding');
          break;
        case 'search':
          router.push('/search');
          break;
        case 'newBuffer':
          void createBuffer?.();
          break;
        case 'filterTag':
          setActiveTagId(command.tagId);
          break;
      }
    };

    navigation.setOptions({
      headerLeft: () => (
        <HomeMenu
          tags={tags}
          activeTagId={activeTagId}
          busy={busy}
          bufferPreview={bufferPreview}
          onCommand={onCommand}
        />
      ),
      headerRight: () => <HomeSettingsButton />,
    });
  }, [
    activeTagId,
    bufferPreview,
    busy,
    createBuffer,
    importTree,
    navigation,
    router,
    setActiveTagId,
    tags,
  ]);
};
