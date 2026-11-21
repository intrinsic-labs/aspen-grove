import type {
  IAgentRepository,
  ILoomTreeRepository,
} from '@application/repositories';
import { DEFAULT_MODEL_AGENT_PERMISSIONS } from '@application/services/agent-defaults';
import { modelAgentName } from '@application/services/model-agent-name';
import type { Agent, AgentConfiguration, LoomTree } from '@domain/entities';
import type { ModelRef, ULID } from '@domain/value-objects';

/** The tree's model settings that live on its agent. */
export type TreeModelSettingsChanges = {
  readonly modelRef?: ModelRef;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly useMaxTokens?: boolean;
  /**
   * The chosen model's display name (OpenRouter's catalog name), which names
   * the tree's agent when the model changes. Without it, a readable form of
   * the model id does.
   */
  readonly modelName?: string;
};

export type UpdateTreeModelSettingsInput = {
  readonly treeId: ULID;
  readonly changes: TreeModelSettingsChanges;
};

export type UpdateTreeModelSettingsResult = {
  /** The agent the tree now generates with, changes applied. */
  readonly agent: Agent;
  /** True when the edit made the tree its own copy of the agent first. */
  readonly forked: boolean;
};

export type UpdateTreeModelSettingsDependencies = {
  readonly agentRepository: Pick<
    IAgentRepository,
    'findById' | 'create' | 'update'
  >;
  readonly loomTreeRepository: Pick<
    ILoomTreeRepository,
    'findById' | 'update' | 'findByDefaultModelAgentId'
  >;
};

/**
 * Latent Spaces keeps provider, model and parameters on the tree. Aspen Grove
 * keeps them on the tree's agent (`LoomTree.defaultModelAgentId`), so an edit
 * made for one tree must only reach that tree:
 *
 * - The agent is the tree's own (owned by it, used by no other tree): it is
 *   edited in place.
 * - The agent is shared (a library agent, or one another tree also uses): a
 *   copy owned by this tree is made, the tree is pointed at it, and the copy
 *   is edited. The shared agent is untouched.
 * - The tree has no model agent: one owned by the tree is made, which needs
 *   a model in the changes.
 *
 * Naming: the composer addresses the agent ("Reply to …"), as Latent Spaces
 * addresses the tree's model. A copy keeps its source's name until the model
 * changes; a change of model, on a copy, a new agent or the tree's own one,
 * names the agent after the model (`modelAgentName`). The tree's title is
 * never part of it: a new tree's title is a timestamp placeholder until it
 * is auto-titled.
 *
 * Each edit reads the agent, may fork it, then writes it, so edits to one
 * tree run one after another: an overlapping edit would read the agent
 * before the first wrote it and put its old values back, or fork a second
 * copy. Keep one instance per app (the composition root does).
 */
export class UpdateTreeModelSettingsUseCase {
  private readonly agents: UpdateTreeModelSettingsDependencies['agentRepository'];
  private readonly trees: UpdateTreeModelSettingsDependencies['loomTreeRepository'];
  /** Per tree, the last edit queued; settled edits are dropped. */
  private readonly queues = new Map<ULID, Promise<unknown>>();

  constructor(dependencies: UpdateTreeModelSettingsDependencies) {
    this.agents = dependencies.agentRepository;
    this.trees = dependencies.loomTreeRepository;
  }

  execute(
    input: UpdateTreeModelSettingsInput
  ): Promise<UpdateTreeModelSettingsResult> {
    const previous = this.queues.get(input.treeId) ?? Promise.resolve();
    const run = previous.then(
      () => this.apply(input),
      () => this.apply(input)
    );
    this.queues.set(input.treeId, run);
    const forget = () => {
      if (this.queues.get(input.treeId) === run) {
        this.queues.delete(input.treeId);
      }
    };
    run.then(forget, forget);
    return run;
  }

  private async apply(
    input: UpdateTreeModelSettingsInput
  ): Promise<UpdateTreeModelSettingsResult> {
    const tree = await this.trees.findById(input.treeId);
    if (!tree) {
      throw new Error(`LoomTree not found: ${input.treeId}`);
    }
    const current = await this.currentAgent(tree);
    if (!current) {
      return {
        agent: await this.createOwned(tree, input.changes),
        forked: false,
      };
    }

    const owned = await this.isTreesOwn(current, tree);
    const target = owned ? current : await this.forkFor(tree, current);
    const { modelRef, modelName } = input.changes;
    const modelChanged =
      modelRef !== undefined && modelRef !== current.modelRef;
    const agent = await this.agents.update({
      id: target.id,
      changes: {
        ...(modelChanged ? { name: modelAgentName(modelRef, modelName) } : {}),
        modelRef,
        configuration: mergeConfiguration(target.configuration, input.changes),
      },
    });
    return { agent, forked: !owned };
  }

  private async currentAgent(tree: LoomTree): Promise<Agent | null> {
    if (!tree.defaultModelAgentId) {
      return null;
    }
    const agent = await this.agents.findById(tree.defaultModelAgentId);
    return agent && agent.type === 'model' && !agent.archivedAt ? agent : null;
  }

  /** Owned by this tree and used by no other. */
  private async isTreesOwn(agent: Agent, tree: LoomTree): Promise<boolean> {
    if (agent.ownerTreeId !== tree.id) {
      return false;
    }
    const users = await this.trees.findByDefaultModelAgentId(agent.id, false);
    return users.every((user) => user.id === tree.id);
  }

  private async forkFor(tree: LoomTree, source: Agent): Promise<Agent> {
    const fork = await this.agents.create({
      name: source.name,
      type: 'model',
      modelRef: source.modelRef,
      configuration: source.configuration,
      permissions: source.permissions,
      ownerTreeId: tree.id,
    });
    await this.pointTreeAt(tree, fork);
    return fork;
  }

  private async createOwned(
    tree: LoomTree,
    changes: TreeModelSettingsChanges
  ): Promise<Agent> {
    if (!changes.modelRef) {
      throw new Error('Choose a model for this tree first.');
    }
    const agent = await this.agents.create({
      name: modelAgentName(changes.modelRef, changes.modelName),
      type: 'model',
      modelRef: changes.modelRef,
      configuration: mergeConfiguration({}, changes),
      permissions: DEFAULT_MODEL_AGENT_PERMISSIONS,
      ownerTreeId: tree.id,
    });
    await this.pointTreeAt(tree, agent);
    return agent;
  }

  private async pointTreeAt(tree: LoomTree, agent: Agent): Promise<void> {
    await this.trees.update({
      id: tree.id,
      changes: { defaultModelAgentId: agent.id },
    });
  }
}

const mergeConfiguration = (
  base: AgentConfiguration,
  changes: TreeModelSettingsChanges
): AgentConfiguration => ({
  ...base,
  ...(changes.temperature !== undefined
    ? { temperature: changes.temperature }
    : {}),
  ...(changes.maxTokens !== undefined ? { maxTokens: changes.maxTokens } : {}),
  ...(changes.useMaxTokens !== undefined
    ? { useMaxTokens: changes.useMaxTokens }
    : {}),
});
