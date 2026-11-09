import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import type { SetupStatus } from '@application/services/onboarding';

/**
 * Opens onboarding once, the first time Home learns this is a first run.
 * Finishing or skipping records it, so later launches stay on Home.
 */
export const useFirstRunRedirect = (status: SetupStatus | null) => {
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (status === 'first-run' && !redirectedRef.current) {
      redirectedRef.current = true;
      router.push('/onboarding');
    }
  }, [router, status]);
};
