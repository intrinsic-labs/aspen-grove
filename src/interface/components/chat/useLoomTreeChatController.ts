import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TextInput,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { LlmProviderError } from '@application/services/llm';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { getOpenRouterApiKey } from './provider-key';
import { toDialogueRouteParams } from './route-params';
import {
  initializeDialogueChatSession,
  loadDialogueRowsForPath,
} from './session-helpers';
import type { ChatRow, ChatSession } from './types';
import { useDeleteEphemeralTreeOnBack } from './useDeleteEphemeralTreeOnBack';
import { useStreamingAssistantRow } from './useStreamingAssistantRow';

export const useLoomTreeChatController = () => {
  const navigation = useNavigation();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const inputRef = useRef<TextInput>(null);
  const activeTreeIdRef = useRef<ULID | null>(null);
  const hasUserSentMessageRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
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
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const {
    streamingText: streamingAssistantText,
    appendDelta: appendStreamingAssistantDelta,
    reset: resetStreamingAssistantRow,
  } = useStreamingAssistantRow();

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
      setRows([...nextRows.rows]);
      setSession({
        ...nextSession,
        activeNodeId: nextRows.activeNodeId ?? nextSession.activeNodeId,
      });
    },
    [repositories.nodeRepo, repositories.pathRepo]
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
      setInput('');
      shouldAutoScrollRef.current = true;
      resetStreamingAssistantRow();

      const openRouterApiKey = await getOpenRouterApiKey(adapters.credentialStore);
      const turnResult = await useCases.sendDialogueTurnUseCase.execute({
        session,
        prompt,
        providerApiKey: openRouterApiKey,
        providerAppName: 'Aspen Grove RN',
        stream: true,
        onUserNodeCommitted: async ({ userNodeId }) => {
          markAsNonEphemeral();
          await refreshRows({
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

      await refreshRows({
        ...session,
        activeNodeId: turnResult.assistantNodeId,
      });

      if (turnResult.completion.interruptionReason) {
        setError(
          `Stream interrupted (${turnResult.completion.interruptionReason}). Saved partial response.`
        );
      }

      resetStreamingAssistantRow();
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
    input,
    markAsNonEphemeral,
    refreshRows,
    sending,
    session,
    appendStreamingAssistantDelta,
    resetStreamingAssistantRow,
    useCases.sendDialogueTurnUseCase,
  ]);

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
    onMessageListScroll,
    onComposerFocus,
    scrollRef,
    inputRef,
    canSend: !sending && !loading && input.trim().length > 0,
  };
};
