/**
 * The agent editor: a sheet (a modal stack) over Settings → Agents, with
 * the model browser and a model's page pushed inside it.
 */
export const agentEditorRoutes = {
  create: () => ({ pathname: '/agent-editor' }) as const,
  edit: (agentId: string) =>
    ({ pathname: '/agent-editor', params: { agentId } }) as const,
  models: () => ({ pathname: '/agent-editor/models' }) as const,
  modelDetail: (modelId: string) =>
    ({ pathname: '/agent-editor/detail', params: { modelId } }) as const,
};
