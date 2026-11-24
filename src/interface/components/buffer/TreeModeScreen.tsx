import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { LoomTree } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { AppScreen } from '@/interface/ui/value-objects';
import LoomTreeChatView from '../LoomTreeChatView';
import { BufferScreen } from './BufferScreen';
import { isBufferPreviewEnabled } from './buffer-preview-flag';

type Resolved =
  | { readonly status: 'loading' }
  | { readonly status: 'dialogue' }
  | { readonly status: 'buffer'; readonly tree: LoomTree };

/**
 * The `/tree/[treeId]` screen: dispatches by the tree's saved mode, before
 * any dialogue session hook mounts. A buffer tree opens the buffer editor;
 * everything else opens the dialogue chat, with the route params untouched
 * (ephemeral creation included).
 *
 * Outside the buffer developer preview this is the dialogue chat, at once,
 * with no lookup: a released build opens every tree as it always did.
 */
const TreeModeScreen = () =>
  isBufferPreviewEnabled() ? <ModeDispatch /> : <LoomTreeChatView />;

const ModeDispatch = () => {
  const { repositories } = useAppServices();
  const { treeId } = useLocalSearchParams<{ treeId?: string | string[] }>();
  const treeIdParam = Array.isArray(treeId) ? treeId[0] : treeId;
  const [resolved, setResolved] = useState<Resolved>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setResolved({ status: 'loading' });
    const resolve = async (): Promise<Resolved> => {
      if (!treeIdParam) {
        return { status: 'dialogue' };
      }
      try {
        const tree = await repositories.treeRepo.findById(
          treeIdParam as LoomTree['id']
        );
        return tree?.mode === 'buffer'
          ? { status: 'buffer', tree }
          : { status: 'dialogue' };
      } catch {
        // The dialogue screen reports a tree it cannot load.
        return { status: 'dialogue' };
      }
    };
    void resolve().then((next) => {
      if (!cancelled) {
        setResolved(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repositories.treeRepo, treeIdParam]);

  switch (resolved.status) {
    case 'loading':
      return <AppScreen testID="tree-mode-loading">{null}</AppScreen>;
    case 'buffer':
      return <BufferScreen tree={resolved.tree} />;
    case 'dialogue':
      return <LoomTreeChatView />;
  }
};

export default TreeModeScreen;
