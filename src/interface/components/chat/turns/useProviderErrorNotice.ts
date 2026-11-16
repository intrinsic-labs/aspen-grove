import { useCallback, useState } from 'react';
import {
  describeProviderError,
  type ProviderErrorAction,
  type ProviderErrorDescription,
} from '@application/services/llm';
import type { IUserPreferencesRepository } from '@application/repositories';
import type { SelectableProvider } from '@domain/entities';
import { useSavedLmStudioEndpoint } from './useSavedLmStudioEndpoint';

type UseProviderErrorNoticeInput = {
  readonly error: string | null;
  readonly setError: (error: string | null) => void;
  /** Where the LM Studio address is saved, to name it when it isn't answering. */
  readonly userPreferencesRepo: Pick<IUserPreferencesRepository, 'get'>;
};

/**
 * Shows a failed generation as a plain message plus the action that fixes
 * it (e.g. open Connections). The action is kept with the message it belongs
 * to, so any later `setError` (or clearing it) drops the action too; the
 * same goes for the technical detail offered behind "Details". An LM Studio
 * server that isn't answering is named by the address saved in Connections,
 * so the reader knows what to check.
 */
export const useProviderErrorNotice = ({
  error,
  setError,
  userPreferencesRepo,
}: UseProviderErrorNoticeInput) => {
  const lmstudioEndpointRef = useSavedLmStudioEndpoint(userPreferencesRepo);
  const [described, setDescribed] = useState<ProviderErrorDescription | null>(
    null
  );

  const showProviderError = useCallback(
    (caught: unknown, provider?: SelectableProvider) => {
      const description = describeProviderError(caught, {
        provider,
        lmstudioEndpoint: lmstudioEndpointRef.current,
      });
      setDescribed(description);
      setError(description.message);
    },
    [lmstudioEndpointRef, setError]
  );

  const current = described && described.message === error ? described : null;
  const errorAction: ProviderErrorAction = current ? current.action : null;
  const errorDetail: string | undefined = current?.detail;

  return { showProviderError, errorAction, errorDetail };
};
