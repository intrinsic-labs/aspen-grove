import { useCallback, useState } from 'react';

/**
 * Show or hide a failure's technical detail. It follows the default (the
 * "Verbose Error Alerts" setting, which may load after first render) until
 * the person toggles it; from then on their choice holds, until `resetKey`
 * changes: pass something that changes with each new failure (a card that
 * keeps its slot across runs passes its status), and the default applies
 * again. Without one, remount to start over.
 */
export const useErrorDetailDisclosure = (
  expandedByDefault: boolean,
  resetKey?: string
) => {
  const [choice, setChoice] = useState<{
    readonly key: string | undefined;
    readonly shown: boolean;
  } | null>(null);
  const current = choice && choice.key === resetKey ? choice : null;
  const shown = current?.shown ?? expandedByDefault;
  const toggle = useCallback(
    () =>
      setChoice((previous) => {
        const base =
          previous && previous.key === resetKey
            ? previous.shown
            : expandedByDefault;
        return { key: resetKey, shown: !base };
      }),
    [expandedByDefault, resetKey]
  );
  return { shown, toggle };
};
