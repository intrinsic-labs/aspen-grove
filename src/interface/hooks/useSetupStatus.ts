import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import type { SetupStatus } from '@application/services/onboarding';
import { useAppBootstrapState, useAppServices } from '@interface/composition';

/**
 * Where the user stands before starting a tree (see `assessSetupStatus`),
 * re-read each time the screen regains focus, so returning from onboarding
 * or Connections updates it. `null` until the first read finishes.
 */
export const useSetupStatus = () => {
  const { useCases } = useAppServices();
  const bootstrap = useAppBootstrapState();
  const ready = bootstrap.status === 'ready';
  const [status, setStatus] = useState<SetupStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await useCases.getSetupStatusUseCase.execute();
      setStatus(result.status);
    } catch {
      // Unknown is treated as ready: creating a tree reports its own errors.
      setStatus('ready');
    }
  }, [useCases.getSetupStatusUseCase]);

  useFocusEffect(
    useCallback(() => {
      if (ready) {
        void refresh();
      }
      return undefined;
    }, [ready, refresh])
  );

  return { status, refresh };
};
