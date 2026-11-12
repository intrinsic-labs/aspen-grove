import { useEffect, useRef } from 'react';
import { parseULID, type ULID } from '@domain/value-objects';

type UseRouteNodeSheetInput = {
  /** The route's `nodeSheetId` (a search result opens its tree on it). */
  readonly nodeSheetId: string | undefined;
  /** The tree has loaded, so the sheet's menu can act on its path. */
  readonly ready: boolean;
  readonly openNodeInfo: (nodeId: ULID) => void;
};

/** Opens the Node Info sheet the route asks for, once per request. */
export const useRouteNodeSheet = ({
  nodeSheetId,
  ready,
  openNodeInfo,
}: UseRouteNodeSheetInput) => {
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!nodeSheetId || !ready || handledRef.current === nodeSheetId) {
      return;
    }
    handledRef.current = nodeSheetId;
    let nodeId: ULID;
    try {
      nodeId = parseULID(nodeSheetId);
    } catch {
      return;
    }
    openNodeInfo(nodeId);
  }, [nodeSheetId, openNodeInfo, ready]);
};
