import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useAppServices } from '@interface/composition';
import { toComposerMode } from './composer/composer-mode';
import { useComposerDraft } from './composer/useComposerDraft';
import { useComposerFocus } from './composer/useComposerFocus';
import { useEditNode } from './composer/useEditNode';
import { useAutoTreeTitle } from './header-actions/useAutoTreeTitle';
import { useChatSheets } from './header-actions/useChatSheets';
import { useTreeExports } from './header-actions/useTreeExports';
import { useTreeTitle } from './header-actions/useTreeTitle';
import { useContinuationGestures } from './node-actions/useContinuationGestures';
import { useMessageActions } from './node-actions/useMessageActions';
import { useNodeActions } from './node-actions/useNodeActions';
import { useRewindToNode } from './node-actions/useRewindToNode';
import { useParallelRail } from './parallel/useParallelRail';
import { useChatReadAloud } from './read-aloud/useChatReadAloud';
import { useReadAloudTaps } from './read-aloud/useReadAloudTaps';
import { toDialogueRouteParams } from './route-params';
import { useChatAutoScroll } from './scroll/useChatAutoScroll';
import { useChatSessionLoader } from './session/useChatSessionLoader';
import { useChatSessionState } from './session/useChatSessionState';
import { useEphemeralTreeState } from './session/useEphemeralTreeState';
import { useRegenerateFromNode } from './turns/useRegenerateFromNode';
import { useSendTurn } from './turns/useSendTurn';
import { useDialogueDisplayPreferences } from './useDialogueDisplayPreferences';
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
 * route-driven edit, tap-timer cleanup).
 */
export const useLoomTreeChatController = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { repositories, adapters, useCases } = useAppServices();

  const routeParams = useLocalSearchParams<{
    treeId?: string | string[];
    autofocus?: string | string[];
    ephemeral?: string | string[];
    editNodeId?: string | string[];
    editRequestId?: string | string[];
  }>();
  const {
    treeIdParam,
    shouldAutofocus,
    shouldDeleteEmptyOnBlur,
    editNodeId,
    editRequestId,
  } = toDialogueRouteParams(routeParams);

  const state = useChatSessionState();
  const {
    activeTreeIdRef,
    loading: sessionLoading,
    error,
    setError,
    rows,
    session,
  } = state;
  const [sending, setSending] = useState(false);
  const title = useTreeTitle({
    navigation,
    treeRepo: repositories.treeRepo,
    sessionTreeId: session?.treeId,
    activeTreeIdRef,
  });

  const streaming = useStreamingAssistantRow();
  const continuations = useNodeContinuations({
    edgeRepo: repositories.edgeRepo,
    nodeRepo: repositories.nodeRepo,
    pathRepo: repositories.pathRepo,
    pathId: session?.pathId,
  });
  const { preferences: displayPreferences, loaded: displayPreferencesLoaded } =
    useDialogueDisplayPreferences({
      userPreferencesRepo: repositories.userPreferencesRepo,
    });
  // Messages render once both are in, so they lay out once, in the reader's
  // own type size, rather than in the defaults and again a moment later.
  const loading = sessionLoading || !displayPreferencesLoaded;

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
  });

  const { refreshRows, refreshRowsAndContinuations, reinitializeSession } =
    useChatSessionLoader({
      treeIdParam,
      repositories,
      navigation,
      session,
      activeTreeIdRef,
      setLoading: state.setLoading,
      setError,
      setRows: state.setRows,
      setSession: state.setSession,
      continuationSourceNodeId: continuations.sourceNodeId,
      showContinuationsForNode: continuations.showForNode,
      resetEphemeralState,
      applyTreeTitle: title.applyTreeTitle,
    });

  const maybeGenerateTreeTitle = useAutoTreeTitle({
    session,
    nodeRepo: repositories.nodeRepo,
    credentialStore: adapters.credentialStore,
    generateTreeTitleUseCase: useCases.generateTreeTitleUseCase,
    applyTreeTitle: title.applyTreeTitle,
  });
  const exports = useTreeExports({
    session,
    activeTreeIdRef,
    exportLoomTreeUseCase: useCases.exportLoomTreeUseCase,
    exportPathMarkdownUseCase: useCases.exportPathMarkdownUseCase,
    setError,
  });

  const {
    scrollRef,
    shouldAutoScrollRef,
    onMessageListScroll,
    onComposerFocus,
  } = useChatAutoScroll({
    rows,
    loading,
    sending,
    streamingText: streaming.streamingText,
  });
  const { inputRef, focusComposerAtEnd } = useComposerFocus({
    shouldAutofocus,
    loading,
    session,
    scrollRef,
  });

  const nodeActions = useNodeActions({
    rows,
    session,
    activeTreeIdRef,
    router,
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
    shouldAutoScrollRef,
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
    continuationCountRepo: repositories.continuationCountRepo,
    generateParallelContinuationsUseCase:
      useCases.generateParallelContinuationsUseCase,
  });
  // A single generation waits while several stream, so the path and rows
  // aren't rebuilt under them. Making a card current (rewind) still works.
  const generating = sending || parallelRail.running;
  const { editTarget, setEditTarget, startEditForNode } = useEditNode({
    session,
    editNodeId,
    editRequestId,
    getRowById: nodeActions.getRowById,
    nodeRepo: repositories.nodeRepo,
    continuations,
    setInput,
    shouldAutoScrollRef,
    focusComposerAtEnd,
  });

  const regenerateFromNode = useRegenerateFromNode({
    session,
    sending: generating,
    setSending,
    setError,
    rows,
    setRows: state.setRows,
    getRowById: nodeActions.getRowById,
    shouldAutoScrollRef,
    streaming,
    continuations,
    refreshRows,
    refreshRowsAndContinuations,
    edgeRepo: repositories.edgeRepo,
    credentialStore: adapters.credentialStore,
    onModelNodeCompleted: readAloud.readGeneratedNodeAloud,
    generateDialogueContinuationUseCase:
      useCases.generateDialogueContinuationUseCase,
  });
  const onSend = useSendTurn({
    session,
    sending: generating,
    setSending,
    setError,
    input,
    setInput,
    editTarget,
    setEditTarget,
    shouldAutoScrollRef,
    streaming,
    markAsNonEphemeral,
    refreshRowsAndContinuations,
    maybeGenerateTreeTitle,
    credentialStore: adapters.credentialStore,
    onModelNodeCompleted: readAloud.readGeneratedNodeAloud,
    editDialogueNodeUseCase: useCases.editDialogueNodeUseCase,
    sendDialogueTurnUseCase: useCases.sendDialogueTurnUseCase,
  });

  const { onMessageAction, onNodeTap: toggleRailForNode } = useMessageActions({
    continuations,
    regenerateFromNode,
    startEditForNode,
    rewindToNode,
    copyNodeText: nodeActions.copyNodeText,
    openNodeDetail: nodeActions.openNodeDetail,
    toggleBookmark: nodeActions.toggleBookmark,
    togglePrune: nodeActions.togglePrune,
  });
  const onNodeTap = useReadAloudTaps({
    onSingleTap: toggleRailForNode,
    ...readAloud.tapOptions,
  });
  const { onContinuationSelect, onContinuationMenuAction } =
    useContinuationGestures({
      continuations,
      rewindToNode,
      copyNodeText: nodeActions.copyNodeText,
      openNodeDetail: nodeActions.openNodeDetail,
    });

  const sheets = useChatSheets({
    treeId: session?.treeId ?? activeTreeIdRef.current,
    rewindToNode,
    openNodeDetail: nodeActions.openNodeDetail,
    onSessionInvalidated: reinitializeSession,
  });
  const composerMode = toComposerMode(editTarget);
  // Loaded, but the tree has no agent to generate with.
  const needsAgent = !loading && session !== null && session.model === null;

  return {
    loading,
    sending,
    error,
    input,
    setInput,
    rows,
    streamingAssistantText: streaming.streamingText,
    onSend,
    onMessageAction,
    onMessageListScroll,
    onComposerFocus,
    onCancelEdit: () => {
      setEditTarget(null);
      setInput('');
    },
    onExpandComposer: openExpandedComposer,
    isEditing: composerMode.isEditing,
    editLabel: composerMode.editLabel,
    onNodeTap,
    speakingRow: readAloud.speakingRow,
    continuationRail: {
      visible: continuations.visible,
      loading: continuations.loading,
      sourceNodeId: continuations.sourceNodeId,
      sourceLocalId: continuations.sourceLocalId,
      cards: parallelRail.cards,
      generation: {
        count: parallelRail.count,
        onChangeCount: parallelRail.setCount,
        canGenerate: parallelRail.canGenerate,
        running: parallelRail.runIsInRail,
        onGenerate: () => void parallelRail.generate(),
        onStopAll: parallelRail.stopAll,
      },
      onSelect: onContinuationSelect,
      onMenuAction: onContinuationMenuAction,
      onStopSlot: parallelRail.stop,
      error: continuations.error,
    },
    bookmarks: sheets.bookmarks,
    dialogueSettings: sheets.dialogueSettings,
    titleEditor: {
      visible: title.titleEditorVisible,
      title: title.treeTitle,
      open: () => title.setTitleEditorVisible(true),
      close: () => title.setTitleEditorVisible(false),
      save: title.saveTreeTitle,
    },
    exports,
    tags: sheets.tags,
    scrollRef,
    inputRef,
    canSend: !generating && !loading && !needsAgent && input.trim().length > 0,
    needsAgent,
    onChooseAgent: sheets.dialogueSettings.open,
    composerPlaceholder: composerMode.composerPlaceholder,
    sendLabel: composerMode.sendLabel,
    displayPreferences,
  };
};
