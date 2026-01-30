/**
 * Hash Computation Service
 *
 * Provides algorithms for computing content hashes for provenance verification.
 * Hash computation differs for human-authored vs model-generated nodes.
 *
 * @see docs/architecture/model/provenance.md for the authoritative specification
 */

import * as Crypto from 'expo-crypto';
import type { Content } from '../entities/content';
import type { Ulid, Timestamp } from '../entities/base';

/**
 * Delimiter used between hash input components.
 * Using a character unlikely to appear in content.
 */
const HASH_DELIMITER = '\x1F'; // Unit Separator (ASCII 31)

/**
 * Deterministically serialize content to a string.
 *
 * This is critical for hash reproducibility - the same content
 * must always produce the same serialization.
 *
 * Keys are sorted alphabetically, no extra whitespace.
 */
export function serializeContent(content: Content): string {
  return deterministicStringify(content);
}

/**
 * Deterministic JSON stringify with sorted keys.
 * Ensures the same object always produces the same string.
 */
export function deterministicStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => deterministicStringify(item));
    return '[' + items.join(',') + ']';
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const pairs = keys.map((key) => {
      const v = (value as Record<string, unknown>)[key];
      // Skip undefined values
      if (v === undefined) {
        return null;
      }
      return JSON.stringify(key) + ':' + deterministicStringify(v);
    }).filter(Boolean);
    return '{' + pairs.join(',') + '}';
  }

  // Fallback for other types
  return JSON.stringify(value);
}

/**
 * Compute SHA-256 hash of a string and return as hex.
 */
export async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input
  );
}

/**
 * Compute SHA-256 hash of bytes and return as hex.
 * Used for hashing raw API response bytes.
 */
export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  // Convert Uint8Array to base64, then hash
  // Note: expo-crypto works with strings, so we encode the bytes
  const base64 = btoa(String.fromCharCode(...bytes));
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    base64,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
}

/**
 * Format timestamp as ISO 8601 string for hash input.
 * Ensures consistent timestamp format across all hashes.
 */
export function formatTimestampForHash(timestamp: Timestamp): string {
  return new Date(timestamp).toISOString();
}

/**
 * Inputs required for computing a human node hash.
 */
export interface HumanNodeHashInput {
  /** Serialized content (use serializeContent) */
  content: Content;

  /** Sorted array of parent node content hashes */
  parentHashes: string[];

  /** Node creation timestamp */
  createdAt: Timestamp;

  /** Author agent ID */
  authorAgentId: Ulid;
}

/**
 * Compute content hash for a human-authored node.
 *
 * Inputs to hash:
 * 1. Serialized content (deterministic JSON serialization)
 * 2. Array of parent node contentHashes (sorted)
 * 3. createdAt timestamp (ISO 8601)
 * 4. authorAgentId
 *
 * Human nodes are self-contained — all inputs are stored on the Node itself.
 */
export async function computeHumanNodeHash(
  input: HumanNodeHashInput
): Promise<string> {
  const serializedContent = serializeContent(input.content);
  const sortedParentHashes = [...input.parentHashes].sort().join('|');
  const timestamp = formatTimestampForHash(input.createdAt);

  const hashInput = [
    serializedContent,
    sortedParentHashes,
    timestamp,
    input.authorAgentId,
  ].join(HASH_DELIMITER);

  return sha256(hashInput);
}

/**
 * Inputs required for computing a model node hash.
 */
export interface ModelNodeHashInput {
  /** Serialized content */
  content: Content;

  /** Sorted array of parent node content hashes */
  parentHashes: string[];

  /** Node creation timestamp */
  createdAt: Timestamp;

  /**
   * SHA-256 hash of the raw API response bytes.
   *
   * IMPORTANT: This hash must be computed over the raw HTTP response bytes
   * (headers + body as a single blob) BEFORE any parsing or compression.
   * This ties the node hash to the actual provider response.
   *
   * For streaming responses, hash the fully assembled response content
   * after the stream completes.
   */
  rawResponseHash: string;
}

/**
 * Compute content hash for a model-generated node.
 *
 * Inputs to hash:
 * 1. Serialized content (deterministic JSON serialization)
 * 2. Array of parent node contentHashes (sorted)
 * 3. createdAt timestamp (ISO 8601)
 * 4. SHA-256 hash of the raw API response bytes
 *
 * Model nodes tie their hash to the full API response evidence.
 */
export async function computeModelNodeHash(
  input: ModelNodeHashInput
): Promise<string> {
  const serializedContent = serializeContent(input.content);
  const sortedParentHashes = [...input.parentHashes].sort().join('|');
  const timestamp = formatTimestampForHash(input.createdAt);

  const hashInput = [
    serializedContent,
    sortedParentHashes,
    timestamp,
    input.rawResponseHash,
  ].join(HASH_DELIMITER);

  return sha256(hashInput);
}

/**
 * Compute hash of raw API response bytes.
 *
 * This should be called IMMEDIATELY upon receiving the API response,
 * before any parsing or processing. The raw bytes are then stored
 * (compressed) in the RawApiResponse entity.
 *
 * For non-streaming responses:
 * - Concatenate response headers and body as raw bytes
 * - Hash the combined bytes
 *
 * For streaming responses (SSE):
 * - There are no "raw bytes" in the traditional sense
 * - Assemble the complete response content after stream completes
 * - Hash the assembled content
 * - This is still strong provenance evidence, but over assembled content
 */
export async function computeRawResponseHash(
  responseBytes: Uint8Array
): Promise<string> {
  // For string-based API (expo-crypto), we convert bytes to a string representation
  // Using hex encoding for consistent, reversible representation
  const hexString = Array.from(responseBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return sha256(hexString);
}

/**
 * Compute hash of raw response from string parts (for streaming responses).
 *
 * When dealing with streaming responses where we don't have raw bytes,
 * we hash the assembled content directly.
 */
export async function computeAssembledResponseHash(
  headers: string,
  body: string
): Promise<string> {
  const combined = headers + HASH_DELIMITER + body;
  return sha256(combined);
}

/**
 * Verification result for a single node.
 */
export interface NodeVerificationResult {
  /** The node ID that was verified */
  nodeId: Ulid;

  /** Whether the hash is valid */
  valid: boolean;

  /** The stored hash */
  storedHash: string;

  /** The computed hash */
  computedHash: string;

  /** Error message if verification failed */
  error?: string;
}

/**
 * Verify a human node's hash.
 *
 * Recomputes the hash from inputs and compares to stored hash.
 */
export async function verifyHumanNodeHash(
  nodeId: Ulid,
  storedHash: string,
  input: HumanNodeHashInput
): Promise<NodeVerificationResult> {
  try {
    const computedHash = await computeHumanNodeHash(input);

    return {
      nodeId,
      valid: computedHash === storedHash,
      storedHash,
      computedHash,
    };
  } catch (error) {
    return {
      nodeId,
      valid: false,
      storedHash,
      computedHash: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify a model node's hash.
 *
 * Requires the raw API response hash to be provided (from RawApiResponse entity).
 * If the raw response is not available, verification cannot be completed.
 */
export async function verifyModelNodeHash(
  nodeId: Ulid,
  storedHash: string,
  input: ModelNodeHashInput
): Promise<NodeVerificationResult> {
  try {
    const computedHash = await computeModelNodeHash(input);

    return {
      nodeId,
      valid: computedHash === storedHash,
      storedHash,
      computedHash,
    };
  } catch (error) {
    return {
      nodeId,
      valid: false,
      storedHash,
      computedHash: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
