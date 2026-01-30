/**
 * Base Types and Enums
 *
 * Shared type definitions used across all domain entities.
 * These establish the vocabulary for the Aspen Grove domain model.
 */

// ============================================
// Identifiers
// ============================================

/**
 * ULID string type alias for clarity.
 * ULIDs are 26-character, lexicographically sortable identifiers.
 */
export type Ulid = string;

/**
 * LocalId is a 6-8 character tree-unique identifier derived from a ULID.
 * Used for efficient loom-aware model interactions.
 */
export type LocalId = string;

// ============================================
// Timestamps
// ============================================

/**
 * Unix timestamp in milliseconds.
 * Used for all date/time storage in the database.
 */
export type Timestamp = number;

// ============================================
// Core Enums
// ============================================

/**
 * The mode of a Loom Tree determines rendering and interaction behavior.
 */
export enum LoomTreeMode {
  /** Turn-based conversation with clear message boundaries */
  Dialogue = 'dialogue',
  /** Freeform collaborative text without message boundaries */
  Buffer = 'buffer',
}

/**
 * The type of agent - human or model.
 * Immutable after creation for stable hash verification.
 */
export enum AuthorType {
  Human = 'human',
  Model = 'model',
}

/**
 * Edge types define relationships between nodes.
 */
export enum EdgeType {
  /** Target node continues from source(s) - primary traversal edge */
  Continuation = 'continuation',
  /** Target node is a comment/note on source - excluded from context by default */
  Annotation = 'annotation',
}

/**
 * Role of a source node in a hyperedge.
 */
export enum EdgeSourceRole {
  /** Primary content source */
  Primary = 'primary',
  /** Additional context for generation */
  Context = 'context',
  /** Instructions/guidance for generation */
  Instruction = 'instruction',
}

/**
 * Types of entities that can be linked or tagged.
 */
export enum LinkableType {
  Node = 'node',
  LoomTree = 'loomTree',
  Document = 'document',
}

/**
 * LLM provider identifiers.
 */
export enum LlmProvider {
  OpenRouter = 'openrouter',
  Hyperbolic = 'hyperbolic',
  Anthropic = 'anthropic',
  OpenAI = 'openai',
  Google = 'google',
  Local = 'local',
  Custom = 'custom',
}

/**
 * Local model provider types.
 */
export enum LocalModelProvider {
  Local = 'local',
  Custom = 'custom',
}

/**
 * Authentication types for local models.
 */
export enum AuthType {
  None = 'none',
  Bearer = 'bearer',
  Basic = 'basic',
}

/**
 * Compression types for stored data.
 */
export enum CompressionType {
  None = 'none',
  Gzip = 'gzip',
}

/**
 * UI theme options.
 */
export enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

/**
 * Node view style options.
 */
export enum NodeViewStyle {
  Filled = 'filled',
  Outlined = 'outlined',
}

/**
 * Callout variant types for documents.
 */
export enum CalloutVariant {
  Info = 'info',
  Warning = 'warning',
  Tip = 'tip',
  Note = 'note',
}

/**
 * Display modes for embedded content in documents.
 */
export enum EmbedDisplayMode {
  Inline = 'inline',
  Card = 'card',
  Full = 'full',
  Preview = 'preview',
}

/**
 * Hash verification status.
 */
export enum VerificationStatus {
  Valid = 'valid',
  Invalid = 'invalid',
  Incomplete = 'incomplete',
}

// ============================================
// Base Entity Interface
// ============================================

/**
 * Base properties shared by all entities.
 */
export interface BaseEntity {
  /** ULID primary identifier */
  id: Ulid;
  /** Creation timestamp in milliseconds */
  createdAt: Timestamp;
}

/**
 * Extended base for entities that track updates.
 */
export interface UpdatableEntity extends BaseEntity {
  /** Last update timestamp in milliseconds */
  updatedAt: Timestamp;
}

/**
 * Extended base for entities that support soft deletion.
 */
export interface ArchivableEntity extends UpdatableEntity {
  /** Soft delete timestamp, null if active */
  archivedAt: Timestamp | null;
}
