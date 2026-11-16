import { type RefObject, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import type { IUserPreferencesRepository } from '@application/repositories';

/**
 * The LM Studio address saved in Connections, read each time the screen is
 * focused (so a change made in Connections is current on the way back). Kept
 * in a ref: it is only read when a request fails, never rendered.
 */
export const useSavedLmStudioEndpoint = (
  userPreferencesRepo: Pick<IUserPreferencesRepository, 'get'>
): RefObject<string | undefined> => {
  const endpointRef = useRef<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      userPreferencesRepo
        .get()
        .then((preferences) => {
          if (active) {
            endpointRef.current = preferences.lmstudioSettings?.endpoint;
          }
        })
        .catch(() => {
          // Unreadable preferences: the message goes without the address.
        });
      return () => {
        active = false;
      };
    }, [userPreferencesRepo])
  );

  return endpointRef;
};
