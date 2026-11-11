import { useCallback, type MutableRefObject } from 'react';
import type { ICredentialStore } from '@application/services/security';
import type {
  EditDialogueNodeUseCase,
  SendDialogueTurnUseCase,
} from '@application/use-cases';
import type { SelectableProvider } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { EditTarget } from '../composer/composer-mode';
import { getProviderApiKey } from '../provider-key';
import { NEEDS_AGENT_MESSAGE, toTurnSession } from '../session/session-model';
import type { ChatSession } from '../types';
import type { useStreamingAssistantRow } from '../useStreamingAssistantRow';
import {
  createStreamDiagnostics,
  logStreamDiagnostics,
} from './stream-diagnostics';
import { interruptionNotice, isStoppedBeforeText } from './stopped-generation';
import type { StopGeneration } from './useStopGeneration';

type UseSendTurnInput = {
  readonly session: ChatSession | null;
  readonly sending: boolean;
  readonly setSending: (sending: boolean) => void;
  readonly setError: (error: string | null) => void;
  /** Shows a failed generation, with the fix when there is one. */
  readonly showProviderError: (
    caught: unknown,
    provider?: SelectableProvider
  ) => void;
  readonly input: string;
  readonly setInput: (text: string) => void;
  readonly editTarget: EditTarget | null;
  readonly setEditTarget: (target: EditTarget | null) => void;
  readonly shouldAutoScrollRef: MutableRefObject<boolean>;
  readonly streaming: Pick<
    ReturnType<typeof useStreamingAssistantRow>,
    'appendDelta' | 'reset'
  >;
  /** The composer's stop button for the reply. */
  readonly stopGeneration: StopGeneration;
  readonly markAsNonEphemeral: () => void;
  readonly refreshRowsAndContinuations: (session: ChatSession) => Promise<void>;
  readonly maybeGenerateTreeTitle: (
    userText: string,
    assistantNodeId: ULID
  ) => void;
  /** Names an untitled tree from the message just sent. */
  readonly titleFromFirstMessage: (text: string) => void;
  readonly credentialStore: ICredentialStore;
  /** A model response finished generating uninterrupted (Voice Mode reads it). */
  readonly onModelNodeCompleted: (nodeId: ULID) => void;
  readonly editDialogueNodeUseCase: Pick<EditDialogueNodeUseCase, 'execute'>;
  readonly sendDialogueTurnUseCase: Pick<SendDialogueTurnUseCase, 'execute'>;
};

/**
 * The composer's Send: saves an edit as a new sibling node when editing,
 * otherwise commits the user's turn and streams the model's reply.
 */
export const useSendTurn = ({
  session,
  sending,
  setSending,
  setError,
  showProviderError,
  input,
  setInput,
  editTarget,
  setEditTarget,
  shouldAutoScrollRef,
  streaming,
  stopGeneration,
  markAsNonEphemeral,
  refreshRowsAndContinuations,
  maybeGenerateTreeTitle,
  titleFromFirstMessage,
  credentialStore,
  onModelNodeCompleted,
  editDialogueNodeUseCase,
  sendDialogueTurnUseCase,
}: UseSendTurnInput) => {
  const { appendDelta, reset } = streaming;

  return useCallback(async () => {
    if (sending || !session) {
      return;
    }

    const prompt = input.trim();
    if (!prompt) {
      return;
    }
    // Saving an edit generates nothing; a new turn needs the tree's agent.
    const model = session.model;
    if (!editTarget && !model) {
      setError(NEEDS_AGENT_MESSAGE);
      return;
    }

    let signal: AbortSignal | undefined;
    try {
      setSending(true);
      setError(null);
      shouldAutoScrollRef.current = true;
      setInput('');
      reset();

      if (editTarget) {
        const result = await editDialogueNodeUseCase.execute({
          session: {
            ownerAgentId: session.ownerAgentId,
            treeId: session.treeId,
            pathId: session.pathId,
          },
          targetNodeId: editTarget.nodeId,
          editedText: prompt,
        });

        markAsNonEphemeral();
        setEditTarget(null);
        await refreshRowsAndContinuations({
          ...session,
          activeNodeId: result.editedNodeId,
        });
        return;
      }

      if (!model) {
        return;
      }
      signal = stopGeneration.begin();
      // Provider is bound to this session's agent (via tree.defaultModelAgentId).
      // Fetch the matching API key from secure storage.
      const providerApiKey = await getProviderApiKey(
        credentialStore,
        model.provider
      );
      const diagnostics = createStreamDiagnostics();
      const turnResult = await sendDialogueTurnUseCase.execute({
        session: toTurnSession(session, model),
        prompt,
        providerApiKey,
        providerAppName: 'Aspen Grove RN',
        stream: true,
        signal,
        onUserNodeCommitted: async ({ userNodeId }) => {
          markAsNonEphemeral();
          titleFromFirstMessage(prompt);
          await refreshRowsAndContinuations({
            ...session,
            activeNodeId: userNodeId,
          });
        },
        onAssistantTextDelta: async ({ delta }) => {
          diagnostics.recordDelta();
          appendDelta(delta);
        },
      });

      logStreamDiagnostics('send', diagnostics);

      await refreshRowsAndContinuations({
        ...session,
        activeNodeId: turnResult.assistantNodeId,
      });
      // Clear the transient streaming row now that the committed node is in
      // `rows` — leaving it set rendered the response twice until remount.
      reset();

      maybeGenerateTreeTitle(prompt, turnResult.assistantNodeId);

      // A stopped reply keeps its text, marked stopped, and isn't read aloud.
      const reason = turnResult.completion.interruptionReason;
      const notice = interruptionNotice(reason);
      if (notice) {
        setError(notice);
      } else if (!reason) {
        onModelNodeCompleted(turnResult.assistantNodeId);
      }
    } catch (caught) {
      // Stopped before any text: the user's turn stays, with no reply.
      if (!isStoppedBeforeText(signal, caught)) {
        showProviderError(caught, session.model?.provider);
      }
    } finally {
      stopGeneration.end(signal);
      reset();
      setSending(false);
    }
  }, [
    appendDelta,
    credentialStore,
    editDialogueNodeUseCase,
    editTarget,
    input,
    markAsNonEphemeral,
    maybeGenerateTreeTitle,
    titleFromFirstMessage,
    onModelNodeCompleted,
    refreshRowsAndContinuations,
    reset,
    sendDialogueTurnUseCase,
    sending,
    session,
    setEditTarget,
    setError,
    setInput,
    showProviderError,
    setSending,
    shouldAutoScrollRef,
    stopGeneration,
  ]);
};
