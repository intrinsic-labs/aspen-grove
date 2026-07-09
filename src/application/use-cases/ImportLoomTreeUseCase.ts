import type {
  IAgentRepository,
  IEdgeRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
  IUserPreferencesRepository,
} from '@application/repositories';
import { computeHumanContentHash } from '@application/services/content-hash-service';
import {
  parseLoomImport,
  type LoomImportFormat,
  type OpenLoomContentBlock,
  type OpenLoomNode,
  type OpenLoomTree,
} from '@application/services/open-loom';
import { resolveDefaultModelAgent } from '@application/services/resolve-default-model-agent';
import type {
  AgentType,
  Content,
  ContentBlock,
  EdgeSource,
  LoomTreeMode,
} from '@domain/entities';
import {
  createLocalId,
  createULID,
  parseModelRef,
  type ContentHash,
  type LocalId,
  type ULID,
} from '@domain/value-objects';

export type ImportLoomTreeInput = {
  readonly groveId: ULID;
  readonly ownerAgentId: ULID;
  /** Raw file contents (JSON text). */
  readonly raw: string;
};

export type ImportedTreeSummary = {
  readonly treeId: ULID;
  readonly title: string;
  readonly nodeCount: number;
};

export type ImportLoomTreeResult = {
  readonly sourceFormat: LoomImportFormat;
  readonly trees: readonly ImportedTreeSummary[];
  readonly warnings: readonly string[];
};

export type ImportLoomTreeDependencies = {
  readonly loomTreeRepository: Pick<
    ILoomTreeRepository,
    'create' | 'hardDelete'
  >;
  readonly nodeRepository: Pick<
    INodeRepository,
    'create' | 'updateMetadata' | 'hardDelete'
  >;
  readonly edgeRepository: Pick<IEdgeRepository, 'create'>;
  readonly agentRepository: Pick<
    IAgentRepository,
    'create' | 'findById' | 'findSharedModels'
  >;
  readonly pathRepository: Pick<IPathRepository, 'create' | 'appendNode'>;
  readonly pathStateRepository: Pick<IPathStateRepository, 'create'>;
  readonly userPreferencesRepository: Pick<
    IUserPreferencesRepository,
    'get' | 'update'
  >;
};

const blockToContent = (block: OpenLoomContentBlock): ContentBlock => {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text };
    case 'image':
      return {
        type: 'image',
        ref: block.ref,
        mimeType: block.mimeType,
        width: block.width ?? 0,
        height: block.height ?? 0,
        altText: block.altText,
      };
    case 'audio':
      return {
        type: 'audio',
        ref: block.ref,
        mimeType: block.mimeType,
        durationMs: block.durationMs ?? 0,
      };
  }
};

const blocksToContent = (
  blocks: readonly OpenLoomContentBlock[]
): Content => {
  const converted = blocks.map(blockToContent);
  if (converted.length === 0) {
    return { type: 'text', text: '' };
  }
  if (converted.length === 1) {
    return converted[0];
  }
  return { type: 'mixed', blocks: converted };
};

const parseDate = (value: string | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed);
};

/**
 * Imports a loom file (any supported format — spec §8) as a new tree.
 *
 * Structure and timestamps are preserved; IDs are re-minted as ULIDs.
 * Content hashes are recomputed under Aspen Grove's human-node scheme —
 * foreign provenance claims are not re-signed (spec §5), so imported model
 * nodes carry no local provenance evidence and verify as such.
 */
export class ImportLoomTreeUseCase {
  private readonly deps: ImportLoomTreeDependencies;

  constructor(dependencies: ImportLoomTreeDependencies) {
    this.deps = dependencies;
  }

  async execute(input: ImportLoomTreeInput): Promise<ImportLoomTreeResult> {
    const { sourceFormat, document } = parseLoomImport(input.raw);
    const warnings: string[] = [];
    const summaries: ImportedTreeSummary[] = [];

    const defaultAgent = await resolveDefaultModelAgent({
      agentRepository: this.deps.agentRepository,
      userPreferencesRepository: this.deps.userPreferencesRepository,
    });
    if (!defaultAgent) {
      warnings.push(
        'No model agent configured yet — imported trees need an agent assigned before generating.'
      );
    }

    for (const tree of document.trees) {
      summaries.push(
        await this.importTree(tree, input, sourceFormat, defaultAgent?.id, warnings)
      );
    }

    return { sourceFormat, trees: summaries, warnings };
  }

  private async importTree(
    source: OpenLoomTree,
    input: ImportLoomTreeInput,
    sourceFormat: LoomImportFormat,
    defaultModelAgentId: ULID | undefined,
    warnings: string[]
  ): Promise<ImportedTreeSummary> {
    const treeId = createULID();
    const createdNodeIds: ULID[] = [];
    let treeCreated = false;

    try {
      // --- Plan topology ------------------------------------------------
      const sourceNodes = Object.values(source.nodes);
      const idMap = new Map<string, ULID>();
      for (const node of sourceNodes) {
        idMap.set(node.id, createULID());
      }

      // Primary-parent map from continuation edges (first edge wins for
      // strict-tree semantics; extras are preserved as edges regardless).
      const primaryParent = new Map<string, string>();
      const childrenOf = new Map<string, string[]>();
      for (const edge of source.edges) {
        if (edge.type !== 'continuation') {
          continue;
        }
        const primary =
          edge.sources.find((s) => (s.role ?? 'primary') === 'primary') ??
          edge.sources[0];
        if (!primary || primaryParent.has(edge.targetNodeId)) {
          continue;
        }
        primaryParent.set(edge.targetNodeId, primary.nodeId);
        const siblings = childrenOf.get(primary.nodeId) ?? [];
        siblings.push(edge.targetNodeId);
        childrenOf.set(primary.nodeId, siblings);
      }

      // Roots: asserted rootNodeIds, repaired against actual topology.
      const roots = source.rootNodeIds.filter(
        (id) => source.nodes[id] && !primaryParent.has(id)
      );
      for (const node of sourceNodes) {
        if (!primaryParent.has(node.id) && !roots.includes(node.id)) {
          roots.push(node.id);
          warnings.push(`Recovered unlisted root node in "${source.title}".`);
        }
      }
      if (roots.length === 0) {
        throw new Error(`Tree "${source.title}" has no root node.`);
      }

      // Domain trees have exactly one root: synthesize one for multi-root.
      let syntheticRoot: OpenLoomNode | null = null;
      if (roots.length > 1) {
        syntheticRoot = {
          id: `synthetic-root-${treeId}`,
          content: [{ type: 'text', text: '' }],
          author: { role: 'human' },
        };
        idMap.set(syntheticRoot.id, createULID());
        childrenOf.set(syntheticRoot.id, [...roots]);
        for (const root of roots) {
          primaryParent.set(root, syntheticRoot.id);
        }
      }
      const rootSourceId = syntheticRoot ? syntheticRoot.id : roots[0];

      // Topological order: BFS from the root along primary-parent links.
      const ordered: OpenLoomNode[] = [];
      const queue: string[] = [rootSourceId];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const id = queue.shift() as string;
        if (visited.has(id)) {
          continue;
        }
        visited.add(id);
        const node =
          id === syntheticRoot?.id ? syntheticRoot : source.nodes[id];
        if (node) {
          ordered.push(node);
        }
        queue.push(...(childrenOf.get(id) ?? []));
      }
      const unreachable = sourceNodes.filter((node) => !visited.has(node.id));
      if (unreachable.length > 0) {
        warnings.push(
          `Skipped ${unreachable.length} unreachable node(s) in "${source.title}".`
        );
      }

      // --- Author mapping -----------------------------------------------
      // Model-authored nodes attribute to one tree-owned placeholder agent;
      // human/system/mixed map to the importing user.
      let importAgentId: ULID | null = null;
      const ensureImportAgent = async (): Promise<ULID> => {
        if (importAgentId) {
          return importAgentId;
        }
        const modelNames = new Set(
          ordered
            .map((node) => node.generation?.model)
            .filter((model): model is string => Boolean(model))
        );
        const label =
          modelNames.size === 1
            ? [...modelNames][0]
            : `imported (${sourceFormat})`;
        const agent = await this.deps.agentRepository.create({
          name: `Imported · ${label}`.slice(0, 60),
          type: 'model',
          modelRef: parseModelRef('custom:imported'),
          ownerTreeId: treeId,
        });
        importAgentId = agent.id;
        return agent.id;
      };

      // --- Create nodes (topological, hashing as we go) -------------------
      const hashBySourceId = new Map<string, ContentHash>();
      const localIds = new Set<LocalId>();
      const nodeMetaFixups: Array<{
        id: ULID;
        meta: NonNullable<OpenLoomNode['meta']>;
      }> = [];

      for (const node of ordered) {
        const newId = idMap.get(node.id) as ULID;
        const content = blocksToContent(node.content);
        const role = node.author.role;
        const authorType: AgentType = role === 'model' ? 'model' : 'human';
        const authorAgentId =
          authorType === 'model'
            ? await ensureImportAgent()
            : input.ownerAgentId;
        const createdAt = parseDate(node.createdAt) ?? new Date();

        const parentSourceId = primaryParent.get(node.id);
        const parentHashes: ContentHash[] = [];
        if (parentSourceId) {
          const parentHash = hashBySourceId.get(parentSourceId);
          if (parentHash) {
            parentHashes.push(parentHash);
          }
        }

        const contentHash = await computeHumanContentHash(
          content,
          parentHashes,
          createdAt,
          authorAgentId
        );
        hashBySourceId.set(node.id, contentHash);

        const localId = createLocalId(newId, localIds);
        localIds.add(localId);

        await this.deps.nodeRepository.create({
          id: newId,
          createdAt,
          loomTreeId: treeId,
          localId,
          content,
          authorAgentId,
          authorType,
          contentHash,
          editedFrom:
            node.editedFrom && idMap.has(node.editedFrom)
              ? idMap.get(node.editedFrom)
              : undefined,
        });
        createdNodeIds.push(newId);

        if (
          node.meta &&
          (node.meta.bookmarked || node.meta.pruned || node.meta.excluded)
        ) {
          nodeMetaFixups.push({ id: newId, meta: node.meta });
        }
      }

      // --- Create edges ----------------------------------------------------
      // Synthetic-root edges first, then source edges verbatim (remapped).
      if (syntheticRoot) {
        for (const root of roots) {
          await this.deps.edgeRepository.create({
            loomTreeId: treeId,
            sources: [
              {
                nodeId: idMap.get(syntheticRoot.id) as ULID,
                role: 'primary',
              },
            ],
            targetNodeId: idMap.get(root) as ULID,
            edgeType: 'continuation',
          });
        }
      }
      for (const edge of source.edges) {
        const target = idMap.get(edge.targetNodeId);
        const sources: EdgeSource[] = edge.sources
          .filter((s) => idMap.has(s.nodeId) && visited.has(s.nodeId))
          .map((s) => ({
            nodeId: idMap.get(s.nodeId) as ULID,
            role: s.role ?? 'primary',
          }));
        if (!target || !visited.has(edge.targetNodeId) || sources.length === 0) {
          continue;
        }
        await this.deps.edgeRepository.create({
          loomTreeId: treeId,
          sources,
          targetNodeId: target,
          // Unknown edge types traverse as annotations (spec §4.4).
          edgeType: edge.type === 'continuation' ? 'continuation' : 'annotation',
        });
      }

      // --- Metadata flags ---------------------------------------------------
      for (const fixup of nodeMetaFixups) {
        await this.deps.nodeRepository.updateMetadata(fixup.id, {
          bookmarked: fixup.meta.bookmarked ?? false,
          bookmarkLabel: fixup.meta.bookmarkLabel ?? null,
          pruned: fixup.meta.pruned ?? false,
          excluded: fixup.meta.excluded ?? false,
        });
      }

      // --- Tree, path, cursor ----------------------------------------------
      const mode: LoomTreeMode =
        source.mode === 'buffer' ? 'buffer' : 'dialogue';
      await this.deps.loomTreeRepository.create({
        id: treeId,
        groveId: input.groveId,
        rootNodeId: idMap.get(rootSourceId) as ULID,
        mode,
        title: source.title || `Imported Loom (${sourceFormat})`,
        description: source.description,
        systemContext: source.systemContext,
        defaultModelAgentId,
      });
      treeCreated = true;

      // Active path: root → currentNodeId when resolvable, else the
      // first-child chain from the root.
      const pathSourceIds = this.resolvePathSourceIds(
        rootSourceId,
        source.currentNodeId && visited.has(source.currentNodeId)
          ? source.currentNodeId
          : undefined,
        primaryParent,
        childrenOf
      );
      const path = await this.deps.pathRepository.create({
        loomTreeId: treeId,
        ownerAgentId: input.ownerAgentId,
        name: 'Main',
      });
      for (const sourceId of pathSourceIds) {
        await this.deps.pathRepository.appendNode(
          path.id,
          idMap.get(sourceId) as ULID
        );
      }
      await this.deps.pathStateRepository.create({
        pathId: path.id,
        agentId: input.ownerAgentId,
        mode,
        activeNodeId: idMap.get(
          pathSourceIds[pathSourceIds.length - 1]
        ) as ULID,
      });

      return {
        treeId,
        title: source.title || `Imported Loom (${sourceFormat})`,
        nodeCount: createdNodeIds.length,
      };
    } catch (error) {
      // Best-effort rollback: tree hard-delete cascades nodes/edges/paths;
      // if the tree row never landed, sweep the orphaned nodes directly.
      try {
        if (treeCreated) {
          await this.deps.loomTreeRepository.hardDelete(treeId);
        } else {
          for (const nodeId of createdNodeIds) {
            await this.deps.nodeRepository.hardDelete(nodeId);
          }
        }
      } catch {
        // no-op
      }
      throw error;
    }
  }

  private resolvePathSourceIds(
    rootSourceId: string,
    currentSourceId: string | undefined,
    primaryParent: ReadonlyMap<string, string>,
    childrenOf: ReadonlyMap<string, string[]>
  ): string[] {
    if (currentSourceId) {
      const chain: string[] = [];
      let cursor: string | undefined = currentSourceId;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        chain.unshift(cursor);
        if (cursor === rootSourceId) {
          return chain;
        }
        cursor = primaryParent.get(cursor);
      }
      // Fell off the root — fall through to first-child walk.
    }

    const chain: string[] = [rootSourceId];
    let cursor = rootSourceId;
    const seen = new Set<string>([rootSourceId]);
    for (;;) {
      const firstChild = (childrenOf.get(cursor) ?? [])[0];
      if (!firstChild || seen.has(firstChild)) {
        return chain;
      }
      seen.add(firstChild);
      chain.push(firstChild);
      cursor = firstChild;
    }
  }
}
