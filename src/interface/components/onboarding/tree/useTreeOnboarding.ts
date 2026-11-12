import { useCallback, useEffect, useState } from 'react';
import { useAppServices } from '@interface/composition';
import { useScreenSettled } from '@interface/hooks/useScreenSettled';

/**
 * Latent Spaces' first-tree tips (LoomTreeView.swift:89-99): shown when a
 * tree opens until they are closed with Begin, and again from the tree's
 * Show Onboarding. Swiping the sheet away leaves them for the next tree, as
 * there.
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

  const begin = useCallback(() => {
    setWanted(false);
    void repositories.userPreferencesRepo.update({
      treeOnboardingCompletedAt: new Date(),
    });
  }, [repositories.userPreferencesRepo]);

  return {
    visible: wanted && settled,
    open: useCallback(() => setWanted(true), []),
    dismiss: useCallback(() => setWanted(false), []),
    begin,
  };
};

export type TreeOnboarding = ReturnType<typeof useTreeOnboarding>;
