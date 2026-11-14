import { useCallback, useEffect, useState } from 'react';
import { useAppServices } from '@interface/composition';
import { useScreenSettled } from '@interface/hooks/useScreenSettled';

/**
 * Latent Spaces' first-tree tips (LoomTreeView.swift:89-99): shown when a
 * tree opens until they are closed, and again from the tree's Show
 * Onboarding. Begin and a swipe down both close them for good (Latent Spaces
 * records only Begin and shows a swiped sheet again on the next tree).
 *
 * The sheet waits for the tree's own transition: a first tree replaces the
 * onboarding sheet, and iOS won't present a sheet while another is still
 * going away.
 */
export const useTreeOnboarding = () => {
  const { repositories } = useAppServices();
  const settled = useScreenSettled();
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    let active = true;
    void repositories.userPreferencesRepo.get().then((preferences) => {
      if (active && preferences.treeOnboardingCompletedAt === undefined) {
        setWanted(true);
      }
    });
    return () => {
      active = false;
    };
  }, [repositories.userPreferencesRepo]);

  const close = useCallback(() => {
    setWanted(false);
    void repositories.userPreferencesRepo.update({
      treeOnboardingCompletedAt: new Date(),
    });
  }, [repositories.userPreferencesRepo]);

  return {
    visible: wanted && settled,
    open: useCallback(() => setWanted(true), []),
    close,
  };
};

export type TreeOnboarding = ReturnType<typeof useTreeOnboarding>;
