import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useNavigation } from 'expo-router/react-navigation';
import { useAppServices } from '@interface/composition';
import { useTextPrompt } from '@/interface/ui/components/text-prompt/useTextPrompt';
import { toComposerView } from './composer/composer-view';
import { useComposerDraft } from './composer/useComposerDraft';
import { useComposerFocus } from './composer/useComposerFocus';
import { useEditNode } from './composer/useEditNode';
import { useTreeHeaderActions } from './header-actions/useTreeHeaderActions';
import { useChatNodeInteractions } from './node-actions/useChatNodeInteractions';
import { useNodeActions } from './node-actions/useNodeActions';
import { useRetraceBranch } from './node-actions/useRetraceBranch';
import { useRewindToNode } from './node-actions/useRewindToNode';
import { toContinuationRailView } from './parallel/continuation-rail-view';
import { useParallelRail } from './parallel/useParallelRail';
import { useChatReadAloud } from './read-aloud/useChatReadAloud';
import { useChatAutoScroll } from './scroll/useChatAutoScroll';
import { useChatSessionLoader } from './session/useChatSessionLoader';
import { useChatSessionState } from './session/useChatSessionState';
import { returnTreeDraftToHome } from './session/return-draft-to-home';
import { useEphemeralTreeState } from './session/useEphemeralTreeState';
import { useChatTurns } from './turns/useChatTurns';
import { useVerboseErrorAlerts } from '../error-details';
import { useProviderErrorNotice } from './turns/useProviderErrorNotice';
import { useSendFirstMessage } from './turns/useSendFirstMessage';
import { useStopGeneration } from './turns/useStopGeneration';
import { useDialogueDisplayPreferences } from './useDialogueDisplayPreferences';
import { useDialogueRouteParams } from './useDialogueRouteParams';
import { useNodeContinuations } from './useNodeContinuations';
import { useStreamingAssistantRow } from './useStreamingAssistantRow';

/**
 * The dialogue screen's controller: composes the chat's concerns (session,
 * composer, turns, node actions, header actions, scroll) into the one object
 * `LoomTreeChatView` renders from.
 *
 * Hook order is load-bearing: React runs effects in declaration order, and
 * this order matches the original single-file controller (draft sync,
 * ephemeral guard, session load, focus reload, auto-scroll, autofocus,
 * route-driven node sheet, tap-timer cleanup). The header's only effect,
 * the tree menu's bookmarks load, runs ahead of them; nothing waits on it.
 */
export const useLoomTreeChatController = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { repositories, adapters, useCases } = useAppServices();

  const { treeIdParam, shouldAutofocus, shouldDeleteEmptyOnBlur, nodeSheetId } =
    useDialogueRouteParams();

  const state = useChatSessionState();
  const { activeTreeIdRef, error, setError, rows, session } = state;
  const [sending, setSending] = useState(false);
  const providerError = useProviderErrorNotice({
    error,
    setError,
    userPreferencesRepo: repositories.userPreferencesRepo,
  });
  const verboseErrorAlerts = useVerboseErrorAlerts(
    repositories.userPreferencesRepo
  );
  const textPrompt = useTextPrompt();
  const header = useTreeHeaderActions({
    navigation,
    router,
    session,
    activeTreeIdRef,
    rows,
    prompt: textPrompt.prompt,
    setError,
    treeRepo: repositories.treeRepo,
    nodeRepo: repositories.nodeRepo,
    credentialStore: adapters.credentialStore,
    useCases,
  });

  const streaming = useStreamingAssistantRow();
  const stopGeneration = useStopGeneration();
  const continuations = useNodeContinuations({
    edgeRepo: repositories.edgeRepo,
    nodeRepo: repositories.nodeRepo,
    pathRepo: repositories.pathRepo,
    rawApiResponseRepo: repositories.rawApiResponseRepo,
    agentRepo: repositories.agentRepo,
    pathId: session?.pathId,
    onBookmarkChanged: header.bookmarksChanged,
  });
  const { preferences: displayPreferences, loaded: displayPreferencesLoaded } =
    useDialogueDisplayPreferences({
      userPreferencesRepo: repositories.userPreferencesRepo,
    });
  // Messages render once both are in, so they lay out once, in the reader's
  // own type size, rather than in the defaults and again a moment later.
  const loading = state.loading || !displayPreferencesLoaded;

  const { input, setInput, openExpandedComposer } = useComposerDraft({
    sessionTreeId: session?.treeId,
    activeTreeIdRef,
    treeIdParam,
    router,
  });

  const { markAsNonEphemeral, resetEphemeralState } = useEphemeralTreeState({
    shouldDeleteEmptyOnBlur,
    hasMessages: rows.length > 0,
    sessionTreeId: session?.treeId,
    fallbackTreeId: activeTreeIdRef.current,
    treeRepo: repositories.treeRepo,
    navigation,
    // An unsent draft goes back to Home rather than with the tree.
    onDiscard: returnTreeDraftToHome,
  });

  const { refreshRows, refreshRowsAndContinuations } = useChatSessionLoader({
    ...state, // session, activeTreeIdRef and the setters
    treeIdParam,
    repositories,
    navigation,
    continuationSourceNodeId: continuations.sourceNodeId,
    showContinuationsForNode: continuations.showForNode,
    resetEphemeralState,
    applyTreeTitle: header.applyTreeTitle,
  });

  const scroll = useChatAutoScroll({
    rows,
    loading,
    sending,
    streamingText: streaming.streamingText,
  });
  const { inputRef, focusComposerAtEnd } = useComposerFocus({
    shouldAutofocus,
    loading,
    session,
    scrollRef: scroll.scrollRef,
  });

  const nodeActions = useNodeActions({
    rows,
    session,
    nodeRepo: repositories.nodeRepo,
    refreshRowsAndContinuations,
  });
  const readAloud = useChatReadAloud({
    getRowById: nodeActions.getRowById,
    nodeRepo: repositories.nodeRepo,
  });
  const rewindToNode = useRewindToNode({
    session,
    sending,
    setSending,
    setError,
    shouldAutoScrollRef: scroll.shouldAutoScrollRef,
    continuations,
    refreshRows,
    switchDialoguePathUseCase: useCases.switchDialoguePathUseCase,
  });
  const parallelRail = useParallelRail({
    session,
    sending,
    continuations,
    refreshRows,
    credentialStore: adapters.credentialStore,
    userPreferencesRepo: repositories.userPreferencesRepo,
    continuationCountRepo: repositories.continuationCountRepo,
    generateParallelContinuationsUseCase:
      useCases.generateParallelContinuationsUseCase,
  });
  // A single generation waits while several stream, so the path and rows
  // aren't rebuilt under them. Making a card current (rewind) still works.
  const generating = sending || parallelRail.running;
  const retraceBranch = useRetraceBranch({
    rows,
    edgeRepo: repositories.edgeRepo,
    rewindToNode,
  });
  const { editTarget, setEditTarget, startEditForNode } = useEditNode({
    getRowById: nodeActions.getRowById,
    nodeRepo: repositories.nodeRepo,
    continuations,
    setInput,
    shouldAutoScrollRef: scroll.shouldAutoScrollRef,
    focusComposerAtEnd,
  });

  const { regenerateFromNode, onSend, sendPrompt } = useChatTurns({
    session,
    sending: generating,
    setSending,
    setError,
    showProviderError: providerError.showProviderError,
    shouldAutoScrollRef: scroll.shouldAutoScrollRef,
    streaming,
    stopGeneration: stopGeneration.run,
    refreshRows,
    refreshRowsAndContinuations,
    credentialStore: adapters.credentialStore,
    onModelNodeCompleted: readAloud.readGeneratedNodeAloud,
    rows,
    setRows: state.setRows,
    getRowById: nodeActions.getRowById,
    continuations,
    edgeRepo: repositories.edgeRepo,
    input,
    setInput,
    editTarget,
    setEditTarget,
    markAsNonEphemeral,
    maybeGenerateTreeTitle: header.maybeGenerateTreeTitle,
    titleFromFirstMessage: header.titleFromFirstMessage,
    useCases,
  });

  const interactions = useChatNodeInteractions({
    rows,
    nodeActions,
    continuations,
    rewindToNode,
    retraceBranch,
    startEditForNode,
    regenerateFromNode,
    prompt: textPrompt.prompt,
    readAloudTapOptions: readAloud.tapOptions,
    nodeSheetId,
    ready: !loading && session !== null,
  });

  // Loaded, but the tree has no agent to generate with.
  const needsAgent = !loading && session !== null && session.model === null;
  useSendFirstMessage({
    treeId: session?.treeId,
    loaded: !loading && session !== null,
    canGenerate: !needsAgent,
    sendPrompt,
    keepAsDraft: setInput,
  });

  return {
    loading,
    sending,
    /** A single reply or a parallel run is generating. */
    thinking: generating,
    error,
    errorAction: providerError.errorAction,
    errorDetail: providerError.errorDetail,
    /** Failure details start expanded ("Verbose Error Alerts"). */
    verboseErrorAlerts,
    onErrorAction: () => router.push('/connections'),
    input,
    setInput,
    rows,
    streamingAssistantText: streaming.streamingText,
    onSend,
    onMessageAction: interactions.onMessageAction,
    onMessageListScroll: scroll.onMessageListScroll,
    onComposerFocus: scroll.onComposerFocus,
    onExpandComposer: openExpandedComposer,
    onNodeTap: interactions.onNodeTap,
    speakingRow: readAloud.speakingRow,
    continuationRail: toContinuationRailView({
      continuations,
      parallelRail,
      streamingModelLabel: session?.model?.modelIdentifier ?? '',
      onSelect: interactions.onContinuationSelect,
      onMenuAction: interactions.onContinuationMenuAction,
    }),
    ...header.menu,
    openBookmark: interactions.openBookmark,
    nodeSheet: interactions.nodeSheetView,
    // Android's stand-in for the alerts with a text field.
    textPrompt: textPrompt.pending,
    scrollRef: scroll.scrollRef,
    inputRef,
    ...toComposerView({
      editTarget,
      agentName: session?.model?.agentName,
      generating,
      loading,
      needsAgent,
      input,
      stopGeneration,
      cancelEdit: () => {
        setEditTarget(null);
        setInput('');
      },
    }),
    displayPreferences,
  };
};
