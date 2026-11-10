import { useCallback, useState } from 'react';
import {
  describeProviderError,
  type ProviderErrorAction,
  type ProviderErrorDescription,
} from '@application/services/llm';
import type { SelectableProvider } from '@domain/entities';

type UseProviderErrorNoticeInput = {
  readonly error: string | null;
  readonly setError: (error: string | null) => void;
};

/**
 * Shows a failed generation as a plain message plus the action that fixes
 * it (e.g. open Connections). The action is kept with the message it belongs
 * to, so any later `setError` (or clearing it) drops the action too.
 */
export const useProviderErrorNotice = ({
  error,
  setError,
}: UseProviderErrorNoticeInput) => {
  const [described, setDescribed] = useState<ProviderErrorDescription | null>(
    null
  );

  const showProviderError = useCallback(
    (caught: unknown, provider?: SelectableProvider) => {
      const description = describeProviderError(caught, { provider });
      setDescribed(description);
      setError(description.message);
    },
    [setError]
  );

  const errorAction: ProviderErrorAction =
    described && described.message === error ? described.action : null;

  return { showProviderError, errorAction };
};
