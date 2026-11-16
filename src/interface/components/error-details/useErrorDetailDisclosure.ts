import { useCallback, useState } from 'react';

/**
 * Show or hide a failure's technical detail. It follows the default (the
 * "Verbose Error Alerts" setting, which may load after first render) until
 * the person toggles it; from then on their choice holds. Remount (e.g. key
 * by the error) to start over for a new failure.
 */
export const useErrorDetailDisclosure = (expandedByDefault: boolean) => {
  const [choice, setChoice] = useState<boolean | null>(null);
  const shown = choice ?? expandedByDefault;
  const toggle = useCallback(
    () => setChoice((current) => !(current ?? expandedByDefault)),
    [expandedByDefault]
  );
  return { shown, toggle };
};
