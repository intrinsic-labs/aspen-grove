import { useCallback, useState, type MutableRefObject } from 'react';
import type { INodeRepository } from '@application/repositories';
import type { ULID } from '@domain/value-objects';
import { contentToDisplayText } from '../node-text';
import type { ChatRow } from '../types';
import type { useNodeContinuations } from '../useNodeContinuations';
import type { EditTarget } from './composer-mode';

type UseEditNodeInput = {
  readonly getRowById: (nodeId: ULID) => ChatRow | undefined;
  readonly nodeRepo: Pick<INodeRepository, 'findById'>;
  readonly continuations: Pick<ReturnType<typeof useNodeContinuations>, 'hide'>;
  readonly setInput: (text: string) => void;
  readonly shouldAutoScrollRef: MutableRefObject<boolean>;
  readonly focusComposerAtEnd: () => void;
};

/**
 * Edit-as-branch, composer side: loads a node's text into the composer and
 * remembers which node the next send edits.
 */
export const useEditNode = ({
  getRowById,
  nodeRepo,
  continuations,
  setInput,
  shouldAutoScrollRef,
  focusComposerAtEnd,
}: UseEditNodeInput) => {
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const startEditForNode = useCallback(
    async (targetNodeId: ULID) => {
      // Prefer the already-loaded row; fall back to the repo so edits can
      // start from nodes that aren't on the active path (Node Info sheet).
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

  return { editTarget, setEditTarget, startEditForNode };
};
