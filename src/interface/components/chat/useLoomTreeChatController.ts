import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TextInput,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import * as Clipboard from 'expo-clipboard';
import { LlmProviderError } from '@application/services/llm';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import type { ContinuationMenuAction } from './ContinuationRail';
import type { ChatMessageMenuAction } from './ChatMessageList';
import { getOpenRouterApiKey } from './provider-key';
import { toDialogueRouteParams } from './route-params';
import {
  initializeDialogueChatSession,
  loadDialogueRowsForPath,
} from './session-helpers';
import type { ChatSession } from './types';
import { useDeleteEphemeralTreeOnBack } from './useDeleteEphemeralTreeOnBack';
import { useNodeContinuations } from './useNodeContinuations';
import { useStreamingAssistantRow } from './useStreamingAssistantRow';

export const useLoomTreeChatController = () => {
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
  const { repositories, adapters, useCases } = useAppServices();

  const routeParams = useLocalSearchParams<{
    treeId?: string | string[];
    autofocus?: string | string[];
    ephemeral?: string | string[];
  }>();
  const { treeIdParam, shouldAutofocus, shouldDeleteEmptyOnBlur } =
    toDialogueRouteParams(routeParams);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<Awaited<
    ReturnType<typeof loadDialogueRowsForPath>
  >['rows']>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    readonly nodeId: ULID;
    readonly localId: string;
  } | null>(null);
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
      });
      setRows(nextRows.rows);
      setSession({
        ...nextSession,
        activeNodeId: nextRows.activeNodeId ?? nextSession.activeNodeId,
      });
    },
    [repositories.nodeRepo, repositories.pathRepo]
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

  useEffect(() => {
    const initialize = async () => {
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
        });

        resetEphemeralState();
        activeTreeIdRef.current = initialized.treeId;

        const initializedSession: ChatSession = initialized.session;
        await refreshRows(initializedSession);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [repositories, refreshRows, resetEphemeralState, treeIdParam]);

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
        node.content.type === 'text' ? node.content.text : `[${node.content.type}]`;
      await Clipboard.setStringAsync(text);
    },
    [getRowById, repositories.nodeRepo]
  );

  const showNodeInfo = useCallback(
    (nodeId: ULID) => {
      const row = getRowById(nodeId);
      if (!row) {
        return;
      }

      Alert.alert(
        'Node Info',
        [
          `Local ID: ${row.localId}`,
          `Author: ${row.authorType}`,
          row.editedFrom ? `Edited From: ${row.editedFrom}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      );
    },
    [getRowById]
  );

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

  const rewindToNode = useCallback(
    async (targetNodeId: ULID) => {
      if (!session || sending) {
        return;
      }
      try {
        setSending(true);
        setError(null);
        shouldAutoScrollRef.current = true;
        const result = await useCases.switchDialoguePathUseCase.execute({
          pathId: session.pathId,
          ownerAgentId: session.ownerAgentId,
          targetNodeId,
        });
        await refreshRowsAndContinuations({
          ...session,
          activeNodeId: result.targetNodeId,
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setSending(false);
      }
    },
    [refreshRowsAndContinuations, sending, session, useCases.switchDialoguePathUseCase]
  );

  const startEditForNode = useCallback(
    (targetNodeId: ULID) => {
      const row = getRowById(targetNodeId);
      if (!row) {
        return;
      }

      setEditTarget({
        nodeId: targetNodeId,
        localId: row.localId,
      });
      setInput(row.text);
      shouldAutoScrollRef.current = true;

      requestAnimationFrame(() => {
        inputRef.current?.focus();
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    },
    [getRowById]
  );

  const regenerateFromNode = useCallback(
    async (sourceNodeId: ULID) => {
      if (!session || sending) {
        return;
      }

      try {
        setSending(true);
        setError(null);
        shouldAutoScrollRef.current = true;
        resetStreamingAssistantRow();

        if (session.activeNodeId !== sourceNodeId) {
          const rewound = await useCases.switchDialoguePathUseCase.execute({
            pathId: session.pathId,
            ownerAgentId: session.ownerAgentId,
            targetNodeId: sourceNodeId,
          });
          await refreshRowsAndContinuations({
            ...session,
            activeNodeId: rewound.targetNodeId,
          });
        }

        const openRouterApiKey = await getOpenRouterApiKey(adapters.credentialStore);
        const result = await useCases.generateDialogueContinuationUseCase.execute({
          session: {
            ownerAgentId: session.ownerAgentId,
            modelAgentId: session.modelAgentId,
            modelIdentifier: session.modelIdentifier,
            treeId: session.treeId,
            pathId: session.pathId,
          },
          sourceNodeId,
          providerApiKey: openRouterApiKey,
          providerAppName: 'Aspen Grove RN',
          stream: true,
          activateGeneratedNode: true,
          onAssistantTextDelta: async ({ delta }) => {
            appendStreamingAssistantDelta(delta);
          },
        });

        console.info('[chat] generated continuation', {
          sourceNodeId,
          assistantNodeId: result.assistantNodeId,
          finishReason: result.completion.finishReason,
          interruptionReason: result.completion.interruptionReason,
          modelIdentifier: result.completion.modelIdentifier,
          latencyMs: result.completion.latencyMs,
        });

        await refreshRowsAndContinuations({
          ...session,
          activeNodeId: result.assistantNodeId,
        });

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
      } finally {
        resetStreamingAssistantRow();
        setSending(false);
      }
    },
    [
      adapters.credentialStore,
      appendStreamingAssistantDelta,
      refreshRowsAndContinuations,
      resetStreamingAssistantRow,
      sending,
      session,
      useCases.generateDialogueContinuationUseCase,
      useCases.switchDialoguePathUseCase,
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

        console.info('[chat] edited node', {
          editedNodeId: result.editedNodeId,
          editedFromNodeId: result.editedFromNodeId,
          parentNodeId: result.parentNodeId,
        });
        return;
      }

      const openRouterApiKey = await getOpenRouterApiKey(adapters.credentialStore);
      const turnResult = await useCases.sendDialogueTurnUseCase.execute({
        session,
        prompt,
        providerApiKey: openRouterApiKey,
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
          appendStreamingAssistantDelta(delta);
        },
      });

      console.info('[chat] assembled context', {
        systemContextLength: turnResult.systemContextLength,
        messageCount: turnResult.contextMessageCount,
      });

      console.info('[chat] openrouter completion', {
        modelIdentifier: turnResult.completion.modelIdentifier,
        latencyMs: turnResult.completion.latencyMs,
        finishReason: turnResult.completion.finishReason,
        interruptionReason: turnResult.completion.interruptionReason,
        usage: turnResult.completion.usage,
      });

      console.info('[chat] model provenance verified', {
        nodeId: turnResult.assistantNodeId,
        rawApiResponseId: turnResult.provenance.rawApiResponseId,
        parentNodeCount: turnResult.provenance.parentNodeCount,
      });

      await refreshRowsAndContinuations({
        ...session,
        activeNodeId: turnResult.assistantNodeId,
      });

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
      resetStreamingAssistantRow();
      setError(message);
    } finally {
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
          await continuations.showForNode(targetNodeId);
          break;
        case 'edit':
          startEditForNode(targetNodeId);
          break;
        case 'rewind':
          await rewindToNode(targetNodeId);
          break;
        case 'copy':
          await copyNodeText(targetNodeId);
          break;
        case 'info':
          showNodeInfo(targetNodeId);
          break;
        case 'bookmark':
          await toggleBookmark(targetNodeId);
          break;
      }
    },
    [
      continuations,
      copyNodeText,
      regenerateFromNode,
      rewindToNode,
      showNodeInfo,
      startEditForNode,
      toggleBookmark,
    ]
  );

  const onContinuationSelect = useCallback(
    async (nodeId: ULID) => {
      continuations.setSelectedNodeId(nodeId);
      const nowMs = Date.now();
      const lastTap = continuationLastTapRef.current;
      if (lastTap && lastTap.nodeId === nodeId && nowMs - lastTap.atMs < 260) {
        continuationLastTapRef.current = null;
        await rewindToNode(nodeId);
        return;
      }
      continuationLastTapRef.current = {
        nodeId,
        atMs: nowMs,
      };
    },
    [continuations, rewindToNode]
  );

  const onContinuationMenuAction = useCallback(
    async (targetNodeId: ULID, action: ContinuationMenuAction) => {
      if (action === 'makeCurrent' || action === 'retrace') {
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
    [
      continuations,
      copyNodeText,
      rewindToNode,
    ]
  );

  const onMessageListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
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
    isEditing: Boolean(editTarget),
    editLabel: editTarget ? `Editing ${editTarget.localId}` : undefined,
    continuationRail: {
      visible: continuations.visible,
      loading: continuations.loading,
      sourceLocalId: continuations.sourceLocalId,
      selectedNodeId: continuations.selectedNodeId,
      items: continuations.items,
      onClose: continuations.hide,
      onSelect: onContinuationSelect,
      onMakeCurrent: rewindToNode,
      onMenuAction: onContinuationMenuAction,
      error: continuations.error,
    },
    scrollRef,
    inputRef,
    canSend: !sending && !loading && input.trim().length > 0,
    composerPlaceholder: editTarget ? 'Update this message...' : 'Send a message...',
    sendLabel: editTarget ? 'Save' : 'Send',
  };
};
