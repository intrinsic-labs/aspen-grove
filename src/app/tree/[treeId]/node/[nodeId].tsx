import { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import type { NodeDetailAction } from '@interface/components/chat/node-detail/NodeDetailView';
import { NodeDetailView } from '@interface/components/chat/node-detail/NodeDetailView';
import { initializeDialogueChatSession } from '@interface/components/chat/session-helpers';
import { useAppServices } from '@interface/composition';
import { parseULID, type ULID } from '@domain/value-objects';

const getParamString = (
  value: string | string[] | undefined
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const NodeDetailRoute = () => {
  const router = useRouter();
  const { repositories, useCases } = useAppServices();
  const [actionError, setActionError] = useState<string | null>(null);
  const params = useLocalSearchParams<{
    treeId?: string | string[];
    nodeId?: string | string[];
  }>();

  const treeId = useMemo(() => getParamString(params.treeId), [params.treeId]);
  const nodeId = useMemo(() => {
    const value = getParamString(params.nodeId);
    return value ? parseULID(value) : null;
  }, [params.nodeId]);

  const copyNodeText = useCallback(
    async (targetNodeId: ULID) => {
      const node = await repositories.nodeRepo.findById(targetNodeId, true);
      if (!node) {
        return;
      }
      await Clipboard.setStringAsync(
        node.content.type === 'text'
          ? node.content.text
          : `[${node.content.type}]`
      );
    },
    [repositories.nodeRepo]
  );

  const switchToNode = useCallback(
    async (targetNodeId: ULID) => {
      if (!treeId) {
        throw new Error('Missing treeId route parameter');
      }

      const initialized = await initializeDialogueChatSession(treeId, {
        treeRepo: repositories.treeRepo,
        groveRepo: repositories.groveRepo,
        agentRepo: repositories.agentRepo,
        pathRepo: repositories.pathRepo,
        pathStateRepo: repositories.pathStateRepo,
        nodeRepo: repositories.nodeRepo,
        userPreferencesRepo: repositories.userPreferencesRepo,
      });

      await useCases.switchDialoguePathUseCase.execute({
        pathId: initialized.session.pathId,
        ownerAgentId: initialized.session.ownerAgentId,
        targetNodeId,
      });
    },
    [repositories, treeId, useCases.switchDialoguePathUseCase]
  );

  const onAction = useCallback(
    async (targetNodeId: ULID, action: NodeDetailAction) => {
      setActionError(null);
      try {
        switch (action) {
          case 'makeCurrent':
            if (!treeId) {
              throw new Error('Missing treeId route parameter');
            }
            await switchToNode(targetNodeId);
            router.navigate({
              pathname: '/tree/[treeId]',
              params: { treeId },
            });
            break;
          case 'edit':
            if (!treeId) {
              throw new Error('Missing treeId route parameter');
            }
            router.navigate({
              pathname: '/tree/[treeId]',
              params: {
                treeId,
                editNodeId: targetNodeId,
                editRequestId: String(Date.now()),
              },
            });
            break;
          case 'copy':
            await copyNodeText(targetNodeId);
            break;
          case 'bookmark': {
            const node = await repositories.nodeRepo.findById(
              targetNodeId,
              true
            );
            if (node) {
              await repositories.nodeRepo.updateMetadata(targetNodeId, {
                bookmarked: !node.metadata.bookmarked,
              });
            }
            break;
          }
          case 'prune': {
            const node = await repositories.nodeRepo.findById(
              targetNodeId,
              true
            );
            if (node) {
              await repositories.nodeRepo.updateMetadata(targetNodeId, {
                pruned: !node.metadata.pruned,
              });
            }
            break;
          }
        }
      } catch (caught) {
        setActionError(
          caught instanceof Error ? caught.message : String(caught)
        );
      }
    },
    [copyNodeText, repositories.nodeRepo, router, switchToNode, treeId]
  );

  return (
    <NodeDetailView
      nodeId={nodeId}
      onAction={onAction}
      actionError={actionError}
    />
  );
};

export default NodeDetailRoute;
