import type { SelectableProvider } from '@domain/entities';

/**
 * The tree's Model Settings and the pages it pushes, as Latent Spaces pushes
 * them (`NavigationLink`, ToolbarMenu.swift:34-38; TreeModelSettingsView.swift).
 * The model browser and a model's page name the provider whose list they show.
 */
export const treeModelRoutes = {
  settings: (treeId: string) =>
    ({ pathname: '/tree/[treeId]/model', params: { treeId } }) as const,
  models: (treeId: string, provider: SelectableProvider) =>
    ({
      pathname: '/tree/[treeId]/model/models',
      params: { treeId, provider },
    }) as const,
  modelDetail: (
    treeId: string,
    provider: SelectableProvider,
    modelId: string
  ) =>
    ({
      pathname: '/tree/[treeId]/model/detail',
      params: { treeId, provider, modelId },
    }) as const,
  systemMessage: (treeId: string) =>
    ({
      pathname: '/tree/[treeId]/model/system-message',
      params: { treeId },
    }) as const,
};
