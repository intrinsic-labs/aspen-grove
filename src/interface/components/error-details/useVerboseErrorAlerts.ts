import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import type { IUserPreferencesRepository } from '@application/repositories';

/**
 * The "Verbose Error Alerts" setting, read on every focus so a change made
 * in Settings holds when you come back. Off until read (and if it can't be),
 * which is the setting's own default.
 */
export const useVerboseErrorAlerts = (
  userPreferencesRepo: Pick<IUserPreferencesRepository, 'get'>
): boolean => {
  const [verbose, setVerbose] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      userPreferencesRepo
        .get()
        .then((preferences) => {
          if (active) {
            setVerbose(preferences.verboseErrorAlerts);
          }
        })
        .catch(() => {
          // Keep what was shown; the setting only changes a default.
        });
      return () => {
        active = false;
      };
    }, [userPreferencesRepo])
  );

  return verbose;
};
