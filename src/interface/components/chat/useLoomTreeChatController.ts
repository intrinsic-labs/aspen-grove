import { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { useTextPrompt } from '@/interface/ui/components/text-prompt/useTextPrompt';
import { canSubmitComposer } from './composer/can-submit-composer';
import { toComposerMode } from './composer/composer-mode';
import { useComposerDraft } from './composer/useComposerDraft';
import { useComposerFocus } from './composer/useComposerFocus';
import { useEditNode } from './composer/useEditNode';
import { useAutoTreeTitle } from './header-actions/useAutoTreeTitle';
import { useFirstMessageTreeTitle } from './header-actions/useFirstMessageTreeTitle';
import { useChatSheets } from './header-actions/useChatSheets';
import { useTreeExports } from './header-actions/useTreeExports';
import { useTreeTitle } from './header-actions/useTreeTitle';
import { useContinuationGestures } from './node-actions/useContinuationGestures';
import { useMessageActions } from './node-actions/useMessageActions';
import { useNodeActions } from './node-actions/useNodeActions';
import { useRetraceBranch } from './node-actions/useRetraceBranch';
import { useRewindToNode } from './node-actions/useRewindToNode';
import { renameBookmarkPrompt } from './node-sheet/bookmark-menu';
import { useNodeSheet } from './node-sheet/useNodeSheet';
import { useRouteNodeSheet } from './node-sheet/useRouteNodeSheet';
import { useParallelRail } from './parallel/useParallelRail';
import { useChatReadAloud } from './read-aloud/useChatReadAloud';
import { useReadAloudTaps } from './read-aloud/useReadAloudTaps';
import { toDialogueRouteParams } from './route-params';
import { useChatAutoScroll } from './scroll/useChatAutoScroll';
import { useChatSessionLoader } from './session/useChatSessionLoader';
import { useChatSessionState } from './session/useChatSessionState';
import { useEphemeralTreeState } from './session/useEphemeralTreeState';
import { useRegenerateFromNode } from './turns/useRegenerateFromNode';
import { useProviderErrorNotice } from './turns/useProviderErrorNotice';
import { useSendFirstMessage } from './turns/useSendFirstMessage';
import { useSendTurn } from './turns/useSendTurn';
import { useStopGeneration } from './turns/useStopGeneration';
import { useTreeMenuSheets } from './tree-menu/useTreeMenuSheets';
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
 * route-driven node sheet, tap-timer cleanup).
 */
export const useLoomTreeChatController = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { repositories, adapters, useCases } = useAppServices();

  const routeParams = useLocalSearchParams<{
    treeId?: string | string[];
    autofocus?: string | string[];
    ephemeral?: string | string[];
    nodeSheetId?: string | string[];
  }>();
  const { treeIdParam, shouldAutofocus, shouldDeleteEmptyOnBlur, nodeSheetId } =
    toDialogueRouteParams(routeParams);

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
  const providerError = useProviderErrorNotice({ error, setError });
  const textPrompt = useTextPrompt();
  const title = useTreeTitle({
    navigation,
    treeRepo: repositories.treeRepo,
    sessionTreeId: session?.treeId,
    activeTreeIdRef,
    prompt: textPrompt.prompt,
    setError,
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
  const titleFromFirstMessage = useFirstMessageTreeTitle({
    treeId: session?.treeId,
    titleTreeFromFirstMessageUseCase: useCases.titleTreeFromFirstMessageUseCase,
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
    shouldAutoScrollRef,
    focusComposerAtEnd,
  });

  const regenerateFromNode = useRegenerateFromNode({
    session,
    sending: generating,
    setSending,
    setError,
    showProviderError: providerError.showProviderError,
    rows,
    setRows: state.setRows,
    getRowById: nodeActions.getRowById,
    shouldAutoScrollRef,
    streaming,
    stopGeneration: stopGeneration.run,
    continuations,
    refreshRows,
    refreshRowsAndContinuations,
    edgeRepo: repositories.edgeRepo,
    credentialStore: adapters.credentialStore,
    onModelNodeCompleted: readAloud.readGeneratedNodeAloud,
    generateDialogueContinuationUseCase:
      useCases.generateDialogueContinuationUseCase,
  });
  const { onSend, sendPrompt } = useSendTurn({
    session,
    sending: generating,
    setSending,
    setError,
    showProviderError: providerError.showProviderError,
    input,
    setInput,
    editTarget,
    setEditTarget,
    shouldAutoScrollRef,
    streaming,
    stopGeneration: stopGeneration.run,
    markAsNonEphemeral,
    refreshRowsAndContinuations,
    maybeGenerateTreeTitle,
    titleFromFirstMessage,
    credentialStore: adapters.credentialStore,
    onModelNodeCompleted: readAloud.readGeneratedNodeAloud,
    editDialogueNodeUseCase: useCases.editDialogueNodeUseCase,
    sendDialogueTurnUseCase: useCases.sendDialogueTurnUseCase,
  });

  const activePathNodeIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const nodeSheet = useNodeSheet({
    rewindToNode,
    retraceBranch,
    copyNodeText: nodeActions.copyNodeText,
    toggleBookmark: nodeActions.toggleBookmark,
    togglePrune: nodeActions.togglePrune,
    startEditForNode,
    renameBookmark: async (nodeId, label) => {
      const next = await textPrompt.prompt(renameBookmarkPrompt(label));
      if (next !== null) {
        await nodeActions.renameBookmark(nodeId, next);
      }
    },
  });
  const openNodeSheet = nodeSheet.open;
  const openNodeInfo = useCallback(
    (nodeId: ULID) => openNodeSheet(nodeId, 'info'),
    [openNodeSheet]
  );
  const openContinuationSheet = useCallback(
    (nodeId: ULID) => openNodeSheet(nodeId, 'continuation'),
    [openNodeSheet]
  );
  useRouteNodeSheet({
    nodeSheetId,
    ready: !loading && session !== null,
    openNodeInfo,
  });

  const { onMessageAction, onNodeTap: toggleRailForNode } = useMessageActions({
    continuations,
    regenerateFromNode,
    startEditForNode,
    rewindToNode,
    copyNodeText: nodeActions.copyNodeText,
    openNodeInfo,
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
      retraceBranch,
      copyNodeText: nodeActions.copyNodeText,
      openContinuationSheet,
    });

  const treeId = session?.treeId ?? activeTreeIdRef.current;
  const sheets = useChatSheets({
    treeId,
    onSessionInvalidated: reinitializeSession,
  });
  const menuSheets = useTreeMenuSheets({
    treeId,
    treeRepo: repositories.treeRepo,
    nodeRepo: repositories.nodeRepo,
    exportTree: exports.exportTree,
    setError,
    refreshKey: rows,
  });
  const composerMode = toComposerMode(editTarget, session?.model?.agentName);
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
    error,
    errorAction: providerError.errorAction,
    onErrorAction: () => router.push('/connections'),
    input,
    setInput,
    rows,
    streamingAssistantText: streaming.streamingText,
    onSend,
    // A send or regenerate is streaming and can be stopped from the composer.
    canStop: stopGeneration.stoppable,
    stopping: stopGeneration.stopping,
    onStop: stopGeneration.stop,
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
      cards: parallelRail.cards,
      streamingModelLabel: session?.model?.modelIdentifier ?? '',
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
    bookmarks: menuSheets.bookmarks,
    openBookmark: (nodeId: ULID) => openNodeSheet(nodeId, 'bookmark'),
    nodeSheet: {
      target: nodeSheet.target,
      activePathNodeIds,
      close: nodeSheet.close,
      onDismissed: nodeSheet.onDismissed,
      onInfoAction: nodeSheet.onInfoAction,
      onContinuationAction: nodeSheet.onContinuationAction,
      onBookmarkAction: nodeSheet.onBookmarkAction,
    },
    dialogueSettings: sheets.dialogueSettings,
    editTitle: () => void title.editTreeTitle(),
    // Android's stand-in for the alerts with a text field.
    textPrompt: textPrompt.pending,
    description: menuSheets.description,
    exportSheet: menuSheets.exportSheet,
    exportPath: exports.exportPathMarkdown,
    tags: sheets.tags,
    scrollRef,
    inputRef,
    canSend: canSubmitComposer({
      generating,
      loading,
      needsAgent,
      isEditing: composerMode.isEditing,
      input,
    }),
    needsAgent,
    onChooseAgent: sheets.dialogueSettings.open,
    composerPlaceholder: composerMode.composerPlaceholder,
    sendLabel: composerMode.sendLabel,
    displayPreferences,
  };
};
