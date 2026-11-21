import type { MutableRefObject } from 'react';
import type { ImperativeRouter } from 'expo-router';
import type {
  NavigationProp,
  ParamListBase,
} from 'expo-router/react-navigation';
import type {
  ILoomTreeRepository,
  INodeRepository,
} from '@application/repositories';
import type { ICredentialStore } from '@application/services/security';
import type {
  ExportLoomTreeUseCase,
  ExportPathMarkdownUseCase,
  GenerateTreeTitleUseCase,
  TitleTreeFromFirstMessageUseCase,
} from '@application/use-cases';
import type { ULID } from '@domain/value-objects';
import type {
  TextPromptRequest,
  TextPromptResult,
} from '@/interface/ui/components/text-prompt/text-prompt';
import { useBookmarksRefreshKey } from '../tree-menu/useBookmarksRefreshKey';
import { useChatMenus } from '../tree-menu/useChatMenus';
import type { ChatSession } from '../types';
import { useTreeAutoTitles } from './useTreeAutoTitles';
import { useTreeExports } from './useTreeExports';
import { useTreeTitle } from './useTreeTitle';

type UseTreeHeaderActionsInput = {
  readonly navigation: Pick<NavigationProp<ParamListBase>, 'setOptions'>;
  readonly router: Pick<ImperativeRouter, 'push'>;
  readonly session: ChatSession | null;
  readonly activeTreeIdRef: MutableRefObject<ULID | null>;
  /** The path's rows: the bookmarks list reloads whenever they do. */
  readonly rows: unknown;
  readonly prompt: (request: TextPromptRequest) => Promise<TextPromptResult>;
  readonly setError: (error: string | null) => void;
  readonly treeRepo: Pick<ILoomTreeRepository, 'findById' | 'update'>;
  readonly nodeRepo: Pick<INodeRepository, 'findById' | 'findBookmarked'>;
  readonly credentialStore: ICredentialStore;
  readonly useCases: {
    readonly generateTreeTitleUseCase: Pick<
      GenerateTreeTitleUseCase,
      'execute'
    >;
    readonly titleTreeFromFirstMessageUseCase: Pick<
      TitleTreeFromFirstMessageUseCase,
      'execute'
    >;
    readonly exportLoomTreeUseCase: Pick<ExportLoomTreeUseCase, 'execute'>;
    readonly exportPathMarkdownUseCase: Pick<
      ExportPathMarkdownUseCase,
      'execute'
    >;
  };
};

/**
 * The tree's header and its menu: the title (shown, edited, and written by
 * the first message and Auto-Title), the exports, and what the tree menu
 * lists and opens (bookmarks, description, tags, export sheet, Model
 * Settings). `menu` is the part the view renders from; the rest feeds the
 * session loader, the continuation rail and a send.
 *
 * No hook here runs an effect except the bookmarks list's load.
 */
export const useTreeHeaderActions = ({
  navigation,
  router,
  session,
  activeTreeIdRef,
  rows,
  prompt,
  setError,
  treeRepo,
  nodeRepo,
  credentialStore,
  useCases,
}: UseTreeHeaderActionsInput) => {
  const bookmarks = useBookmarksRefreshKey(rows);
  const title = useTreeTitle({
    navigation,
    treeRepo,
    sessionTreeId: session?.treeId,
    activeTreeIdRef,
    prompt,
    setError,
  });
  const { maybeGenerateTreeTitle, titleFromFirstMessage } = useTreeAutoTitles({
    session,
    nodeRepo,
    credentialStore,
    generateTreeTitleUseCase: useCases.generateTreeTitleUseCase,
    titleTreeFromFirstMessageUseCase: useCases.titleTreeFromFirstMessageUseCase,
    applyTreeTitle: title.applyTreeTitle,
  });
  const exports = useTreeExports({
    session,
    activeTreeIdRef,
    exportLoomTreeUseCase: useCases.exportLoomTreeUseCase,
    exportPathMarkdownUseCase: useCases.exportPathMarkdownUseCase,
    setError,
  });
  const menus = useChatMenus({
    treeId: session?.treeId ?? activeTreeIdRef.current,
    router,
    treeRepo,
    nodeRepo,
    exportTree: exports.exportTree,
    setError,
    refreshKey: bookmarks.refreshKey,
  });

  return {
    applyTreeTitle: title.applyTreeTitle,
    maybeGenerateTreeTitle,
    titleFromFirstMessage,
    bookmarksChanged: bookmarks.bookmarksChanged,
    menu: {
      bookmarks: menus.bookmarks,
      openModelSettings: menus.openModelSettings,
      editTitle: () => void title.editTreeTitle(),
      description: menus.description,
      exportSheet: menus.exportSheet,
      exportPath: exports.exportPathMarkdown,
      tags: menus.tags,
      onChooseAgent: menus.openModelSettings,
    },
  };
};
