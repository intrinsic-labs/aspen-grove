/**
 * Document Module
 *
 * Exports Document entity and related types.
 */

export type {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentFilters,
} from './document';

export type {
  DocumentBlock,
  DocumentBlockType,
  HeadingBlock,
  CodeBlock,
  CalloutBlock,
  NodeEmbedBlock,
  TreeEmbedBlock,
  DividerBlock,
} from './document-blocks';

export {
  isHeadingBlock,
  isCodeBlock,
  isCalloutBlock,
  isNodeEmbedBlock,
  isTreeEmbedBlock,
  isDividerBlock,
  isEmbedBlock,
  createHeadingBlock,
  createCodeBlock,
  createCalloutBlock,
  createNodeEmbedBlock,
  createTreeEmbedBlock,
  createDividerBlock,
} from './document-blocks';
