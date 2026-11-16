import { useCallback, useRef } from 'react';
import type { ULID } from '@domain/value-objects';
import { useLatestCallback } from '@/interface/hooks/useLatestCallback';

/** How long after a long press its node ignores taps. */
const SUPPRESS_TAP_AFTER_LONG_PRESS_MS = 900;

/**
 * A node's tap handler that ignores the tap a long press ends with (the
 * context menu has already opened), plus the long-press hook that arms it.
 */
export const useSuppressedNodeTap = (onNodeTap: (nodeId: ULID) => void) => {
  const suppressTapUntilByNodeRef = useRef(new Map<string, number>());

  const suppressNextNodeTap = useCallback((nodeId: ULID) => {
    suppressTapUntilByNodeRef.current.set(
      nodeId,
      Date.now() + SUPPRESS_TAP_AFTER_LONG_PRESS_MS
    );
  }, []);

  const handleNodePress = useLatestCallback((nodeId: ULID) => {
    const suppressUntil = suppressTapUntilByNodeRef.current.get(nodeId);
    if (suppressUntil && suppressUntil > Date.now()) {
      return;
    }
    suppressTapUntilByNodeRef.current.delete(nodeId);
    onNodeTap(nodeId);
  });

  return { suppressNextNodeTap, handleNodePress };
};
