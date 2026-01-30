/**
 * Domain Entities
 *
 * Central export point for all domain entity types.
 * These interfaces define the vocabulary of the Aspen Grove domain model.
 */

// Base types and enums
export {
  // Type aliases
  type Ulid,
  type LocalId,
  type Timestamp,

  // Core enums
  LoomTreeMode,
  AuthorType,
  EdgeType,
  EdgeSourceRole,
  LinkableType,
  LlmProvider,
  LocalModelProvider,
  AuthType,
  CompressionType,
  Theme,
  NodeViewStyle,
  CalloutVariant,
  EmbedDisplayMode,
  VerificationStatus,

  // Base interfaces
  type BaseEntity,
  type UpdatableEntity,
  type ArchivableEntity,
} from './base';

// Content types
export {
  type TextContent,
  type ImageContent,
  type AudioContent,
  type MixedContent,
  type Content,
  type ContentType,
  isTextContent,
  isImageContent,
  isAudioContent,
  isMixedContent,
  isContent,
  createTextContent,
  createImageContent,
  createAudioContent,
  createMixedContent,
  getContentType,
} from './content';

// Node
export {
  type Node,
  type CreateNodeInput,
  type NodeFilters,
  type NodeMetadata,
  DEFAULT_NODE_METADATA,
  createNodeMetadata,
  isNodeMetadata,
} from './node';

// Edge
export {
  type Edge,
  type CreateEdgeInput,
  type EdgeFilters,
  type EdgeSource,
  createEdgeSource,
  createPrimarySource,
  isEdgeSource,
  isEdgeSourceArray,
} from './edge';

// Loom Tree
export {
  type LoomTree,
  type CreateLoomTreeInput,
  type LoomTreeFilters,
  type UpdateLoomTreeInput,
} from './loom-tree';

// Grove
export { type Grove, type CreateGroveInput, type UpdateGroveInput } from './grove';

// Agent
export {
  type Agent,
  type CreateAgentInput,
  type UpdateAgentInput,
  type AgentFilters,
  type AgentConfiguration,
  type AgentPermissions,
  type ModelCapabilities,
  isHumanAgent,
  isModelAgent,
  parseModelRef,
  createModelRef,
  DEFAULT_AGENT_CONFIGURATION,
  DEFAULT_AGENT_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
  DEFAULT_MODEL_CAPABILITIES,
  createAgentConfiguration,
  createAgentPermissions,
  createModelCapabilities,
  isAgentConfiguration,
  isAgentPermissions,
  isModelCapabilities,
  canHandleContentType,
} from './agent';

// User (UserPreferences and LocalModel)
export {
  type UserPreferences,
  type CreateUserPreferencesInput,
  type UpdateUserPreferencesInput,
  type LocalModel,
  type CreateLocalModelInput,
  type UpdateLocalModelInput,
  type LocalModelFilters,
  type AuthConfig,
  DEFAULT_USER_PREFERENCES,
  NO_AUTH_CONFIG,
  createAuthConfig,
  isAuthConfig,
  createLocalModelRef,
  isLocalModelRef,
  parseLocalModelRef,
} from './user';

// Document
export {
  type Document,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type DocumentFilters,
  type DocumentBlock,
  type DocumentBlockType,
  type HeadingBlock,
  type CodeBlock,
  type CalloutBlock,
  type NodeEmbedBlock,
  type TreeEmbedBlock,
  type DividerBlock,
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
} from './document';

// Organization (Link and Tag)
export {
  type Link,
  type CreateLinkInput,
  type LinkedItemRef,
  type Tag,
  type CreateTagInput,
  type UpdateTagInput,
  type TagAssignment,
  type CreateTagAssignmentInput,
  type TaggedItemRef,
  createLinkedItemRef,
  isSameConnection,
  getOtherEnd,
} from './organization';

// Provenance
export {
  type RawApiResponse,
  type CreateRawApiResponseInput,
  type TokenUsage,
  type TimestampCertificate,
  type CreateTimestampCertificateInput,
  type ProvenanceView,
  type PathProvenanceView,
  createTokenUsage,
  isTokenUsage,
  calculateLatency,
  TimestampStatus,
  DEFAULT_TIMESTAMP_AUTHORITY,
  FALLBACK_TIMESTAMP_AUTHORITIES,
  getTimestampStatus,
  isCertificateValid,
  HashChainStatus,
  ApiEvidenceStatus,
  createUnverifiedProvenanceView,
  computeOverallHashStatus,
} from './provenance';
