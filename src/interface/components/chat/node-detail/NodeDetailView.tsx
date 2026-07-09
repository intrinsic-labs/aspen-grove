import { useCallback, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import ContextMenu, {
  type ContextMenuAction,
} from 'react-native-context-menu-view';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText, HeaderIconButton } from '@/interface/ui/value-objects';
import type { ModelNodeProvenanceStatus } from '@application/services/provenance';
import { useNodeDetailData } from './useNodeDetailData';

export type NodeDetailAction =
  | 'makeCurrent'
  | 'edit'
  | 'copy'
  | 'bookmark'
  | 'prune';

type NodeDetailViewProps = {
  readonly nodeId: ULID | null;
  readonly actionError?: string | null;
  /**
   * Invoked with the action and the node id. `makeCurrent` and `edit`
   * leave the view (the route handles that); `bookmark`/`prune`
   * keep it open and the view reloads its own data afterwards.
   */
  readonly onAction: (
    nodeId: ULID,
    action: NodeDetailAction
  ) => void | Promise<void>;
};

const provenanceStatusLabel: Record<ModelNodeProvenanceStatus, string> = {
  valid: 'Verified — hash chain intact',
  nodeNotFound: 'Node not found',
  notModelNode: 'Not a model node',
  missingRawApiResponse: 'No raw API response stored',
  missingParentNode: 'Missing parent node(s)',
  hashMismatch: 'HASH MISMATCH — content does not match evidence',
};

const shortHash = (value: string): string =>
  value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;

type DetailMenuItem = {
  readonly action: NodeDetailAction;
  readonly title: string;
  readonly systemIcon: string;
  readonly destructive?: boolean;
};

const buildDetailMenuItems = (state: {
  readonly bookmarked: boolean;
  readonly pruned: boolean;
}): readonly DetailMenuItem[] =>
  [
    {
      action: 'makeCurrent',
      title: 'Make Current Node',
      systemIcon: 'checkmark.circle',
    },
    {
      action: 'edit',
      title: 'Edit',
      systemIcon: 'pencil',
    },
    {
      action: 'copy',
      title: 'Copy Text',
      systemIcon: 'doc.on.doc',
    },
    {
      action: 'bookmark',
      title: state.bookmarked ? 'Remove Bookmark' : 'Bookmark',
      systemIcon: state.bookmarked ? 'bookmark.slash' : 'bookmark',
    },
    {
      action: 'prune',
      title: state.pruned ? 'Restore' : 'Prune',
      systemIcon: state.pruned ? 'arrow.uturn.backward.circle' : 'scissors',
      destructive: !state.pruned,
    },
  ] as const;

/**
 * Node detail view: full text, metadata, generation info, and the live
 * provenance verification panel. Presented as a stack route so it behaves like
 * navigation instead of a swipe-dismiss sheet.
 */
export const NodeDetailView = ({
  nodeId,
  actionError,
  onAction,
}: NodeDetailViewProps) => {
  const { colors } = useAspenGroveTheme();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { repositories } = useAppServices();
  const { loading, error, data, reload } = useNodeDetailData({
    nodeId,
    nodeRepo: repositories.nodeRepo,
    edgeRepo: repositories.edgeRepo,
    rawApiResponseRepo: repositories.rawApiResponseRepo,
  });

  const runAction = useCallback(
    async (action: NodeDetailAction) => {
      if (!data) {
        return;
      }
      await onAction(data.nodeId, action);
      if (action === 'bookmark' || action === 'prune') {
        await reload();
      }
    },
    [data, onAction, reload]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: data ? `Node ${data.localId}` : 'Node',
      headerRightContainerStyle: {
        paddingRight: 14,
      },
      headerRight: () =>
        data ? (
          <ContextMenu
            dropdownMenuMode
            actions={buildDetailMenuItems(data).map(
              (item): ContextMenuAction => ({
                title: item.title,
                systemIcon: item.systemIcon,
                destructive: item.destructive,
              })
            )}
            onPress={(event) => {
              const menuItem =
                buildDetailMenuItems(data)[event.nativeEvent.index];
              if (menuItem) {
                void runAction(menuItem.action);
              }
            }}
          >
            <HeaderIconButton
              icon="ellipsis-horizontal"
              accessibilityLabel="Node menu"
            />
          </ContextMenu>
        ) : null,
    });
  }, [data, navigation, runAction]);

  const renderRow = (label: string, value: string | undefined | null) =>
    value ? (
      <View style={styles.metaRow} key={label}>
        <AppText variant="meta" tone="secondary" style={styles.metaLabel}>
          {label}
        </AppText>
        <AppText variant="mono" tone="primary" style={styles.metaValue}>
          {value}
        </AppText>
      </View>
    ) : null;

  const provenance = data?.provenance;
  const provenanceColor = provenance
    ? provenance.isValid
      ? colors.green
      : colors.red
    : colors.secondary;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.oppositePrimary }]}
    >
      {loading ? (
        <View style={[styles.centerWrap, { paddingTop: headerHeight }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={[styles.centerWrap, { paddingTop: headerHeight }]}>
          <AppText variant="meta" tone="accent">
            {error}
          </AppText>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: headerHeight + 16 },
          ]}
        >
          {actionError ? (
            <AppText variant="meta" tone="accent" style={styles.actionError}>
              {actionError}
            </AppText>
          ) : null}

          <View style={styles.block}>
            <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
              CONTENT
            </AppText>
            <AppText variant="body" selectable style={styles.contentText}>
              {data.text}
            </AppText>
            <Pressable
              onPress={() => void runAction('copy')}
              hitSlop={6}
              style={({ pressed }) => [
                styles.copyButton,
                { opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Ionicons
                name="copy-outline"
                size={13}
                color={colors.secondary}
              />
              <AppText variant="meta" tone="secondary">
                Copy text
              </AppText>
            </Pressable>
          </View>

          <View style={styles.block}>
            <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
              METADATA
            </AppText>
            {renderRow('Local ID', data.localId)}
            {renderRow('Author', data.authorType)}
            {renderRow('Created', data.createdAt.toLocaleString())}
            {renderRow('Edited from', data.editedFrom)}
            {renderRow(
              'Flags',
              [
                data.bookmarked ? 'bookmarked' : null,
                data.pruned ? 'pruned' : null,
                data.excluded ? 'excluded' : null,
              ]
                .filter(Boolean)
                .join(', ') || undefined
            )}
            {renderRow('Content hash', shortHash(data.contentHash))}
          </View>

          {data.generation ? (
            <View style={styles.block}>
              <AppText
                variant="meta"
                tone="secondary"
                style={styles.blockLabel}
              >
                GENERATION
              </AppText>
              {renderRow('Provider', data.generation.provider)}
              {renderRow('Model', data.generation.modelIdentifier)}
              {renderRow('Request ID', data.generation.requestId)}
              {renderRow('Latency', `${data.generation.latencyMs} ms`)}
              {data.generation.tokenUsage
                ? renderRow(
                    'Tokens',
                    `${data.generation.tokenUsage.promptTokens} prompt + ` +
                      `${data.generation.tokenUsage.completionTokens} completion = ` +
                      `${data.generation.tokenUsage.totalTokens}`
                  )
                : null}
            </View>
          ) : null}

          {provenance ? (
            <View style={styles.block}>
              <AppText
                variant="meta"
                tone="secondary"
                style={styles.blockLabel}
              >
                PROVENANCE
              </AppText>
              <AppText
                variant="meta"
                style={[styles.provenanceStatus, { color: provenanceColor }]}
              >
                {provenanceStatusLabel[provenance.status]}
              </AppText>
              {renderRow(
                'Parents in chain',
                provenance.parentNodeCount !== undefined
                  ? String(provenance.parentNodeCount)
                  : undefined
              )}
              {renderRow(
                'Raw response',
                provenance.rawApiResponseId
                  ? shortHash(String(provenance.rawApiResponseId))
                  : undefined
              )}
              {renderRow(
                'Raw response hash',
                provenance.rawResponseHash
                  ? shortHash(String(provenance.rawResponseHash))
                  : undefined
              )}
              {!provenance.isValid && provenance.expectedContentHash
                ? renderRow(
                    'Expected hash',
                    shortHash(String(provenance.expectedContentHash))
                  )
                : null}
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={[styles.centerWrap, { paddingTop: headerHeight }]}>
          <AppText variant="meta" tone="accent">
            Node not found.
          </AppText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 22,
  },
  actionError: {
    fontSize: 12,
  },
  block: {
    gap: 8,
  },
  blockLabel: {
    fontSize: 12,
    letterSpacing: 0.7,
  },
  contentText: {
    lineHeight: 24,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaLabel: {
    fontSize: 12,
  },
  metaValue: {
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  provenanceStatus: {
    fontSize: 13,
  },
});
