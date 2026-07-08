import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import * as Clipboard from 'expo-clipboard';
import { LlmProviderError } from '@application/services/llm';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import type { ContinuationMenuAction } from './ContinuationRail';
import type { ChatMessageMenuAction } from './ChatMessageList';
import { getProviderApiKey } from './provider-key';
import {
  getDialogueDraft,
  setDialogueDraft,
  subscribeDialogueDraft,
} from './dialogue-draft-store';
import { toDialogueRouteParams } from './route-params';
import {
  initializeDialogueChatSession,
  loadDialogueRowsForPath,
} from './session-helpers';
import type { ChatSession } from './types';
import { useDeleteEphemeralTreeOnBack } from './useDeleteEphemeralTreeOnBack';
import { useDialogueDisplayPreferences } from './useDialogueDisplayPreferences';
import { useNodeContinuations } from './useNodeContinuations';
import { useStreamingAssistantRow } from './useStreamingAssistantRow';

export const useLoomTreeChatController = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const inputRef = useRef<TextInput>(null);
  const activeTreeIdRef = useRef<ULID | null>(null);
  const hasUserSentMessageRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const continuationLastTapRef = useRef<{
    readonly nodeId: ULID;
    readonly atMs: number;
  } | null>(null);
  const continuationTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const handledEditRequestRef = useRef<string | null>(null);
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

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof loadDialogueRowsForPath>>['rows']
  >([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [treeTitle, setTreeTitle] = useState('');
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    readonly nodeId: ULID;
    readonly localId: string;
  } | null>(null);
  const [dialogueSettingsVisible, setDialogueSettingsVisible] = useState(false);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [titleEditorVisible, setTitleEditorVisible] = useState(false);
  const {
    streamingText: streamingAssistantText,
    appendDelta: appendStreamingAssistantDelta,
    reset: resetStreamingAssistantRow,
  } = useStreamingAssistantRow();
  const continuations = useNodeContinuations({
    edgeRepo: repositories.edgeRepo,
    nodeRepo: repositories.nodeRepo,
    pathRepo: repositories.pathRepo,
    pathId: session?.pathId,
  });
  const displayPreferences = useDialogueDisplayPreferences({
    userPreferencesRepo: repositories.userPreferencesRepo,
  });
  const draftTreeId = session?.treeId ?? activeTreeIdRef.current ?? treeIdParam;

  useEffect(() => {
    if (!draftTreeId) {
      return undefined;
    }
    return subscribeDialogueDraft(draftTreeId, () => {
      const nextDraft = getDialogueDraft(draftTreeId);
      setInput((current) => (current === nextDraft ? current : nextDraft));
    });
  }, [draftTreeId]);

  useEffect(() => {
    setDialogueDraft(draftTreeId, input);
  }, [draftTreeId, input]);

  const markAsNonEphemeral = useCallback(() => {
    hasUserSentMessageRef.current = true;
    setHasUserSentMessage(true);
  }, []);

  const resetEphemeralState = useCallback(() => {
    hasUserSentMessageRef.current = false;
    setHasUserSentMessage(false);
  }, []);

  useDeleteEphemeralTreeOnBack({
    shouldDeleteEmptyOnBlur,
    hasUserSentMessage,
    sessionTreeId: session?.treeId,
    fallbackTreeId: activeTreeIdRef.current,
    treeRepo: repositories.treeRepo,
    navigation,
    onMarkAsNonEphemeral: markAsNonEphemeral,
  });

  const refreshRows = useCallback(
    async (nextSession: ChatSession) => {
      const nextRows = await loadDialogueRowsForPath(nextSession.pathId, {
        pathRepo: repositories.pathRepo,
        nodeRepo: repositories.nodeRepo,
        edgeRepo: repositories.edgeRepo,
      });
      setRows(nextRows.rows);
      setSession({
        ...nextSession,
        activeNodeId: nextRows.activeNodeId ?? nextSession.activeNodeId,
      });
    },
    [repositories.edgeRepo, repositories.nodeRepo, repositories.pathRepo]
  );

  const refreshRowsAndContinuations = useCallback(
    async (nextSession: ChatSession) => {
      await refreshRows(nextSession);
      if (continuations.sourceNodeId) {
        await continuations.showForNode(continuations.sourceNodeId);
      }
    },
    [continuations.showForNode, continuations.sourceNodeId, refreshRows]
  );

  const initializeSession = useCallback(
    async (options?: { readonly preserveEphemeralState?: boolean }) => {
      try {
        setLoading(true);
        setError(null);

        if (!treeIdParam) {
          throw new Error('Missing treeId route parameter');
        }

        const initialized = await initializeDialogueChatSession(treeIdParam, {
          treeRepo: repositories.treeRepo,
          groveRepo: repositories.groveRepo,
          agentRepo: repositories.agentRepo,
          pathRepo: repositories.pathRepo,
          pathStateRepo: repositories.pathStateRepo,
          nodeRepo: repositories.nodeRepo,
          userPreferencesRepo: repositories.userPreferencesRepo,
        });

        if (!options?.preserveEphemeralState) {
          resetEphemeralState();
        }
        activeTreeIdRef.current = initialized.treeId;

        setTreeTitle(initialized.treeTitle);
        navigation.setOptions({ title: initialized.treeTitle });

        const initializedSession: ChatSession = initialized.session;
        await refreshRows(initializedSession);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : String(caught);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [navigation, repositories, refreshRows, resetEphemeralState, treeIdParam]
  );

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!session) {
        return;
      }
      void refreshRowsAndContinuations(session);
    });

    return unsubscribe;
  }, [navigation, refreshRowsAndContinuations, session]);

  // Re-resolve the session after the ⚙️ sheet mutates the tree's agent or
  // system context. Preserves the ephemeral flag so an in-progress
  // conversation is never mistaken for an empty quick-add tree.
  const reinitializeSession = useCallback(async () => {
    await initializeSession({ preserveEphemeralState: true });
  }, [initializeSession]);

  const saveTreeTitle = useCallback(
    async (title: string) => {
      const treeId = session?.treeId ?? activeTreeIdRef.current;
      if (!treeId) {
        throw new Error('No active Loom Tree to rename.');
      }

      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        throw new Error('Title is required.');
      }

      const updated = await repositories.treeRepo.update({
        id: treeId,
        changes: { title: trimmedTitle },
      });

      setTreeTitle(updated.title);
      navigation.setOptions({ title: updated.title });
      setTitleEditorVisible(false);
    },
    [navigation, repositories.treeRepo, session?.treeId]
  );

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      return;
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [rows, loading, sending]);

  useEffect(() => {
    if (streamingAssistantText.length === 0) {
      return;
    }
    if (!shouldAutoScrollRef.current) {
      return;
    }
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [streamingAssistantText]);

  useEffect(() => {
    if (!shouldAutofocus || loading || !session) {
      return;
    }

    const timeoutId = setTimeout(() => {
      inputRef.current?.focus();
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 80);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loading, session, shouldAutofocus]);

  const getRowById = useCallback(
    (nodeId: ULID) => rows.find((row) => row.id === nodeId),
    [rows]
  );

  const copyNodeText = useCallback(
    async (nodeId: ULID) => {
      const row = getRowById(nodeId);
      if (row) {
        await Clipboard.setStringAsync(row.text);
        return;
      }

      const node = await repositories.nodeRepo.findById(nodeId, true);
      if (!node) {
        return;
      }

      const text =
        node.content.type === 'text'
          ? node.content.text
          : `[${node.content.type}]`;
      await Clipboard.setStringAsync(text);
    },
    [getRowById, repositories.nodeRepo]
  );

  const openNodeDetail = useCallback(
    (nodeId: ULID) => {
      const treeId = session?.treeId ?? activeTreeIdRef.current;
      if (!treeId) {
        return;
      }
      router.push({
        pathname: '/tree/[treeId]/node/[nodeId]',
        params: { treeId, nodeId },
      });
    },
    [router, session?.treeId]
  );

  const openExpandedComposer = useCallback(() => {
    const treeId = session?.treeId ?? activeTreeIdRef.current ?? treeIdParam;
    if (!treeId) {
      return;
    }
    setDialogueDraft(treeId, input);
    router.push({
      pathname: '/tree/[treeId]/compose',
      params: { treeId },
    });
  }, [input, router, session?.treeId, treeIdParam]);

  const toggleBookmark = useCallback(
    async (nodeId: ULID) => {
      const node = await repositories.nodeRepo.findById(nodeId, true);
      if (!node || !session) {
        return;
      }
      await repositories.nodeRepo.updateMetadata(nodeId, {
        bookmarked: !node.metadata.bookmarked,
      });
      await refreshRowsAndContinuations(session);
    },
    [refreshRowsAndContinuations, repositories.nodeRepo, session]
  );

  // Pruned nodes stay on the tree (and any path) but are excluded from
  // generation context by the context assembler.
  const togglePrune = useCallback(
    async (nodeId: ULID) => {
      const node = await repositories.nodeRepo.findById(nodeId, true);
      if (!node || !session) {
        return;
      }
      await repositories.nodeRepo.updateMetadata(nodeId, {
        pruned: !node.metadata.pruned,
      });
      await refreshRowsAndContinuations(session);
    },
    [refreshRowsAndContinuations, repositories.nodeRepo, session]
  );

  const rewindToNode = useCallback(
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
        const result = await useCases.switchDialoguePathUseCase.execute({
          pathId: session.pathId,
          ownerAgentId: session.ownerAgentId,
          targetNodeId,
        });
        await refreshRows({
          ...session,
          activeNodeId: result.targetNodeId,
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setSending(false);
      }
    },
    [
      continuations,
      refreshRows,
      sending,
      session,
      useCases.switchDialoguePathUseCase,
    ]
  );

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
        const node = await repositories.nodeRepo.findById(targetNodeId, true);
        if (!node) {
          return;
        }
        localId = String(node.localId);
        text =
          node.content.type === 'text'
            ? node.content.text
            : `[${node.content.type}]`;
      }

      setEditTarget({
        nodeId: targetNodeId,
        localId,
      });
      setInput(text);
      continuations.hide();
      shouldAutoScrollRef.current = true;

      requestAnimationFrame(() => {
        inputRef.current?.focus();
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    },
    [continuations, getRowById, repositories.nodeRepo]
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

  const regenerateFromNode = useCallback(
    async (targetNodeId: ULID) => {
      if (!session || sending) {
        return;
      }

      try {
        setSending(true);
        setError(null);
        shouldAutoScrollRef.current = true;
        resetStreamingAssistantRow();
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
            await repositories.edgeRepo.findContinuationsByTargetNodeId(
              targetNodeId
            );
          const primarySource =
            incoming[0]?.sources.find((source) => source.role === 'primary') ??
            incoming[0]?.sources[0];
          if (primarySource) {
            sourceNodeId = primarySource.nodeId;
          }
        }

        // No path rewind here: the use case resolves the context path from
        // the source node itself and replaces the path suffix on activation.
        // We only trim the local rows so the regenerated message (and
        // anything after it) disappears while everything before it stays
        // untouched — the new response then streams into the gap.
        const targetIndex = rows.findIndex(
          (candidate) => candidate.id === targetNodeId
        );
        if (targetIndex >= 0) {
          const keepCount =
            row?.authorType === 'model' ? targetIndex : targetIndex + 1;
          setRows((current) => current.slice(0, keepCount));
        }

        // Provider is bound to this session's agent (via tree.defaultModelAgentId).
        // Fetch the matching API key from secure storage.
        const providerApiKey = await getProviderApiKey(
          adapters.credentialStore,
          session.provider
        );
        const streamStartedAtMs = Date.now();
        let firstDeltaAtMs: number | null = null;
        let deltaCount = 0;
        const result =
          await useCases.generateDialogueContinuationUseCase.execute({
            session: {
              ownerAgentId: session.ownerAgentId,
              modelAgentId: session.modelAgentId,
              modelIdentifier: session.modelIdentifier,
              treeId: session.treeId,
              pathId: session.pathId,
            },
            sourceNodeId,
            providerApiKey,
            providerAppName: 'Aspen Grove RN',
            stream: true,
            activateGeneratedNode: true,
            onAssistantTextDelta: async ({ delta }) => {
              if (firstDeltaAtMs === null) {
                firstDeltaAtMs = Date.now();
              }
              deltaCount += 1;
              appendStreamingAssistantDelta(delta);
            },
          });

        if (__DEV__) {
          // Streaming health check: many deltas spread over time = healthy;
          // one or two deltas arriving at the end = transport is buffering.
          console.log('[stream-diagnostic] regenerate', {
            deltaCount,
            msToFirstDelta:
              firstDeltaAtMs === null
                ? null
                : firstDeltaAtMs - streamStartedAtMs,
            msTotal: Date.now() - streamStartedAtMs,
          });
        }

        await refreshRowsAndContinuations({
          ...session,
          activeNodeId: result.assistantNodeId,
        });
        resetStreamingAssistantRow();

        if (result.completion.interruptionReason) {
          setError(
            `Stream interrupted (${result.completion.interruptionReason}). Saved partial response.`
          );
        }
      } catch (caught) {
        const message =
          caught instanceof LlmProviderError
            ? `[${caught.provider}:${caught.code}] ${caught.message}`
            : caught instanceof Error
              ? caught.message
              : String(caught);
        setError(message);
        // Rows were trimmed optimistically; reload from the (unchanged)
        // path so the old response reappears after a failed regenerate.
        await refreshRows(session);
      } finally {
        resetStreamingAssistantRow();
        setSending(false);
      }
    },
    [
      adapters.credentialStore,
      appendStreamingAssistantDelta,
      continuations,
      getRowById,
      refreshRows,
      refreshRowsAndContinuations,
      repositories.edgeRepo,
      resetStreamingAssistantRow,
      rows,
      sending,
      session,
      useCases.generateDialogueContinuationUseCase,
    ]
  );

  const onSend = useCallback(async () => {
    if (sending || !session) {
      return;
    }

    const prompt = input.trim();
    if (!prompt) {
      return;
    }

    try {
      setSending(true);
      setError(null);
      shouldAutoScrollRef.current = true;
      setInput('');
      resetStreamingAssistantRow();

      if (editTarget) {
        const result = await useCases.editDialogueNodeUseCase.execute({
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

      // Provider is bound to this session's agent (via tree.defaultModelAgentId).
      // Fetch the matching API key from secure storage.
      const providerApiKey = await getProviderApiKey(
        adapters.credentialStore,
        session.provider
      );
      const streamStartedAtMs = Date.now();
      let firstDeltaAtMs: number | null = null;
      let deltaCount = 0;
      const turnResult = await useCases.sendDialogueTurnUseCase.execute({
        session,
        prompt,
        providerApiKey,
        providerAppName: 'Aspen Grove RN',
        stream: true,
        onUserNodeCommitted: async ({ userNodeId }) => {
          markAsNonEphemeral();
          await refreshRowsAndContinuations({
            ...session,
            activeNodeId: userNodeId,
          });
        },
        onAssistantTextDelta: async ({ delta }) => {
          if (firstDeltaAtMs === null) {
            firstDeltaAtMs = Date.now();
          }
          deltaCount += 1;
          appendStreamingAssistantDelta(delta);
        },
      });

      if (__DEV__) {
        // Streaming health check: many deltas spread over time = healthy;
        // one or two deltas arriving at the end = transport is buffering.
        console.log('[stream-diagnostic] send', {
          deltaCount,
          msToFirstDelta:
            firstDeltaAtMs === null ? null : firstDeltaAtMs - streamStartedAtMs,
          msTotal: Date.now() - streamStartedAtMs,
        });
      }

      await refreshRowsAndContinuations({
        ...session,
        activeNodeId: turnResult.assistantNodeId,
      });
      // Clear the transient streaming row now that the committed node is in
      // `rows` — leaving it set rendered the response twice until remount.
      resetStreamingAssistantRow();

      if (turnResult.completion.interruptionReason) {
        setError(
          `Stream interrupted (${turnResult.completion.interruptionReason}). Saved partial response.`
        );
      }
    } catch (caught) {
      const message =
        caught instanceof LlmProviderError
          ? `[${caught.provider}:${caught.code}] ${caught.message}`
          : caught instanceof Error
            ? caught.message
            : String(caught);
      setError(message);
    } finally {
      resetStreamingAssistantRow();
      setSending(false);
    }
  }, [
    adapters.credentialStore,
    editTarget,
    input,
    markAsNonEphemeral,
    refreshRowsAndContinuations,
    sending,
    session,
    appendStreamingAssistantDelta,
    resetStreamingAssistantRow,
    useCases.editDialogueNodeUseCase,
    useCases.sendDialogueTurnUseCase,
  ]);

  const onMessageAction = useCallback(
    async (nodeId: string, action: ChatMessageMenuAction) => {
      const targetNodeId = nodeId as ULID;
      switch (action) {
        case 'regenerate':
          await regenerateFromNode(targetNodeId);
          break;
        case 'continuations':
          Keyboard.dismiss();
          await continuations.showForNode(targetNodeId);
          break;
        case 'edit':
          await startEditForNode(targetNodeId);
          break;
        case 'rewind':
          await rewindToNode(targetNodeId);
          break;
        case 'copy':
          await copyNodeText(targetNodeId);
          break;
        case 'info':
          openNodeDetail(targetNodeId);
          break;
        case 'bookmark':
          await toggleBookmark(targetNodeId);
          break;
        case 'prune':
          await togglePrune(targetNodeId);
          break;
      }
    },
    [
      continuations,
      copyNodeText,
      openNodeDetail,
      regenerateFromNode,
      rewindToNode,
      startEditForNode,
      toggleBookmark,
      togglePrune,
    ]
  );

  // Message-row gestures: single-tap opens that node's continuation rail.
  // Tapping the already-open source closes it.
  const onNodeTap = useCallback(
    (nodeId: ULID) => {
      Keyboard.dismiss();
      if (continuations.visible && continuations.sourceNodeId === nodeId) {
        continuations.hide();
        return;
      }
      void continuations.showForNode(nodeId);
    },
    [continuations]
  );

  // Continuation-card gestures: single-tap opens node details; double-tap
  // retraces that branch (makes it current). The single-tap action is deferred
  // just past the double-tap window so a double never opens details first.
  const onContinuationSelect = useCallback(
    (nodeId: ULID) => {
      const nowMs = Date.now();
      const lastTap = continuationLastTapRef.current;
      if (lastTap && lastTap.nodeId === nodeId && nowMs - lastTap.atMs < 300) {
        continuationLastTapRef.current = null;
        if (continuationTapTimerRef.current) {
          clearTimeout(continuationTapTimerRef.current);
          continuationTapTimerRef.current = null;
        }
        void rewindToNode(nodeId);
        return;
      }
      continuationLastTapRef.current = {
        nodeId,
        atMs: nowMs,
      };
      if (continuationTapTimerRef.current) {
        clearTimeout(continuationTapTimerRef.current);
      }
      continuationTapTimerRef.current = setTimeout(() => {
        continuationTapTimerRef.current = null;
        openNodeDetail(nodeId);
      }, 320);
    },
    [openNodeDetail, rewindToNode]
  );

  useEffect(
    () => () => {
      if (continuationTapTimerRef.current) {
        clearTimeout(continuationTapTimerRef.current);
      }
    },
    []
  );

  const onContinuationMenuAction = useCallback(
    async (targetNodeId: ULID, action: ContinuationMenuAction) => {
      if (action === 'makeCurrent') {
        await rewindToNode(targetNodeId);
        return;
      }
      if (action === 'copy') {
        await copyNodeText(targetNodeId);
        return;
      }
      if (action === 'bookmark') {
        await continuations.toggleBookmark(targetNodeId);
      }
    },
    [continuations, copyNodeText, rewindToNode]
  );

  const onMessageListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const isNearBottom = distanceFromBottom <= 48;

      if (isNearBottom) {
        shouldAutoScrollRef.current = true;
        return;
      }

      if (sending) {
        shouldAutoScrollRef.current = false;
      }
    },
    [sending]
  );

  const onComposerFocus = useCallback(() => {
    shouldAutoScrollRef.current = true;
    scrollRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  return {
    loading,
    sending,
    error,
    input,
    setInput,
    rows,
    streamingAssistantText,
    onSend,
    onMessageAction,
    onMessageListScroll,
    onComposerFocus,
    onCancelEdit: () => {
      setEditTarget(null);
      setInput('');
    },
    onExpandComposer: openExpandedComposer,
    isEditing: Boolean(editTarget),
    editLabel: editTarget ? `Editing ${editTarget.localId}` : undefined,
    onNodeTap,
    continuationRail: {
      visible: continuations.visible,
      loading: continuations.loading,
      sourceNodeId: continuations.sourceNodeId,
      sourceLocalId: continuations.sourceLocalId,
      items: continuations.items,
      onSelect: onContinuationSelect,
      onMenuAction: onContinuationMenuAction,
      error: continuations.error,
    },
    bookmarks: {
      visible: bookmarksVisible,
      treeId: session?.treeId ?? activeTreeIdRef.current,
      open: () => setBookmarksVisible(true),
      close: () => setBookmarksVisible(false),
      onSelectNode: async (nodeId: ULID) => {
        setBookmarksVisible(false);
        await rewindToNode(nodeId);
      },
      // iOS can't reliably present two sibling RN Modals at once, so the
      // bookmarks sheet closes before the detail route opens.
      onShowDetail: (nodeId: ULID) => {
        setBookmarksVisible(false);
        openNodeDetail(nodeId);
      },
    },
    dialogueSettings: {
      visible: dialogueSettingsVisible,
      treeId: session?.treeId ?? activeTreeIdRef.current,
      open: () => setDialogueSettingsVisible(true),
      close: () => setDialogueSettingsVisible(false),
      onSessionInvalidated: reinitializeSession,
    },
    titleEditor: {
      visible: titleEditorVisible,
      title: treeTitle,
      open: () => setTitleEditorVisible(true),
      close: () => setTitleEditorVisible(false),
      save: saveTreeTitle,
    },
    scrollRef,
    inputRef,
    canSend: !sending && !loading && input.trim().length > 0,
    composerPlaceholder: editTarget
      ? 'Update this message...'
      : 'Send a message...',
    sendLabel: editTarget ? 'Save' : 'Send',
    displayPreferences,
  };
};
