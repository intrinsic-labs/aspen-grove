import { useEffect, useState } from 'react';
import { useAppServices } from '@interface/composition';

/** The reader's name for the greeting, if they have set one. */
export const useDisplayName = (): string | null => {
  const { repositories } = useAppServices();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void repositories.userPreferencesRepo
      .get()
      .then((preferences) => {
        if (!cancelled) {
          setDisplayName(preferences.displayName?.trim() || null);
        }
      })
      .catch(() => {
        // The greeting falls back to its nameless variant.
      });
    return () => {
      cancelled = true;
    };
  }, [repositories.userPreferencesRepo]);

  return displayName;
};
