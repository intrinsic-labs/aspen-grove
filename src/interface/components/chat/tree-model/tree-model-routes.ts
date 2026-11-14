/**
 * The tree's Model Settings and the pages it pushes, as Latent Spaces pushes
 * them (`NavigationLink`, ToolbarMenu.swift:34-38; TreeModelSettingsView.swift).
 */
export const treeModelRoutes = {
  settings: (treeId: string) =>
    ({ pathname: '/tree/[treeId]/model', params: { treeId } }) as const,
  openRouterModels: (treeId: string) =>
    ({ pathname: '/tree/[treeId]/model/models', params: { treeId } }) as const,
  systemMessage: (treeId: string) =>
    ({
      pathname: '/tree/[treeId]/model/system-message',
      params: { treeId },
    }) as const,
};
