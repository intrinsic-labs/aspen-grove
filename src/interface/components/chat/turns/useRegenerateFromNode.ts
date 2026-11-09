import { useCallback, type MutableRefObject } from 'react';
import type { IEdgeRepository } from '@application/repositories';
import type { ICredentialStore } from '@application/services/security';
import type { GenerateDialogueContinuationUseCase } from '@application/use-cases';
import type { ULID } from '@domain/value-objects';
import { toGenerationErrorMessage } from '../error-message';
import { getProviderApiKey } from '../provider-key';
import { NEEDS_AGENT_MESSAGE } from '../session/session-model';
import type { ChatRow, ChatSession } from '../types';
import type { useNodeContinuations } from '../useNodeContinuations';
import type { useStreamingAssistantRow } from '../useStreamingAssistantRow';
import {
  countRowsKeptForRegenerate,
  findRegenerateSourceNodeId,
} from './regenerate-plan';
import {
  createStreamDiagnostics,
  logStreamDiagnostics,
} from './stream-diagnostics';

type UseRegenerateFromNodeInput = {
  readonly session: ChatSession | null;
  readonly sending: boolean;
  readonly setSending: (sending: boolean) => void;
  readonly setError: (error: string | null) => void;
  readonly rows: readonly ChatRow[];
  readonly setRows: (
    update: (current: readonly ChatRow[]) => readonly ChatRow[]
  ) => void;
  readonly getRowById: (nodeId: ULID) => ChatRow | undefined;
  readonly shouldAutoScrollRef: MutableRefObject<boolean>;
  readonly streaming: Pick<
    ReturnType<typeof useStreamingAssistantRow>,
    'appendDelta' | 'reset'
  >;
  readonly continuations: Pick<ReturnType<typeof useNodeContinuations>, 'hide'>;
  readonly refreshRows: (session: ChatSession) => Promise<void>;
  readonly refreshRowsAndContinuations: (session: ChatSession) => Promise<void>;
  readonly edgeRepo: Pick<IEdgeRepository, 'findContinuationsByTargetNodeId'>;
  readonly credentialStore: ICredentialStore;
  /** A model response finished generating uninterrupted (Voice Mode reads it). */
  readonly onModelNodeCompleted: (nodeId: ULID) => void;
  readonly generateDialogueContinuationUseCase: Pick<
    GenerateDialogueContinuationUseCase,
    'execute'
  >;
};

/**
 * Regenerate from a node: streams a new continuation into the path in
 * place of the old one, which stays on the tree as a branch.
 */
export const useRegenerateFromNode = ({
  session,
  sending,
  setSending,
  setError,
  rows,
  setRows,
  getRowById,
  shouldAutoScrollRef,
  streaming,
  continuations,
  refreshRows,
  refreshRowsAndContinuations,
  edgeRepo,
  credentialStore,
  onModelNodeCompleted,
  generateDialogueContinuationUseCase,
}: UseRegenerateFromNodeInput) => {
  const { appendDelta, reset } = streaming;

  return useCallback(
    async (targetNodeId: ULID) => {
      if (!session || sending) {
        return;
      }
      const model = session.model;
      if (!model) {
        setError(NEEDS_AGENT_MESSAGE);
        return;
      }

      try {
        setSending(true);
        setError(null);
        shouldAutoScrollRef.current = true;
        reset();
        continuations.hide();

        // Regenerating a model response means generating a SIBLING: the
        // source is the response's parent, so the old response leaves the
        // active path (it remains reachable as a branch) and the new one
        // streams in its place. Regenerating from a human node continues
        // from that node directly.
        let sourceNodeId = targetNodeId;
        const row = getRowById(targetNodeId);
        if (row?.authorType === 'model') {
          const incoming =
            await edgeRepo.findContinuationsByTargetNodeId(targetNodeId);
          sourceNodeId = findRegenerateSourceNodeId(incoming) ?? sourceNodeId;
        }

        // No path rewind here: the use case resolves the context path from
        // the source node itself and replaces the path suffix on activation.
        // We only trim the local rows so the regenerated message (and
        // anything after it) disappears while everything before it stays
        // untouched — the new response then streams into the gap.
        const keepCount = countRowsKeptForRegenerate(rows, targetNodeId);
        if (keepCount !== null) {
          setRows((current) => current.slice(0, keepCount));
        }

        // Provider is bound to this session's agent (via tree.defaultModelAgentId).
        // Fetch the matching API key from secure storage.
        const providerApiKey = await getProviderApiKey(
          credentialStore,
          model.provider
        );
        const diagnostics = createStreamDiagnostics();
        const result = await generateDialogueContinuationUseCase.execute({
          session: {
            ownerAgentId: session.ownerAgentId,
            modelAgentId: model.modelAgentId,
            modelIdentifier: model.modelIdentifier,
            treeId: session.treeId,
            pathId: session.pathId,
          },
          sourceNodeId,
          providerApiKey,
          providerAppName: 'Aspen Grove RN',
          stream: true,
          activateGeneratedNode: true,
          onAssistantTextDelta: async ({ delta }) => {
            diagnostics.recordDelta();
            appendDelta(delta);
          },
        });

        logStreamDiagnostics('regenerate', diagnostics);

        await refreshRowsAndContinuations({
          ...session,
          activeNodeId: result.assistantNodeId,
        });
        reset();

        if (result.completion.interruptionReason) {
          setError(
            `Stream interrupted (${result.completion.interruptionReason}). Saved partial response.`
          );
        } else {
          onModelNodeCompleted(result.assistantNodeId);
        }
      } catch (caught) {
        setError(toGenerationErrorMessage(caught));
        // Rows were trimmed optimistically; reload from the (unchanged)
        // path so the old response reappears after a failed regenerate.
        await refreshRows(session);
      } finally {
        reset();
        setSending(false);
      }
    },
    [
      appendDelta,
      continuations,
      credentialStore,
      edgeRepo,
      generateDialogueContinuationUseCase,
      getRowById,
      onModelNodeCompleted,
      refreshRows,
      refreshRowsAndContinuations,
      reset,
      rows,
      sending,
      session,
      setError,
      setRows,
      setSending,
      shouldAutoScrollRef,
    ]
  );
};
