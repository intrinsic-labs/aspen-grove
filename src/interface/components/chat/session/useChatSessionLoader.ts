import { useCallback, useEffect, type MutableRefObject } from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { ULID } from '@domain/value-objects';
import { toErrorMessage } from '../error-message';
import {
  initializeDialogueChatSession,
  loadDialogueRowsForPath,
} from '../session-helpers';
import type { ChatRow, ChatSession } from '../types';

type SessionRepositories = Parameters<typeof initializeDialogueChatSession>[1] &
  Parameters<typeof loadDialogueRowsForPath>[1];

type UseChatSessionLoaderInput = {
  readonly treeIdParam: string | undefined;
  /** Pass the stable services object itself: it is an effect dependency. */
  readonly repositories: SessionRepositories;
  readonly navigation: Pick<NavigationProp<ParamListBase>, 'addListener'>;
  readonly session: ChatSession | null;
  readonly activeTreeIdRef: MutableRefObject<ULID | null>;
  readonly setLoading: (loading: boolean) => void;
  readonly setError: (error: string | null) => void;
  readonly setRows: (rows: readonly ChatRow[]) => void;
  readonly setSession: (session: ChatSession) => void;
  readonly continuationSourceNodeId: ULID | null;
  readonly showContinuationsForNode: (nodeId: ULID) => Promise<void>;
  readonly resetEphemeralState: () => void;
  readonly applyTreeTitle: (title: string) => void;
};

/**
 * Loads the dialogue for the route's tree and keeps it fresh: initializes
 * on mount (and when the route's tree changes), reloads rows and the open
 * continuation rail on screen focus, and exposes the reloads the actions use.
 */
export const useChatSessionLoader = ({
  treeIdParam,
  repositories,
  navigation,
  session,
  activeTreeIdRef,
  setLoading,
  setError,
  setRows,
  setSession,
  continuationSourceNodeId,
  showContinuationsForNode,
  resetEphemeralState,
  applyTreeTitle,
}: UseChatSessionLoaderInput) => {
  const refreshRows = useCallback(
    async (nextSession: ChatSession) => {
      const nextRows = await loadDialogueRowsForPath(nextSession.pathId, {
        pathRepo: repositories.pathRepo,
        nodeRepo: repositories.nodeRepo,
        edgeRepo: repositories.edgeRepo,
      });
      setRows(nextRows.rows);
      setSession({
        ...nextSession,
        activeNodeId: nextRows.activeNodeId ?? nextSession.activeNodeId,
      });
    },
    [
      repositories.edgeRepo,
      repositories.nodeRepo,
      repositories.pathRepo,
      setRows,
      setSession,
    ]
  );

  const refreshRowsAndContinuations = useCallback(
    async (nextSession: ChatSession) => {
      await refreshRows(nextSession);
      if (continuationSourceNodeId) {
        await showContinuationsForNode(continuationSourceNodeId);
      }
    },
    [continuationSourceNodeId, refreshRows, showContinuationsForNode]
  );

  const initializeSession = useCallback(
    async (options?: { readonly preserveEphemeralState?: boolean }) => {
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
          userPreferencesRepo: repositories.userPreferencesRepo,
        });

        if (!options?.preserveEphemeralState) {
          resetEphemeralState();
        }
        activeTreeIdRef.current = initialized.treeId;

        applyTreeTitle(initialized.treeTitle);

        const initializedSession: ChatSession = initialized.session;
        await refreshRows(initializedSession);
      } catch (caught) {
        setError(toErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    },
    [
      activeTreeIdRef,
      applyTreeTitle,
      repositories,
      refreshRows,
      resetEphemeralState,
      setError,
      setLoading,
      treeIdParam,
    ]
  );

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!session) {
        return;
      }
      // Back from creating an agent elsewhere: the tree can adopt it now.
      if (!session.model) {
        void initializeSession({ preserveEphemeralState: true });
        return;
      }
      void refreshRowsAndContinuations(session);
    });

    return unsubscribe;
  }, [initializeSession, navigation, refreshRowsAndContinuations, session]);

  // Re-resolve the session after the ⚙️ sheet mutates the tree's agent or
  // system context. Preserves the ephemeral flag so an in-progress
  // conversation is never mistaken for an empty quick-add tree.
  const reinitializeSession = useCallback(async () => {
    await initializeSession({ preserveEphemeralState: true });
  }, [initializeSession]);

  return { refreshRows, refreshRowsAndContinuations, reinitializeSession };
};
