/**
 * Domain Errors Module
 *
 * Exports domain-specific error classes for consistent error handling.
 */

export {
  DomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
  PermissionError,
  NotImplementedError,
  InvalidStateError,
  HashVerificationError,
  isDomainError,
  isNotFoundError,
  isValidationError,
  isConflictError,
} from './domain-errors';
