import { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import {
  DEFAULT_OPENROUTER_MODEL_IDENTIFIER,
  ensureOpenRouterAssistantAgent,
  getOpenRouterModelIdentifier,
} from '@application/services/openrouter-assistant-agent';
import { LlmProviderError } from '@application/services/llm';
import { parseULID, type ULID } from '@domain/value-objects';
import type { Node } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import type { ChatRow, ChatSession } from './types';

const getParamString = (
  value: string | string[] | undefined
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export const useLoomTreeChatController = () => {
  const navigation = useNavigation();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const inputRef = useRef<TextInput>(null);
  const activeTreeIdRef = useRef<ULID | null>(null);
  const hasUserSentMessageRef = useRef(false);
  const isHandlingBeforeRemoveRef = useRef(false);
  const { repositories, adapters, useCases } = useAppServices();

  const params = useLocalSearchParams<{
    treeId?: string | string[];
    autofocus?: string | string[];
    ephemeral?: string | string[];
  }>();

  const treeIdParam = getParamString(params.treeId);
  const shouldAutofocus = getParamString(params.autofocus) === '1';
  const shouldDeleteEmptyOnBlur = getParamString(params.ephemeral) === '1';

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);

  usePreventRemove(
    shouldDeleteEmptyOnBlur && !hasUserSentMessage && Boolean(session),
    ({ data }) => {
      if (isHandlingBeforeRemoveRef.current) {
        return;
      }

      const treeId = activeTreeIdRef.current ?? session?.treeId;
      if (!treeId) {
        navigation.dispatch(data.action);
        return;
      }

      isHandlingBeforeRemoveRef.current = true;
      void repositories.treeRepo
        .hardDelete(treeId)
        .then((deleted) => {
          if (deleted) {
            console.info('[chat] deleted empty tree created from quick add', {
              treeId,
            });
          }
        })
        .finally(() => {
          hasUserSentMessageRef.current = true;
          setHasUserSentMessage(true);
          navigation.dispatch(data.action);
        });
    }
  );

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!treeIdParam) {
          throw new Error('Missing treeId route parameter');
        }

        const routeTreeId = parseULID(treeIdParam);

        const tree = await repositories.treeRepo.findById(routeTreeId);
        if (!tree) {
          throw new Error(`Loom Tree not found: ${routeTreeId}`);
        }

        const grove = await repositories.groveRepo.findById(tree.groveId);
        if (!grove) {
          throw new Error(`Grove not found for Loom Tree: ${tree.groveId}`);
        }

        const ownerAgentId = grove.ownerAgentId as ULID;
        const modelAgent = await ensureOpenRouterAssistantAgent(
          repositories.agentRepo
        );
        const modelIdentifier =
          getOpenRouterModelIdentifier(modelAgent) ??
          DEFAULT_OPENROUTER_MODEL_IDENTIFIER;

        const path =
          (await repositories.pathRepo.findByTreeAndOwner(tree.id, ownerAgentId)) ??
          (await repositories.pathRepo.create({
            loomTreeId: tree.id,
            ownerAgentId,
            name: 'Main',
          }));

        const pathNodes = await repositories.pathRepo.getNodeSequence(path.id);
        if (pathNodes.length === 0) {
          await repositories.pathRepo.appendNode(path.id, tree.rootNodeId);
        }

        const latestNodes = await repositories.pathRepo.getNodeSequence(path.id);
        const activeNodeId =
          latestNodes[latestNodes.length - 1]?.nodeId ?? tree.rootNodeId;

        await repositories.pathStateRepo.setActiveNode(
          path.id,
          ownerAgentId,
          activeNodeId,
          'dialogue'
        );

        hasUserSentMessageRef.current = false;
        setHasUserSentMessage(false);
        activeTreeIdRef.current = tree.id;

        const initializedSession: ChatSession = {
          ownerAgentId,
          modelAgentId: modelAgent.id,
          modelIdentifier,
          treeId: tree.id,
          pathId: path.id,
          activeNodeId,
        };
        setSession(initializedSession);

        await refreshRows(initializedSession);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [repositories, treeIdParam]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [rows, loading, sending]);

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

  const loadPathNodes = async (pathId: ULID): Promise<Node[]> => {
    const pathNodes = await repositories.pathRepo.getNodeSequence(pathId);
    const resolved = await Promise.all(
      pathNodes.map((pathNode) =>
        repositories.nodeRepo.findById(pathNode.nodeId, true)
      )
    );

    return resolved.filter((node): node is Node => Boolean(node));
  };

  const refreshRows = async (nextSession: ChatSession) => {
    const nodes = await loadPathNodes(nextSession.pathId);

    const mapped: ChatRow[] = [];
    for (const node of nodes) {
      const text =
        node.content.type === 'text' ? node.content.text : `[${node.content.type}]`;
      if (text.trim().length === 0) {
        continue;
      }
      mapped.push({
        id: node.id,
        authorType: node.authorType,
        text,
      });
    }

    const activeNodeId = nodes[nodes.length - 1]?.id ?? nextSession.activeNodeId;

    setRows(mapped);
    setSession({
      ...nextSession,
      activeNodeId,
    });
  };

  const getOpenRouterApiKey = async (): Promise<string> => {
    const fromSecureStore = await adapters.credentialStore.getProviderApiKey(
      'openrouter'
    );
    if (fromSecureStore && fromSecureStore.trim().length > 0) {
      return fromSecureStore.trim();
    }

    const fromEnv = (
      globalThis as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env?.EXPO_PUBLIC_OPENROUTER_API_KEY?.trim();
    if (fromEnv) {
      return fromEnv;
    }

    throw new Error(
      'OpenRouter API key not found. Set EXPO_PUBLIC_OPENROUTER_API_KEY or store openrouter_api_key in secure storage.'
    );
  };

  const onSend = async () => {
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

      const openRouterApiKey = await getOpenRouterApiKey();
      const turnResult = await useCases.sendDialogueTurnUseCase.execute({
        session,
        prompt,
        providerApiKey: openRouterApiKey,
        providerAppName: 'Aspen Grove RN',
        onUserNodeCommitted: async ({ userNodeId }) => {
          hasUserSentMessageRef.current = true;
          setHasUserSentMessage(true);
          await refreshRows({
            ...session,
            activeNodeId: userNodeId,
          });
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
    } catch (caught) {
      const message =
        caught instanceof LlmProviderError
          ? `[${caught.provider}:${caught.code}] ${caught.message}`
          : caught instanceof Error
            ? caught.message
            : String(caught);
      setError(message);
    } finally {
      setSending(false);
    }
  };

  return {
    loading,
    sending,
    error,
    input,
    setInput,
    rows,
    onSend,
    scrollRef,
    inputRef,
    canSend: !sending && !loading && input.trim().length > 0,
  };
};

