import { useCallback, type MutableRefObject } from 'react';
import type { SwitchDialoguePathUseCase } from '@application/use-cases';
import type { ULID } from '@domain/value-objects';
import { toErrorMessage } from '../error-message';
import type { ChatSession } from '../types';
import type { useNodeContinuations } from '../useNodeContinuations';

type UseRewindToNodeInput = {
  readonly session: ChatSession | null;
  readonly sending: boolean;
  readonly setSending: (sending: boolean) => void;
  readonly setError: (error: string | null) => void;
  readonly shouldAutoScrollRef: MutableRefObject<boolean>;
  readonly continuations: Pick<ReturnType<typeof useNodeContinuations>, 'hide'>;
  readonly refreshRows: (session: ChatSession) => Promise<void>;
  readonly switchDialoguePathUseCase: Pick<
    SwitchDialoguePathUseCase,
    'execute'
  >;
};

/**
 * Makes a node current: switches the active path to run through it
 * (rewind, retrace a branch, jump to a bookmark).
 */
export const useRewindToNode = ({
  session,
  sending,
  setSending,
  setError,
  shouldAutoScrollRef,
  continuations,
  refreshRows,
  switchDialoguePathUseCase,
}: UseRewindToNodeInput) =>
  useCallback(
    async (targetNodeId: ULID) => {
      if (!session || sending) {
        return;
      }
      try {
        setSending(true);
        setError(null);
        shouldAutoScrollRef.current = true;
        // Making a node current is a completed interaction: the rail closes
        // rather than lingering over the freshly switched path.
        continuations.hide();
        const result = await switchDialoguePathUseCase.execute({
          pathId: session.pathId,
          ownerAgentId: session.ownerAgentId,
          targetNodeId,
        });
        await refreshRows({
          ...session,
          activeNodeId: result.targetNodeId,
        });
      } catch (caught) {
        setError(toErrorMessage(caught));
      } finally {
        setSending(false);
      }
    },
    [
      continuations,
      refreshRows,
      sending,
      session,
      setError,
      setSending,
      shouldAutoScrollRef,
      switchDialoguePathUseCase,
    ]
  );
