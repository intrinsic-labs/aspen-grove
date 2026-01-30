/**
 * Link Repository Implementation (Stub)
 *
 * WatermelonDB implementation of ILinkRepository.
 * Manages persistence for Link entities (bidirectional references between items).
 *
 * NOTE: This is a stub implementation for Phase 1.
 * Full implementation planned for Phase 5 (Tree Operations).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type { ILinkRepository } from '../../../application/repositories';
import type { Link, CreateLinkInput, Ulid } from '../../../domain';
import { LinkableType } from '../../../domain';
import { LinkModel, NodeModel, LoomTreeModel, DocumentModel } from '../models';

/**
 * Convert a LinkModel to a domain Link entity.
 */
function toDomain(model: LinkModel): Link {
  return model.toDomain();
}

/**
 * WatermelonDB implementation of Link repository.
 *
 * @remarks Stub implementation - some methods throw NotImplementedError
 */
export class LinkRepository implements ILinkRepository {
  constructor(private database: Database) {}

  async create(input: CreateLinkInput): Promise<Link> {
    const collection = this.database.get<LinkModel>('links');

    const now = Date.now();

    const created = await this.database.write(async () => {
      return collection.create((link) => {
        link._raw.id = input.id;
        link.groveId = input.groveId;
        link.sourceType = input.sourceType;
        link.sourceId = input.sourceId;
        link.targetType = input.targetType;
        link.targetId = input.targetId;
        link.label = input.label ?? null;
        // Set readonly field via _raw
        (link._raw as Record<string, unknown>).created_at = now;
      });
    });

    return toDomain(created);
  }

  async findById(id: Ulid): Promise<Link | null> {
    try {
      const collection = this.database.get<LinkModel>('links');
      const model = await collection.find(id);
      return toDomain(model);
    } catch {
      return null;
    }
  }

  async findBySource(sourceType: LinkableType, sourceId: Ulid): Promise<Link[]> {
    const collection = this.database.get<LinkModel>('links');
    const results = await collection
      .query(Q.where('source_type', sourceType), Q.where('source_id', sourceId))
      .fetch();

    return results.map(toDomain);
  }

  async findByTarget(targetType: LinkableType, targetId: Ulid): Promise<Link[]> {
    const collection = this.database.get<LinkModel>('links');
    const results = await collection
      .query(Q.where('target_type', targetType), Q.where('target_id', targetId))
      .fetch();

    return results.map(toDomain);
  }

  async findConnections(itemType: LinkableType, itemId: Ulid): Promise<Link[]> {
    const collection = this.database.get<LinkModel>('links');

    // Find links where item is source OR target
    const asSource = await collection
      .query(Q.where('source_type', itemType), Q.where('source_id', itemId))
      .fetch();

    const asTarget = await collection
      .query(Q.where('target_type', itemType), Q.where('target_id', itemId))
      .fetch();

    // Deduplicate by ID (in case same link matches both, which shouldn't happen but be safe)
    const seen = new Set<string>();
    const combined: LinkModel[] = [];

    for (const link of [...asSource, ...asTarget]) {
      if (!seen.has(link.id)) {
        seen.add(link.id);
        combined.push(link);
      }
    }

    return combined.map(toDomain);
  }

  async delete(id: Ulid): Promise<boolean> {
    const collection = this.database.get<LinkModel>('links');

    let model: LinkModel;
    try {
      model = await collection.find(id);
    } catch {
      return false;
    }

    await this.database.write(async () => {
      await model.destroyPermanently();
    });

    return true;
  }

  async deleteOrphaned(): Promise<number> {
    const linksCollection = this.database.get<LinkModel>('links');
    const nodesCollection = this.database.get<NodeModel>('nodes');
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');
    const docsCollection = this.database.get<DocumentModel>('documents');

    // Fetch all links
    const allLinks = await linksCollection.query().fetch();

    if (allLinks.length === 0) {
      return 0;
    }

    // Fetch all existing entities by type
    const existingNodes = await nodesCollection.query().fetch();
    const existingTrees = await treesCollection.query().fetch();
    const existingDocs = await docsCollection.query().fetch();

    // Create sets for O(1) lookup
    const nodeIds = new Set(existingNodes.map((n) => n.id));
    const treeIds = new Set(existingTrees.map((t) => t.id));
    const docIds = new Set(existingDocs.map((d) => d.id));

    // Find orphaned links (where source or target no longer exists)
    const orphanedLinks: LinkModel[] = [];

    for (const link of allLinks) {
      let sourceExists = false;
      let targetExists = false;

      // Check if source exists
      if (link.sourceType === LinkableType.Node) {
        sourceExists = nodeIds.has(link.sourceId);
      } else if (link.sourceType === LinkableType.LoomTree) {
        sourceExists = treeIds.has(link.sourceId);
      } else if (link.sourceType === LinkableType.Document) {
        sourceExists = docIds.has(link.sourceId);
      }

      // Check if target exists
      if (link.targetType === LinkableType.Node) {
        targetExists = nodeIds.has(link.targetId);
      } else if (link.targetType === LinkableType.LoomTree) {
        targetExists = treeIds.has(link.targetId);
      } else if (link.targetType === LinkableType.Document) {
        targetExists = docIds.has(link.targetId);
      }

      // If either source or target is missing, the link is orphaned
      if (!sourceExists || !targetExists) {
        orphanedLinks.push(link);
      }
    }

    if (orphanedLinks.length === 0) {
      return 0;
    }

    // Delete all orphaned links in a transaction
    await this.database.write(async () => {
      for (const link of orphanedLinks) {
        await link.destroyPermanently();
      }
    });

    return orphanedLinks.length;
  }

  async deleteByItem(itemType: LinkableType, itemId: Ulid): Promise<number> {
    const collection = this.database.get<LinkModel>('links');

    // Find all links involving this item
    const links = await this.findConnections(itemType, itemId);

    if (links.length === 0) {
      return 0;
    }

    await this.database.write(async () => {
      for (const link of links) {
        const model = await collection.find(link.id);
        await model.destroyPermanently();
      }
    });

    return links.length;
  }

  async findByGrove(groveId: Ulid): Promise<Link[]> {
    const collection = this.database.get<LinkModel>('links');
    const results = await collection.query(Q.where('grove_id', groveId)).fetch();

    return results.map(toDomain);
  }

  async countForItem(itemType: LinkableType, itemId: Ulid): Promise<number> {
    const links = await this.findConnections(itemType, itemId);
    return links.length;
  }
}
