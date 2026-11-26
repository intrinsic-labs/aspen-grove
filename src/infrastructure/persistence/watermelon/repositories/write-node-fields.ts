import type { Node } from '@domain/entities';
import type NodeModel from '../model/Node';
import { serializeNodeMetadata } from './buffer-node-metadata';

/** Keep JSON columns, indexed flags and the persisted version family in sync. */
export function writeNodeFields(
  record: NodeModel,
  node: Node,
  versionGroupId: string
): void {
  record._raw.id = node.id;
  record.localId = node.localId;
  record.loomTreeId = node.loomTreeId;
  record.content = node.content;
  record.summary = node.summary ?? null;
  record.authorAgentId = node.authorAgentId;
  record.authorType = node.authorType;
  record.contentHash = node.contentHash;
  record.createdAt = node.createdAt;
  record.metadata = serializeNodeMetadata({}, node.metadata);
  record.bookmarked = node.metadata.bookmarked;
  record.bookmarkLabel = node.metadata.bookmarkLabel ?? null;
  record.pruned = node.metadata.pruned;
  record.excluded = node.metadata.excluded;
  record.versionGroupId = versionGroupId;
  record.editedFrom = node.editedFrom ?? null;
}
