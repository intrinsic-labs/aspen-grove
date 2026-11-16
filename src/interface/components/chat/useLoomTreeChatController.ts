import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useNavigation } from 'expo-router/react-navigation';
import { useAppServices } from '@interface/composition';
import { useTextPrompt } from '@/interface/ui/components/text-prompt/useTextPrompt';
import { toComposerView } from './composer/composer-view';
import { useComposerDraft } from './composer/useComposerDraft';
import { useComposerFocus } from './composer/useComposerFocus';
import { useEditNode } from './composer/useEditNode';
import { useTreeAutoTitles } from './header-actions/useTreeAutoTitles';
import { useTreeExports } from './header-actions/useTreeExports';
import { useTreeTitle } from './header-actions/useTreeTitle';
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
import { useEphemeralTreeState } from './session/useEphemeralTreeState';
import { useRegenerateFromNode } from './turns/useRegenerateFromNode';
import { useProviderErrorNotice } from './turns/useProviderErrorNotice';
import { useSendFirstMessage } from './turns/useSendFirstMessage';
import { useSendTurn } from './turns/useSendTurn';
import { useStopGeneration } from './turns/useStopGeneration';
import { useBookmarksRefreshKey } from './tree-menu/useBookmarksRefreshKey';
import { useChatMenus } from './tree-menu/useChatMenus';
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
 * route-driven node sheet, tap-timer cleanup).
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
  const bookmarks = useBookmarksRefreshKey(rows);
  const continuations = useNodeContinuations({
    edgeRepo: repositories.edgeRepo,
    nodeRepo: repositories.nodeRepo,
    pathRepo: repositories.pathRepo,
    rawApiResponseRepo: repositories.rawApiResponseRepo,
    agentRepo: repositories.agentRepo,
    pathId: session?.pathId,
    onBookmarkChanged: bookmarks.bookmarksChanged,
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
  });

  const { refreshRows, refreshRowsAndContinuations } = useChatSessionLoader({
    ...state, // session, activeTreeIdRef and the setters
    treeIdParam,
    repositories,
    navigation,
    continuationSourceNodeId: continuations.sourceNodeId,
    showContinuationsForNode: continuations.showForNode,
    resetEphemeralState,
    applyTreeTitle: title.applyTreeTitle,
  });

  const { maybeGenerateTreeTitle, titleFromFirstMessage } = useTreeAutoTitles({
    session,
    nodeRepo: repositories.nodeRepo,
    credentialStore: adapters.credentialStore,
    generateTreeTitleUseCase: useCases.generateTreeTitleUseCase,
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

  // What a send and a regenerate share.
  const turnBase = {
    session,
    sending: generating,
    setSending,
    setError,
    showProviderError: providerError.showProviderError,
    shouldAutoScrollRef: scroll.shouldAutoScrollRef,
    streaming,
    stopGeneration: stopGeneration.run,
    refreshRowsAndContinuations,
    credentialStore: adapters.credentialStore,
    onModelNodeCompleted: readAloud.readGeneratedNodeAloud,
  };
  const regenerateFromNode = useRegenerateFromNode({
    ...turnBase,
    rows,
    setRows: state.setRows,
    getRowById: nodeActions.getRowById,
    continuations,
    refreshRows,
    edgeRepo: repositories.edgeRepo,
    generateDialogueContinuationUseCase:
      useCases.generateDialogueContinuationUseCase,
  });
  const { onSend, sendPrompt } = useSendTurn({
    ...turnBase,
    input,
    setInput,
    editTarget,
    setEditTarget,
    markAsNonEphemeral,
    maybeGenerateTreeTitle,
    titleFromFirstMessage,
    editDialogueNodeUseCase: useCases.editDialogueNodeUseCase,
    sendDialogueTurnUseCase: useCases.sendDialogueTurnUseCase,
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

  const menus = useChatMenus({
    treeId: session?.treeId ?? activeTreeIdRef.current,
    router,
    treeRepo: repositories.treeRepo,
    nodeRepo: repositories.nodeRepo,
    exportTree: exports.exportTree,
    setError,
    refreshKey: bookmarks.refreshKey,
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
    error,
    errorAction: providerError.errorAction,
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
    bookmarks: menus.bookmarks,
    openBookmark: interactions.openBookmark,
    nodeSheet: interactions.nodeSheetView,
    openModelSettings: menus.openModelSettings,
    editTitle: () => void title.editTreeTitle(),
    // Android's stand-in for the alerts with a text field.
    textPrompt: textPrompt.pending,
    description: menus.description,
    exportSheet: menus.exportSheet,
    exportPath: exports.exportPathMarkdown,
    tags: menus.tags,
    scrollRef: scroll.scrollRef,
    inputRef,
    onChooseAgent: menus.openModelSettings,
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
