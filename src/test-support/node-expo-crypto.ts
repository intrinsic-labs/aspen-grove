import { createHash } from 'crypto';

/**
 * A stand-in for `expo-crypto` backed by Node's crypto, for tests that need
 * real digests. Under jest-expo the native module is mocked and every digest
 * comes back empty, so hash comparisons would pass vacuously. Use with:
 *
 *   jest.mock('expo-crypto', () => require('@/test-support/node-expo-crypto'));
 */
export const CryptoDigestAlgorithm = { SHA256: 'SHA-256' } as const;

export const digestStringAsync = async (
  _algorithm: string,
  data: string
): Promise<string> => createHash('sha256').update(data, 'utf8').digest('hex');
