import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  type TextStyle,
  View,
} from 'react-native';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import type { ContinuationMenuAction } from '../continuation-menu';
import type { BookmarkMenuAction } from './bookmark-menu';
import { toNodeBranchPosition } from './node-branch-position';
import type { NodeInfoMenuAction } from './node-info-menu';
import type { NodeSheetTarget } from './node-sheet-target';
import { NodeSheetDetails } from './NodeSheetDetails';
import { NodeSheetKindHeader } from './NodeSheetKindHeader';
import { useNodeSheetData } from './useNodeSheetData';

const sheet = loomUiTokens.nodeSheet;

type NodeSheetProps = {
  /** The node shown; null closes the sheet. */
  readonly target: NodeSheetTarget | null;
  readonly activePathNodeIds: readonly ULID[];
  /** The message text's font and size (Latent Spaces' loom font). */
  readonly textStyle: TextStyle;
  readonly onClose: () => void;
  /** The sheet has finished sliding away. */
  readonly onDismissed: () => void;
  /** The sheet reloads after an action that leaves it open. */
  readonly onInfoAction: (
    nodeId: ULID,
    action: NodeInfoMenuAction
  ) => void | Promise<void>;
  readonly onContinuationAction: (
    nodeId: ULID,
    action: ContinuationMenuAction
  ) => void | Promise<void>;
  readonly onBookmarkAction: (
    nodeId: ULID,
    action: BookmarkMenuAction,
    label: string | undefined
  ) => void | Promise<void>;
};

/**
 * A node in a sheet, as Latent Spaces shows one: "Node Info" from a
 * message's menu, "Continuation Node" from a card, a bookmark from the tree
 * menu. The toolbar names the model; the body is the node's whole text,
 * selectable, with Aspen Grove's metadata and provenance under it.
 */
export const NodeSheet = ({
  target,
  activePathNodeIds,
  textStyle,
  onClose,
  onDismissed,
  onInfoAction,
  onContinuationAction,
  onBookmarkAction,
}: NodeSheetProps) => {
  const { repositories } = useAppServices();
  // The last target stays drawn while the sheet slides away.
  const [shown, setShown] = useState<NodeSheetTarget | null>(target);
  useEffect(() => {
    if (target) {
      setShown(target);
    }
  }, [target]);

  const { loading, error, data, reload } = useNodeSheetData({
    nodeId: shown?.nodeId ?? null,
    nodeRepo: repositories.nodeRepo,
    edgeRepo: repositories.edgeRepo,
    rawApiResponseRepo: repositories.rawApiResponseRepo,
    agentRepo: repositories.agentRepo,
  });

  const kind = shown?.kind ?? 'info';
  const position = shown
    ? toNodeBranchPosition(shown.nodeId, activePathNodeIds)
    : null;
  // Every action reloads the sheet, for those that leave it open.
  const run = async (act: (nodeId: ULID) => void | Promise<void>) => {
    if (!data) {
      return;
    }
    await act(data.nodeId);
    await reload();
  };

  return (
    <Modal
      visible={target !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={() => {
        setShown(null);
        onDismissed();
      }}
    >
      <View testID="node-sheet" style={styles.sheet}>
        <NodeSheetKindHeader
          kind={kind}
          data={data}
          position={position}
          onInfoAction={(action) =>
            void run((nodeId) => onInfoAction(nodeId, action))
          }
          onContinuationAction={(action) =>
            void run((nodeId) => onContinuationAction(nodeId, action))
          }
          onBookmarkAction={(action) =>
            void run((nodeId) =>
              onBookmarkAction(nodeId, action, data?.bookmarkLabel)
            )
          }
          onBack={onClose}
        />

        {error ? (
          <AppText
            testID="node-sheet-error"
            variant="meta"
            tone="accent"
            style={styles.notice}
          >
            {error}
          </AppText>
        ) : data ? (
          <ScrollView
            testID="node-sheet-content"
            contentContainerStyle={styles.content}
          >
            <AppText
              testID="node-sheet-text"
              variant="body"
              selectable
              style={[textStyle, styles.text]}
            >
              {data.text}
            </AppText>
            <NodeSheetDetails data={data} />
          </ScrollView>
        ) : loading ? (
          <View testID="node-sheet-loading" style={styles.notice}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: sheet.background,
  },
  content: {
    paddingTop: sheet.textTopGap,
    gap: sheet.detailsGap,
  },
  text: {
    color: '#FFFFFF',
    paddingHorizontal: sheet.textInset,
  },
  notice: {
    paddingVertical: 40,
    paddingHorizontal: sheet.textInset,
    alignItems: 'center',
  },
});
