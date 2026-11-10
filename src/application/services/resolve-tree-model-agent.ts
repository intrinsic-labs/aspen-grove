import type { ILoomTreeRepository } from '@application/repositories';
import type { Agent, LoomTree } from '@domain/entities';
import type { ModelRef, ULID } from '@domain/value-objects';
import { isRoutableModelRef } from '@application/services/llm';
import {
  resolveDefaultModelAgent,
  type ResolveDefaultModelAgentDependencies,
} from './resolve-default-model-agent';

/** A model agent this tree can generate with. */
export type UsableModelAgent = Agent & { readonly modelRef: ModelRef };

export type TreeModelAgentResolution =
  /** The tree's own agent is usable. */
  | { readonly status: 'configured'; readonly agent: UsableModelAgent }
  /**
   * The tree had no usable agent (none, deleted, archived, or on a provider
   * the app can't route), so it now
   * points at the user's default model agent.
   */
  | { readonly status: 'adopted'; readonly agent: UsableModelAgent }
  /** No usable agent and no default to adopt: the user must pick one. */
  | { readonly status: 'missing' };

export type ResolveTreeModelAgentDependencies =
  ResolveDefaultModelAgentDependencies & {
    readonly loomTreeRepository: Pick<ILoomTreeRepository, 'update'>;
  };

/**
 * True when `agent` can generate in the tree `treeId`: a model agent with a
 * model the app can route (OpenRouter or LM Studio), not archived, and either
 * shared or owned by this tree.
 */
export const isUsableTreeModelAgent = (
  agent: Agent | null,
  treeId: ULID
): agent is UsableModelAgent =>
  agent !== null &&
  agent.type === 'model' &&
  !agent.archivedAt &&
  isRoutableModelRef(agent.modelRef ?? '') &&
  (!agent.ownerTreeId || agent.ownerTreeId === treeId);

/**
 * The user's default model agent if this tree can use it, else the first
 * shared model agent it can (the default may be a legacy agent on a provider
 * the app can't route).
 */
const findUsableDefault = async (
  treeId: ULID,
  dependencies: ResolveDefaultModelAgentDependencies
): Promise<UsableModelAgent | null> => {
  const preferred = await resolveDefaultModelAgent(dependencies);
  if (isUsableTreeModelAgent(preferred, treeId)) {
    return preferred;
  }
  const shared = await dependencies.agentRepository.findSharedModels(true);
  return shared.find((agent) => isUsableTreeModelAgent(agent, treeId)) ?? null;
};

/**
 * The model agent a tree generates with, as the tree is opened. A tree can
 * arrive without a usable one: imported before any agent existed, its agent
 * since deleted or archived, or a legacy agent on a provider the app can't
 * route. Then it adopts the user's default model agent
 * (`resolveDefaultModelAgent`), or else the first shared one it can use;
 * otherwise it opens without one and the dialogue asks the user to pick.
 */
export const resolveTreeModelAgent = async (
  tree: Pick<LoomTree, 'id' | 'defaultModelAgentId'>,
  dependencies: ResolveTreeModelAgentDependencies
): Promise<TreeModelAgentResolution> => {
  const current = tree.defaultModelAgentId
    ? await dependencies.agentRepository.findById(tree.defaultModelAgentId)
    : null;
  if (isUsableTreeModelAgent(current, tree.id)) {
    return { status: 'configured', agent: current };
  }

  const fallback = await findUsableDefault(tree.id, dependencies);
  if (!fallback) {
    return { status: 'missing' };
  }

  await dependencies.loomTreeRepository.update({
    id: tree.id,
    changes: { defaultModelAgentId: fallback.id },
  });
  return { status: 'adopted', agent: fallback };
};
