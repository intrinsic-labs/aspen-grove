import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  computeHumanContentHash,
  computeModelContentHash,
} from '@application/services/content-hash-service';
import { assembleDialogueContext } from '@application/services/assemble-dialogue-context';
import { LlmProviderError } from '@application/services/llm';
import { runStartupOrchestrator } from '@infrastructure/bootstrap';
import { OpenRouterAdapter } from '@infrastructure/llm';
import database from '@infrastructure/persistence/watermelon/index.native';
import {
  WatermelonAgentRepository,
  WatermelonEdgeRepository,
  WatermelonLoomTreeRepository,
  WatermelonNodeRepository,
  WatermelonPathRepository,
  WatermelonPathStateRepository,
} from '@infrastructure/persistence/watermelon/repositories';
import { ExpoSecureCredentialStore } from '@infrastructure/security';
import {
  createLocalId,
  createULID,
  parseModelRef,
  type ULID,
} from '@domain/value-objects';
import type { Node } from '@domain/entities';
import { useThemeColors } from '../hooks/useThemeColors';

type ChatSession = {
  readonly ownerAgentId: ULID;
  readonly modelAgentId: ULID;
  readonly modelIdentifier: string;
  readonly treeId: ULID;
  readonly pathId: ULID;
  readonly activeNodeId: ULID;
};

type ChatRow = {
  readonly id: ULID;
  readonly authorType: 'human' | 'model';
  readonly text: string;
};

const OPENROUTER_MODEL_IDENTIFIER = 'openai/gpt-4o-mini';
const OPENROUTER_MODEL_REF = parseModelRef(
  `openrouter:${OPENROUTER_MODEL_IDENTIFIER}`
);

const LoomTreeListView = () => {
  const { colors, isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const repos = useMemo(
    () => ({
      agentRepo: new WatermelonAgentRepository(database),
      treeRepo: new WatermelonLoomTreeRepository(database),
      nodeRepo: new WatermelonNodeRepository(database),
      edgeRepo: new WatermelonEdgeRepository(database),
      pathRepo: new WatermelonPathRepository(database),
      pathStateRepo: new WatermelonPathStateRepository(database),
    }),
    []
  );
  const openRouterProvider = useMemo(() => new OpenRouterAdapter(), []);
  const credentialStore = useMemo(() => new ExpoSecureCredentialStore(), []);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        const startup = await runStartupOrchestrator(database, {
          ensureDialogueSmokeTreeIfEmpty: __DEV__,
        });

        const ownerAgentId = startup.ownerAgentId as ULID;
        const modelAgent = await ensureOpenRouterModelAgent();

        const tree =
          (startup.createdSmokeTreeId
            ? await repos.treeRepo.findById(startup.createdSmokeTreeId as ULID)
            : null) ??
          (await findLatestDialogueTree(startup.groveId as ULID));

        if (!tree) {
          throw new Error('No dialogue tree available after startup');
        }

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

        setSession({
          ownerAgentId,
          modelAgentId: modelAgent.id,
          modelIdentifier: OPENROUTER_MODEL_IDENTIFIER,
          treeId: tree.id,
          pathId: path.id,
          activeNodeId,
        });

        await refreshRows({
          ownerAgentId,
          modelAgentId: modelAgent.id,
          modelIdentifier: OPENROUTER_MODEL_IDENTIFIER,
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
  }, [repos]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [rows, loading, sending]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const frameSubscription = Keyboard.addListener(
        'keyboardWillChangeFrame',
        (event) => {
          Keyboard.scheduleLayoutAnimation(event);
          const windowHeight = Dimensions.get('window').height;
          const overlap = Math.max(0, windowHeight - event.endCoordinates.screenY);
          setKeyboardOverlap(overlap - 72);
        }
      );

      const hideSubscription = Keyboard.addListener('keyboardWillHide', (event) => {
        Keyboard.scheduleLayoutAnimation(event);
        setKeyboardOverlap(0);
      });

      return () => {
        frameSubscription.remove();
        hideSubscription.remove();
      };
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardOverlap(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOverlap(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const findLatestDialogueTree = async (groveId: ULID) => {
    const trees = await repos.treeRepo.findByMode(groveId, 'dialogue', true);
    return trees[trees.length - 1] ?? null;
  };

  const ensureOpenRouterModelAgent = async () => {
    const existing = await repos.agentRepo.findByModelRef(OPENROUTER_MODEL_REF, true);
    if (existing.length > 0) {
      return existing[0];
    }

    const created = await repos.agentRepo.create({
      name: 'OpenRouter Assistant',
      type: 'model',
      modelRef: OPENROUTER_MODEL_REF,
      configuration: {
        systemPrompt:
          'You are a helpful dialogue partner in Aspen Grove.',
        temperature: 1.0,
      },
      permissions: {
        loomAware: false,
        loomWrite: true,
        loomGenerate: false,
        docRead: true,
        docWrite: false,
      },
    });

    return created;
  };

  const loadPathNodes = async (pathId: ULID): Promise<Node[]> => {
    const pathNodes = await repos.pathRepo.getNodeSequence(pathId);
    const resolved = await Promise.all(
      pathNodes.map((pathNode) => repos.nodeRepo.findById(pathNode.nodeId, true))
    );

    return resolved.filter((node): node is Node => Boolean(node));
  };

  const refreshRows = async (nextSession: ChatSession) => {
    const nodes = await loadPathNodes(nextSession.pathId);
    const mapped: ChatRow[] = nodes.map((node) => ({
      id: node.id,
      authorType: node.authorType,
      text: node.content.type === 'text' ? node.content.text : `[${node.content.type}]`,
    }));

    const activeNodeId =
      nodes[nodes.length - 1]?.id ?? nextSession.activeNodeId;

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

      const previousNode = await repos.nodeRepo.findById(session.activeNodeId, true);
      if (!previousNode) {
        throw new Error(`Active node not found: ${session.activeNodeId}`);
      }

      const userNodeId = createULID();
      const userCreatedAt = new Date();
      const userLocalIds = await repos.nodeRepo.getAllLocalIds(session.treeId);
      const userLocalId = createLocalId(userNodeId, userLocalIds);

      const userContent = { type: 'text' as const, text: prompt };
      const userContentHash = await computeHumanContentHash(
        userContent,
        [previousNode.contentHash],
        userCreatedAt,
        session.ownerAgentId
      );

      const userNode = await repos.nodeRepo.create({
        id: userNodeId,
        createdAt: userCreatedAt,
        loomTreeId: session.treeId,
        localId: userLocalId,
        content: userContent,
        authorAgentId: session.ownerAgentId,
        authorType: 'human',
        contentHash: userContentHash,
      });

      await repos.edgeRepo.create({
        loomTreeId: session.treeId,
        sources: [{ nodeId: previousNode.id, role: 'primary' }],
        targetNodeId: userNode.id,
        edgeType: 'continuation',
      });

      await repos.pathRepo.appendNode(session.pathId, userNode.id);
      await repos.pathStateRepo.setActiveNode(
        session.pathId,
        session.ownerAgentId,
        userNode.id,
        'dialogue'
      );

      const contextNodes = await loadPathNodes(session.pathId);
      const modelAgent = await repos.agentRepo.findById(session.modelAgentId);
      const tree = await repos.treeRepo.findById(session.treeId);
      const assembled = assembleDialogueContext({
        nodes: contextNodes,
        agentSystemPrompt: modelAgent?.configuration.systemPrompt,
        treeSystemContext: tree?.systemContext,
      });

      console.info('[chat] assembled context', {
        systemContextLength: assembled.systemContext?.length ?? 0,
        messageCount: assembled.messages.length,
      });

      const openRouterApiKey = await getOpenRouterApiKey();
      const initialized = await openRouterProvider.initialize(
        { apiKey: openRouterApiKey },
        {
          appName: 'Aspen Grove RN',
        }
      );
      if (!initialized) {
        throw new Error('Failed to initialize OpenRouter provider.');
      }

      const completion = await openRouterProvider.generateCompletion({
        model: session.modelIdentifier,
        messages: assembled.messages,
        systemPrompt: assembled.systemContext,
        temperature: modelAgent?.configuration.temperature,
        maxTokens: modelAgent?.configuration.maxTokens,
        stopSequences: modelAgent?.configuration.stopSequences,
      });
      const assistantText = completion.content.trim();
      if (!assistantText) {
        throw new Error('OpenRouter returned empty completion content.');
      }

      console.info('[chat] openrouter completion', {
        modelIdentifier: completion.rawResponse.modelIdentifier ?? session.modelIdentifier,
        latencyMs: completion.rawResponse.latencyMs,
        finishReason: completion.finishReason,
        usage: completion.usage,
      });

      const assistantNodeId = createULID();
      const assistantCreatedAt = new Date();
      const assistantLocalIds = await repos.nodeRepo.getAllLocalIds(session.treeId);
      const assistantLocalId = createLocalId(assistantNodeId, assistantLocalIds);

      const assistantContent = { type: 'text' as const, text: assistantText };
      const assistantContentHash = await computeModelContentHash(
        assistantContent,
        [userNode.contentHash],
        assistantCreatedAt,
        session.modelAgentId,
        completion.rawResponse.rawBytesHash
      );

      const assistantNode = await repos.nodeRepo.create({
        id: assistantNodeId,
        createdAt: assistantCreatedAt,
        loomTreeId: session.treeId,
        localId: assistantLocalId,
        content: assistantContent,
        authorAgentId: session.modelAgentId,
        authorType: 'model',
        contentHash: assistantContentHash,
      });

      await repos.edgeRepo.create({
        loomTreeId: session.treeId,
        sources: [{ nodeId: userNode.id, role: 'primary' }],
        targetNodeId: assistantNode.id,
        edgeType: 'continuation',
      });

      await repos.pathRepo.appendNode(session.pathId, assistantNode.id);
      await repos.pathStateRepo.setActiveNode(
        session.pathId,
        session.ownerAgentId,
        assistantNode.id,
        'dialogue'
      );

      await refreshRows({
        ...session,
        activeNodeId: assistantNode.id,
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

  const composerBottom = keyboardOverlap > 0 ? keyboardOverlap + 0 : insets.bottom + 8;
  const contentBottomPadding = composerBottom + 92;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: contentBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {rows.map((row) => (
            <View
              key={row.id}
              style={[
                styles.row,
                row.authorType === 'human'
                  ? styles.humanRow
                  : styles.assistantRow,
              ]}
            >
              {row.authorType === 'human' ? (
                <View
                  style={[
                    styles.humanBubble,
                    {
                      backgroundColor: isDark ? '#111318' : '#f1f1f5',
                    },
                  ]}
                >
                  <Text style={[styles.humanText, { color: colors.primary }]}>
                    {row.text}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.assistantText, { color: colors.primary }]}>
                  {row.text}
                </Text>
              )}
            </View>
          ))}

          {error ? (
            <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
          ) : null}
        </ScrollView>
      )}

      <View
        style={[
          styles.composerWrap,
          {
            bottom: composerBottom,
            backgroundColor: isDark ? '#0e0f14' : '#f7f7fb',
            borderColor: isDark ? '#1b1f2b' : '#e3e5ea',
          },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Send a message..."
          placeholderTextColor={isDark ? '#666b76' : '#8f939e'}
          style={[styles.input, { color: colors.primary }]}
          multiline
          editable={!sending && !loading}
        />
        <Pressable
          onPress={onSend}
          disabled={sending || loading || input.trim().length === 0}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                sending || input.trim().length === 0 ? colors.tertiary : colors.red,
            },
          ]}
        >
          <Text style={[styles.sendText, { color: colors.white }]}>
            {sending ? '...' : 'Send'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default LoomTreeListView;

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
    paddingTop: 22,
    gap: 20,
  },
  row: {
    width: '100%',
  },
  humanRow: {
    alignItems: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  humanBubble: {
    maxWidth: '88%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  humanText: {
    fontFamily: 'Lora-Regular',
    fontSize: 17,
    lineHeight: 28,
  },
  assistantText: {
    fontFamily: 'Lora-Regular',
    fontSize: 19,
    lineHeight: 32,
    width: '100%',
  },
  errorText: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  composerWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 24,
    maxHeight: 120,
    fontFamily: 'Lora-Regular',
    fontSize: 18,
    lineHeight: 27,
  },
  sendButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 54,
    alignItems: 'center',
  },
  sendText: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 13,
  },
});
