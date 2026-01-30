/**
 * Domain Services Module
 *
 * Exports domain services for business logic operations.
 */

export {
  // Serialization
  serializeContent,
  deterministicStringify,

  // Hashing primitives
  sha256,
  sha256Bytes,
  formatTimestampForHash,

  // Human node hash computation
  type HumanNodeHashInput,
  computeHumanNodeHash,
  verifyHumanNodeHash,

  // Model node hash computation
  type ModelNodeHashInput,
  computeModelNodeHash,
  verifyModelNodeHash,

  // Raw response hashing
  computeRawResponseHash,
  computeAssembledResponseHash,

  // Verification result type
  type NodeVerificationResult,
} from './hash-computation';
