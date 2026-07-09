/**
 * Open Loom v2 — TypeScript model of the interchange format.
 *
 * Mirrors docs/open-loom/spec.md exactly. These types describe the wire
 * format (plain JSON), not domain entities; timestamps are ISO-8601 strings
 * and all IDs are opaque strings.
 */

export const OPEN_LOOM_FORMAT = 'open-loom';
export const OPEN_LOOM_VERSION = '2.0';

export type OpenLoomDocument = {
  readonly format: typeof OPEN_LOOM_FORMAT;
  readonly version: string;
  readonly exportedAt?: string;
  readonly generator?: { readonly name: string; readonly version?: string };
  readonly trees: readonly OpenLoomTree[];
  readonly agents?: Readonly<Record<string, OpenLoomAgent>>;
  readonly extensions?: OpenLoomExtensions;
};

export type OpenLoomTree = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly mode?: string;
  readonly systemContext?: string;
  readonly rootNodeIds: readonly string[];
  readonly currentNodeId?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly nodes: Readonly<Record<string, OpenLoomNode>>;
  readonly edges: readonly OpenLoomEdge[];
  readonly tags?: readonly OpenLoomTagDef[];
  readonly agents?: Readonly<Record<string, OpenLoomAgent>>;
  readonly extensions?: OpenLoomExtensions;
};

export type OpenLoomNode = {
  readonly id: string;
  readonly content: readonly OpenLoomContentBlock[];
  readonly author: OpenLoomAuthor;
  readonly createdAt?: string;
  readonly editedFrom?: string;
  readonly meta?: OpenLoomNodeMeta;
  readonly generation?: OpenLoomGeneration;
  readonly extensions?: OpenLoomExtensions;
};

export type OpenLoomAuthorRole = 'human' | 'model' | 'system' | 'mixed';

export type OpenLoomAuthor = {
  readonly role: OpenLoomAuthorRole;
  readonly agentId?: string;
  readonly name?: string;
};

export type OpenLoomContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | {
      readonly type: 'image';
      readonly ref: string;
      readonly mimeType: string;
      readonly width?: number;
      readonly height?: number;
      readonly altText?: string;
    }
  | {
      readonly type: 'audio';
      readonly ref: string;
      readonly mimeType: string;
      readonly durationMs?: number;
      readonly transcript?: string;
    };

export type OpenLoomNodeMeta = {
  readonly bookmarked?: boolean;
  readonly bookmarkLabel?: string;
  readonly pruned?: boolean;
  readonly excluded?: boolean;
  readonly tags?: readonly string[];
  readonly rating?: number;
  readonly note?: string;
};

export type OpenLoomEdge = {
  readonly id?: string;
  readonly type: string;
  readonly sources: readonly OpenLoomEdgeSource[];
  readonly targetNodeId: string;
  readonly createdAt?: string;
  readonly extensions?: OpenLoomExtensions;
};

export type OpenLoomEdgeSource = {
  readonly nodeId: string;
  readonly role?: 'primary' | 'context' | 'instruction';
};

export type OpenLoomTagDef = {
  readonly name: string;
  readonly color?: string;
};

export type OpenLoomAgent = {
  readonly name: string;
  readonly type: 'human' | 'model';
  readonly modelRef?: string;
  readonly configuration?: {
    readonly systemPrompt?: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly stopSequences?: readonly string[];
    readonly [key: string]: unknown;
  };
};

export type OpenLoomGeneration = {
  // Tier 1 — descriptive
  readonly provider?: string;
  readonly model?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly requestId?: string;
  readonly requestedAt?: string;
  readonly receivedAt?: string;
  readonly latencyMs?: number;
  readonly usage?: {
    readonly promptTokens?: number;
    readonly completionTokens?: number;
    readonly totalTokens?: number;
  };
  readonly completionIndex?: number;
  // Tier 2 — integrity
  readonly contentHash?: string;
  readonly parentHashes?: readonly string[];
  readonly hashAlgorithm?: string;
  // Tier 3 — evidence
  readonly rawResponse?: {
    readonly bodyHash?: string;
    readonly encoding?: string;
    readonly body?: string;
    readonly headers?: Readonly<Record<string, string>> | string;
  };
};

export type OpenLoomExtensions = Readonly<Record<string, unknown>>;
