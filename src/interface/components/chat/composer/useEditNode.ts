import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type { INodeRepository } from '@application/repositories';
import type { ULID } from '@domain/value-objects';
import { contentToDisplayText } from '../node-text';
import type { ChatRow, ChatSession } from '../types';
import type { useNodeContinuations } from '../useNodeContinuations';
import type { EditTarget } from './composer-mode';

type UseEditNodeInput = {
  readonly session: ChatSession | null;
  readonly editNodeId: string | undefined;
  readonly editRequestId: string | undefined;
  readonly getRowById: (nodeId: ULID) => ChatRow | undefined;
  readonly nodeRepo: Pick<INodeRepository, 'findById'>;
  readonly continuations: Pick<ReturnType<typeof useNodeContinuations>, 'hide'>;
  readonly setInput: (text: string) => void;
  readonly shouldAutoScrollRef: MutableRefObject<boolean>;
  readonly focusComposerAtEnd: () => void;
};

/**
 * Edit-as-branch, composer side: loads a node's text into the composer and
 * remembers which node the next send edits. Also starts an edit requested
 * by the route (`editNodeId`, from the node detail sheet), once per request.
 */
export const useEditNode = ({
  session,
  editNodeId,
  editRequestId,
  getRowById,
  nodeRepo,
  continuations,
  setInput,
  shouldAutoScrollRef,
  focusComposerAtEnd,
}: UseEditNodeInput) => {
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const handledEditRequestRef = useRef<string | null>(null);

  const startEditForNode = useCallback(
    async (targetNodeId: ULID) => {
      // Prefer the already-loaded row; fall back to the repo so edits can
      // start from nodes that aren't on the active path (detail sheet).
      let localId: string;
      let text: string;
      const row = getRowById(targetNodeId);
      if (row) {
        localId = row.localId;
        text = row.text;
      } else {
        const node = await nodeRepo.findById(targetNodeId, true);
        if (!node) {
          return;
        }
        localId = String(node.localId);
        text = contentToDisplayText(node.content);
      }

      setEditTarget({
        nodeId: targetNodeId,
        localId,
      });
      setInput(text);
      continuations.hide();
      shouldAutoScrollRef.current = true;

      focusComposerAtEnd();
    },
    [
      continuations,
      focusComposerAtEnd,
      getRowById,
      nodeRepo,
      setInput,
      shouldAutoScrollRef,
    ]
  );

  useEffect(() => {
    if (!editNodeId || !session) {
      return;
    }

    const requestKey = editRequestId ?? editNodeId;
    if (handledEditRequestRef.current === requestKey) {
      return;
    }

    handledEditRequestRef.current = requestKey;
    void startEditForNode(editNodeId as ULID);
  }, [editNodeId, editRequestId, session, startEditForNode]);

  return { editTarget, setEditTarget, startEditForNode };
};
