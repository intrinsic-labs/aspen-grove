import type {
  IAgentRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import type { Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

export type ResolveNodeModelLabelsDependencies = {
  readonly rawApiResponseRepository: Pick<
    IRawApiResponseRepository,
    'findModelIdentifiersByNodeIds'
  >;
  readonly agentRepository: Pick<IAgentRepository, 'findById'>;
};

type LabelledNode = Pick<Node, 'id' | 'authorType' | 'authorAgentId'>;

/** What a person's node is called where Latent Spaces shows a model id. */
export const HUMAN_NODE_LABEL = 'User';
export const SYSTEM_NODE_LABEL = 'System';

/**
 * The label Latent Spaces shows above a continuation and under a node
 * sheet's title (`Node.modelId`): the model a node came from, "User" for a
 * person's node and "System" for a system message.
 *
 * A model node's id is the one its raw API response recorded. A model node
 * without one (imported from another loom) falls back to its author agent's
 * name, and to "Model" if that agent is gone.
 */
export const resolveNodeModelLabels = async (
  nodes: readonly LabelledNode[],
  dependencies: ResolveNodeModelLabelsDependencies
): Promise<ReadonlyMap<ULID, string>> => {
  const modelNodes = nodes.filter((node) => node.authorType === 'model');
  const recorded =
    modelNodes.length > 0
      ? await dependencies.rawApiResponseRepository.findModelIdentifiersByNodeIds(
          modelNodes.map((node) => node.id)
        )
      : new Map<ULID, string>();

  const unrecordedAgentIds = [
    ...new Set(
      modelNodes
        .filter((node) => !recorded.has(node.id))
        .map((node) => node.authorAgentId)
    ),
  ];
  const agents = await Promise.all(
    unrecordedAgentIds.map((agentId) =>
      dependencies.agentRepository.findById(agentId)
    )
  );
  const agentNames = new Map(
    unrecordedAgentIds.map((agentId, index) => [
      agentId,
      agents[index]?.name ?? 'Model',
    ])
  );

  return new Map(
    nodes.map((node) => {
      switch (node.authorType) {
        case 'human':
          return [node.id, HUMAN_NODE_LABEL];
        case 'system':
          return [node.id, SYSTEM_NODE_LABEL];
        default:
          return [
            node.id,
            recorded.get(node.id) ??
              agentNames.get(node.authorAgentId) ??
              'Model',
          ];
      }
    })
  );
};
