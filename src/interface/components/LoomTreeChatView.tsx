import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import {
  DEFAULT_OPENROUTER_MODEL_IDENTIFIER,
  ensureOpenRouterAssistantAgent,
  getOpenRouterModelIdentifier,
} from '@application/services/openrouter-assistant-agent';
import {
  SendDialogueTurnUseCase,
  type DialogueTurnSession,
} from '@application/use-cases';
import { LlmProviderError } from '@application/services/llm';
import { OpenRouterAdapter } from '@infrastructure/llm';
import database from '@infrastructure/persistence/watermelon/index.native';
import {
  WatermelonAgentRepository,
  WatermelonEdgeRepository,
  WatermelonGroveRepository,
  WatermelonLoomTreeRepository,
  WatermelonNodeRepository,
  WatermelonPathRepository,
  WatermelonPathStateRepository,
  WatermelonRawApiResponseRepository,
} from '@infrastructure/persistence/watermelon/repositories';
import { ExpoSecureCredentialStore } from '@infrastructure/security';
import { parseULID, type ULID } from '@domain/value-objects';
import type { Node } from '@domain/entities';
import { useThemeColors } from '../hooks/useThemeColors';
import { AppInput, AppScreen, AppText } from '../ui/system';

type ChatSession = DialogueTurnSession;

type ChatRow = {
  readonly id: ULID;
  readonly authorType: 'human' | 'model';
  readonly text: string;
};

const getParamString = (
  value: string | string[] | undefined
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const LoomTreeChatView = () => {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const inputRef = useRef<TextInput>(null);
  const activeTreeIdRef = useRef<ULID | null>(null);
  const hasUserSentMessageRef = useRef(false);
  const isHandlingBeforeRemoveRef = useRef(false);

  const params = useLocalSearchParams<{
    treeId?: string | string[];
    autofocus?: string | string[];
    ephemeral?: string | string[];
  }>();

  const treeIdParam = getParamString(params.treeId);
  const shouldAutofocus = getParamString(params.autofocus) === '1';
  const shouldDeleteEmptyOnBlur = getParamString(params.ephemeral) === '1';

  const repos = useMemo(
    () => ({
      agentRepo: new WatermelonAgentRepository(database),
      groveRepo: new WatermelonGroveRepository(database),
      treeRepo: new WatermelonLoomTreeRepository(database),
      nodeRepo: new WatermelonNodeRepository(database),
      edgeRepo: new WatermelonEdgeRepository(database),
      pathRepo: new WatermelonPathRepository(database),
      pathStateRepo: new WatermelonPathStateRepository(database),
      rawApiResponseRepo: new WatermelonRawApiResponseRepository(database),
    }),
    []
  );
  const openRouterProvider = useMemo(() => new OpenRouterAdapter(), []);
  const sendDialogueTurnUseCase = useMemo(
    () =>
      new SendDialogueTurnUseCase({
        agentRepository: repos.agentRepo,
        loomTreeRepository: repos.treeRepo,
        nodeRepository: repos.nodeRepo,
        edgeRepository: repos.edgeRepo,
        pathRepository: repos.pathRepo,
        pathStateRepository: repos.pathStateRepo,
        rawApiResponseRepository: repos.rawApiResponseRepo,
        llmProvider: openRouterProvider,
      }),
    [openRouterProvider, repos]
  );
  const credentialStore = useMemo(() => new ExpoSecureCredentialStore(), []);

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
      void repos.treeRepo
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

        const tree = await repos.treeRepo.findById(routeTreeId);
        if (!tree) {
          throw new Error(`Loom Tree not found: ${routeTreeId}`);
        }

        const grove = await repos.groveRepo.findById(tree.groveId);
        if (!grove) {
          throw new Error(`Grove not found for Loom Tree: ${tree.groveId}`);
        }

        const ownerAgentId = grove.ownerAgentId as ULID;
        const modelAgent = await ensureOpenRouterAssistantAgent(repos.agentRepo);
        const modelIdentifier =
          getOpenRouterModelIdentifier(modelAgent) ??
          DEFAULT_OPENROUTER_MODEL_IDENTIFIER;

        const path =
          (await repos.pathRepo.findByTreeAndOwner(tree.id, ownerAgentId)) ??
          (await repos.pathRepo.create({
            loomTreeId: tree.id,
            ownerAgentId,
            name: 'Main',
          }));

        const pathNodes = await repos.pathRepo.getNodeSequence(path.id);
        if (pathNodes.length === 0) {
          await repos.pathRepo.appendNode(path.id, tree.rootNodeId);
        }

        const latestNodes = await repos.pathRepo.getNodeSequence(path.id);
        const activeNodeId =
          latestNodes[latestNodes.length - 1]?.nodeId ?? tree.rootNodeId;

        await repos.pathStateRepo.setActiveNode(
          path.id,
          ownerAgentId,
          activeNodeId,
          'dialogue'
        );

        hasUserSentMessageRef.current = false;
        setHasUserSentMessage(false);
        activeTreeIdRef.current = tree.id;

        setSession({
          ownerAgentId,
          modelAgentId: modelAgent.id,
          modelIdentifier,
          treeId: tree.id,
          pathId: path.id,
          activeNodeId,
        });

        await refreshRows({
          ownerAgentId,
          modelAgentId: modelAgent.id,
          modelIdentifier,
          treeId: tree.id,
          pathId: path.id,
          activeNodeId,
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [repos, treeIdParam]);

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
    const pathNodes = await repos.pathRepo.getNodeSequence(pathId);
    const resolved = await Promise.all(
      pathNodes.map((pathNode) => repos.nodeRepo.findById(pathNode.nodeId, true))
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
    const fromSecureStore = await credentialStore.getProviderApiKey('openrouter');
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
      const turnResult = await sendDialogueTurnUseCase.execute({
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

  return (
    <AppScreen style={styles.container}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          ref={scrollRef}
          enabled
          extraKeyboardSpace={0}
          bottomOffset={0}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: 16,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          alwaysBounceVertical
          overScrollMode="always"
        >
          {rows.map((row) => (
            <View
              key={row.id}
              style={[
                styles.row,
                row.authorType === 'human' ? styles.userRow : styles.assistantRow,
              ]}
            >
              <AppText variant="meta" tone="muted" style={styles.authorText}>
                {row.authorType === 'human' ? 'YOU' : 'ASSISTANT'}
              </AppText>

              {row.authorType === 'human' ? (
                <View
                  style={[
                    styles.userBubble,
                    {
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <AppText variant="body" tone="inverse" style={styles.messageText}>
                    {row.text}
                  </AppText>
                </View>
              ) : (
                <AppText variant="body" tone="primary" style={styles.messageText}>
                  {row.text}
                </AppText>
              )}
            </View>
          ))}

          {error ? (
            <AppText variant="meta" tone="accent" style={styles.errorText}>
              {error}
            </AppText>
          ) : null}
        </KeyboardAwareScrollView>
      )}

      <KeyboardStickyView
        enabled
        offset={{ closed: 0, opened: 0 }}
        style={styles.composerSticky}
      >
        <View
          style={[
            styles.composerWrap,
            {
              borderTopColor: colors.line,
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <AppInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Send a message..."
            style={styles.input}
            multiline
            editable={!sending && !loading}
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Pressable
            onPress={onSend}
            disabled={sending || loading || input.trim().length === 0}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor:
                  sending || input.trim().length === 0 ? colors.tertiary : colors.red,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons
              name={sending ? 'ellipsis-horizontal' : 'arrow-up'}
              size={18}
              color={colors.onSurface}
            />
          </Pressable>
        </View>
      </KeyboardStickyView>
    </AppScreen>
  );
};

export default LoomTreeChatView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    flexGrow: 1,
    gap: 18,
  },
  row: {
    width: '100%',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  authorText: {
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  userBubble: {
    maxWidth: '88%',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  messageText: {
    fontSize: 17,
    lineHeight: 27,
  },
  errorText: {
    marginTop: 8,
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  composerSticky: {
    width: '100%',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 8,
    fontSize: 17,
    lineHeight: 27,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendButton: {
    height: 44,
    width: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
});
