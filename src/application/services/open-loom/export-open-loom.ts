import type {
  Agent,
  Content,
  Edge,
  LoomTree,
  Node,
  RawApiResponse,
} from '@domain/entities';
import { computeSha256Hash } from '@application/services/content-hash-service';
import {
  OPEN_LOOM_FORMAT,
  OPEN_LOOM_VERSION,
  type OpenLoomAgent,
  type OpenLoomContentBlock,
  type OpenLoomDocument,
  type OpenLoomEdge,
  type OpenLoomGeneration,
  type OpenLoomNode,
  type OpenLoomTree,
} from './format';

export type ExportOpenLoomOptions = {
  /** Include the tree-level system context. Default true. */
  readonly includeSystemContext?: boolean;
  /** Include agent configurations (system prompts, sampling params). Default true. */
  readonly includeAgentConfiguration?: boolean;
  /** Include Tier 3 raw API response bodies (hash-only when false). Default true. */
  readonly includeRawResponses?: boolean;
};

export type ExportOpenLoomInput = {
  readonly tree: LoomTree;
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  /** Agents referenced by node authorship / the tree default, keyed by id. */
  readonly agentsById: ReadonlyMap<string, Agent>;
  /** Provenance evidence keyed by nodeId; absent entries export Tier 1/2 only. */
  readonly rawResponsesByNodeId: ReadonlyMap<string, RawApiResponse>;
  readonly currentNodeId?: string;
  readonly generatorVersion?: string;
  readonly exportedAt?: Date;
  readonly options?: ExportOpenLoomOptions;
};

const toContentBlocks = (content: Content): OpenLoomContentBlock[] => {
  switch (content.type) {
    case 'text':
      return [{ type: 'text', text: content.text }];
    case 'image':
      return [
        {
          type: 'image',
          ref: content.ref,
          mimeType: content.mimeType,
          width: content.width,
          height: content.height,
          altText: content.altText,
        },
      ];
    case 'audio':
      return [
        {
          type: 'audio',
          ref: content.ref,
          mimeType: content.mimeType,
          durationMs: content.durationMs,
        },
      ];
    case 'mixed':
      return content.blocks.flatMap(toContentBlocks);
  }
};

/**
 * Raw-response "bytes" as hashed by the provenance chain: headers, blank
 * line, stored body (see verify-model-node-provenance.ts). The hash commits
 * to the stored representation; the encoding field tells verifiers how the
 * body is wrapped.
 */
const rawResponseBytes = (raw: RawApiResponse): string =>
  `${raw.responseHeaders}\n\n${raw.responseBody}`;

const buildGeneration = async (
  node: Node,
  parentHashes: readonly string[],
  raw: RawApiResponse | undefined,
  includeRawResponses: boolean
): Promise<OpenLoomGeneration | undefined> => {
  if (node.authorType !== 'model') {
    return undefined;
  }

  const generation: OpenLoomGeneration = {
    provider: raw?.provider,
    model: raw?.modelIdentifier,
    requestId: raw?.requestId,
    requestedAt: raw?.requestTimestamp.toISOString(),
    receivedAt: raw?.responseTimestamp.toISOString(),
    latencyMs: raw?.latencyMs,
    usage: raw?.tokenUsage,
    contentHash: `sha256:${node.contentHash}`,
    parentHashes: parentHashes.map((hash) => `sha256:${hash}`),
    hashAlgorithm: 'sha256',
    rawResponse: raw
      ? {
          bodyHash: `sha256:${await computeSha256Hash(rawResponseBytes(raw))}`,
          encoding: raw.compressionType === 'gzip' ? 'gzip+base64' : 'identity',
          ...(includeRawResponses
            ? { body: raw.responseBody, headers: raw.responseHeaders }
            : {}),
        }
      : undefined,
  };

  return generation;
};

const toOpenLoomAgent = (
  agent: Agent,
  includeConfiguration: boolean
): OpenLoomAgent => ({
  name: agent.name,
  type: agent.type,
  modelRef: agent.modelRef,
  ...(includeConfiguration && agent.type === 'model'
    ? {
        configuration: {
          systemPrompt: agent.configuration.systemPrompt,
          temperature: agent.configuration.temperature,
          maxTokens: agent.configuration.maxTokens,
          stopSequences: agent.configuration.stopSequences,
        },
      }
    : {}),
});

/**
 * Builds an Open Loom v2 document from a fully-loaded tree.
 *
 * Pure assembly — callers gather the tree, nodes, edges, agents, and raw
 * responses from repositories first. Hash-chain fields are copied from
 * stored provenance, never recomputed (spec §5: don't re-sign what you did
 * not generate); only the raw-response body hash is derived here, from the
 * same bytes the verifier uses.
 */
export const buildOpenLoomDocument = async (
  input: ExportOpenLoomInput
): Promise<OpenLoomDocument> => {
  const options = input.options ?? {};
  const includeSystemContext = options.includeSystemContext ?? true;
  const includeAgentConfiguration = options.includeAgentConfiguration ?? true;
  const includeRawResponses = options.includeRawResponses ?? true;

  // Parent hashes come from each node's incoming continuation edge sources.
  const parentHashesByNodeId = new Map<string, string[]>();
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  for (const edge of input.edges) {
    if (edge.edgeType !== 'continuation') {
      continue;
    }
    const hashes = edge.sources
      .map((source) => nodesById.get(source.nodeId)?.contentHash)
      .filter((hash): hash is Node['contentHash'] => Boolean(hash));
    parentHashesByNodeId.set(edge.targetNodeId, hashes);
  }

  const nodes: Record<string, OpenLoomNode> = {};
  for (const node of input.nodes) {
    const raw = input.rawResponsesByNodeId.get(node.id);
    nodes[node.id] = {
      id: node.id,
      content: toContentBlocks(node.content),
      author: {
        role: node.authorType,
        agentId: node.authorAgentId,
        name: input.agentsById.get(node.authorAgentId)?.name,
      },
      createdAt: node.createdAt.toISOString(),
      editedFrom: node.editedFrom,
      meta: {
        bookmarked: node.metadata.bookmarked || undefined,
        bookmarkLabel: node.metadata.bookmarkLabel,
        pruned: node.metadata.pruned || undefined,
        excluded: node.metadata.excluded || undefined,
      },
      generation: await buildGeneration(
        node,
        parentHashesByNodeId.get(node.id) ?? [],
        raw,
        includeRawResponses
      ),
      extensions: { 'aspen-grove': { localId: node.localId } },
    };
  }

  const edges: OpenLoomEdge[] = input.edges.map((edge: Edge) => ({
    id: edge.id,
    type: edge.edgeType,
    sources: edge.sources.map((source) => ({
      nodeId: source.nodeId,
      role: source.role,
    })),
    targetNodeId: edge.targetNodeId,
    createdAt: edge.createdAt.toISOString(),
  }));

  const agents: Record<string, OpenLoomAgent> = {};
  for (const [id, agent] of input.agentsById) {
    agents[id] = toOpenLoomAgent(agent, includeAgentConfiguration);
  }

  const tree: OpenLoomTree = {
    id: input.tree.id,
    title: input.tree.title,
    description: input.tree.description,
    mode: input.tree.mode,
    systemContext: includeSystemContext ? input.tree.systemContext : undefined,
    rootNodeIds: [input.tree.rootNodeId],
    currentNodeId: input.currentNodeId,
    createdAt: input.tree.createdAt.toISOString(),
    updatedAt: input.tree.updatedAt.toISOString(),
    nodes,
    edges,
    agents: Object.keys(agents).length > 0 ? agents : undefined,
  };

  return {
    format: OPEN_LOOM_FORMAT,
    version: OPEN_LOOM_VERSION,
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    generator: { name: 'Aspen Grove', version: input.generatorVersion },
    trees: [tree],
  };
};
