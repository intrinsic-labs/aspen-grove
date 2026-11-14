import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { LoomTree, Tag } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useAppBootstrapState, useAppServices } from '@interface/composition';
import { byRecency } from './tree-recency';

/**
 * Home's tree list: every active dialogue tree in the grove, most recent
 * first (HomeScreenView.swift sorts by `lastModified`), reloaded whenever
 * Home comes back into view. Also the grove's tags and the optional tag
 * filter, which narrows the list to one tag's trees.
 */
export const useHomeTrees = () => {
  const { repositories } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const groveId =
    bootstrapState.status === 'ready' ? bootstrapState.result.groveId : null;

  const [trees, setTrees] = useState<readonly LoomTree[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tags, setTags] = useState<readonly Tag[]>([]);
  const [activeTagId, setActiveTagId] = useState<ULID | null>(null);
  const [taggedTreeIds, setTaggedTreeIds] = useState<ReadonlySet<ULID> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!groveId) {
      return;
    }
    try {
      const [found, groveTags] = await Promise.all([
        repositories.treeRepo.findByMode(groveId, 'dialogue', true),
        repositories.tagRepo.findTagsByGroveId(groveId),
      ]);
      setTrees([...found].sort(byRecency));
      setTags(groveTags);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoaded(true);
    }
  }, [groveId, repositories.tagRepo, repositories.treeRepo]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  // A tag that no longer exists stops filtering.
  const filterTagId =
    activeTagId && tags.some((tag) => tag.id === activeTagId)
      ? activeTagId
      : null;

  useEffect(() => {
    if (!filterTagId) {
      setTaggedTreeIds(null);
      return;
    }
    let cancelled = false;
    void repositories.tagRepo
      .findItemsByTag(filterTagId, 'loomTree')
      .then((assignments) => {
        if (!cancelled) {
          setTaggedTreeIds(new Set(assignments.map((a) => a.targetId)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTaggedTreeIds(new Set());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filterTagId, repositories.tagRepo]);

  const visibleTrees =
    filterTagId && taggedTreeIds
      ? trees.filter((tree) => taggedTreeIds.has(tree.id))
      : trees;

  return {
    trees: visibleTrees,
    loaded,
    error,
    setError,
    reload,
    tags,
    activeTag: tags.find((tag) => tag.id === filterTagId) ?? null,
    setActiveTagId,
  };
};
