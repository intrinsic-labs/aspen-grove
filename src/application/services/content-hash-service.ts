import * as Crypto from 'expo-crypto';
import { Content } from '@domain/entities';
import { ContentHash, ULID } from '@domain/value-objects';

const DELIMITER = '=|d|=';

const sortKeys = (obj: unknown): unknown => {
  if (obj === null || typeof obj != 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  return Object.keys(obj)
    .sort()
    .reduce(
      (sorted, key) => {
        sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
        return sorted;
      },
      {} as Record<string, unknown>
    );
};

const serializeContent = (content: Content): string => {
  return JSON.stringify(sortKeys(content));
};

/**
 * Computes as SHA-256 hash of a human-authored node.
 *
 * See docs/architecture/model/provenance.md
 */
export const computeHumanContentHash = async (
  content: Content,
  parentHashes: ContentHash[],
  createdAt: Date,
  authorAgentId: ULID
): Promise<ContentHash> => {
  const payload = [
    serializeContent(content),
    [...parentHashes].sort().join(','),
    createdAt.toISOString(),
    authorAgentId,
  ].join(DELIMITER);

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload
  );

  return hash as ContentHash;
};

/**
 * Computes as SHA-256 hash of a model-authored node.
 *
 * @param rawResponseHash - SHA-256 hash of the raw API response bytes,
 *                          computed immediately upon receipt before parsing.
 *
 * See docs/architecture/model/provenance.md
 */
export const computeModelContentHash = async (
  content: Content,
  parentHashes: ContentHash[],
  createdAt: Date,
  authorAgentId: ULID,
  rawResponseHash: ContentHash
): Promise<ContentHash> => {
  const payload = [
    serializeContent(content),
    [...parentHashes].sort().join(','),
    createdAt.toISOString(),
    authorAgentId,
    rawResponseHash,
  ].join(DELIMITER);

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload
  );

  return hash as ContentHash;
};
