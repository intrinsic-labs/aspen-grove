/**
 * Domain Errors
 *
 * Custom error classes for domain-specific error handling.
 * These errors are thrown by repositories and domain services
 * to communicate specific failure conditions.
 */

/**
 * Base class for all domain errors.
 * Extends Error with additional context.
 */
export abstract class DomainError extends Error {
  /** Error code for programmatic handling */
  abstract readonly code: string;

  /** Additional context about the error */
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when a requested entity is not found.
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  /** The type of entity that was not found */
  readonly entityType: string;

  /** The identifier that was searched for */
  readonly entityId: string;

  constructor(entityType: string, entityId: string) {
    super(`${entityType} not found: ${entityId}`, { entityType, entityId });
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

/**
 * Thrown when input data fails validation.
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';

  /** The field that failed validation (if applicable) */
  readonly field?: string;

  /** Validation errors by field */
  readonly errors?: Record<string, string>;

  constructor(
    message: string,
    options?: { field?: string; errors?: Record<string, string> }
  ) {
    super(message, options);
    this.field = options?.field;
    this.errors = options?.errors;
  }
}

/**
 * Thrown when an operation conflicts with existing state.
 * Examples: duplicate unique key, concurrent modification.
 */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';

  /** The type of conflict */
  readonly conflictType: string;

  constructor(message: string, conflictType: string = 'unknown') {
    super(message, { conflictType });
    this.conflictType = conflictType;
  }
}

/**
 * Thrown when an operation is not permitted.
 */
export class PermissionError extends DomainError {
  readonly code = 'PERMISSION_DENIED';

  /** The operation that was attempted */
  readonly operation: string;

  constructor(operation: string, message?: string) {
    super(message ?? `Permission denied for operation: ${operation}`, { operation });
    this.operation = operation;
  }
}

/**
 * Thrown when a feature or method is not yet implemented.
 */
export class NotImplementedError extends DomainError {
  readonly code = 'NOT_IMPLEMENTED';

  /** The feature that is not implemented */
  readonly feature: string;

  constructor(feature: string, message?: string) {
    super(message ?? `Not implemented: ${feature}`, { feature });
    this.feature = feature;
  }
}

/**
 * Thrown when an operation fails due to invalid state.
 */
export class InvalidStateError extends DomainError {
  readonly code = 'INVALID_STATE';

  /** Current state description */
  readonly currentState: string;

  /** Expected state description */
  readonly expectedState?: string;

  constructor(
    message: string,
    currentState: string,
    expectedState?: string
  ) {
    super(message, { currentState, expectedState });
    this.currentState = currentState;
    this.expectedState = expectedState;
  }
}

/**
 * Thrown when hash verification fails.
 */
export class HashVerificationError extends DomainError {
  readonly code = 'HASH_VERIFICATION_FAILED';

  /** The node ID that failed verification */
  readonly nodeId: string;

  /** The expected hash */
  readonly expectedHash: string;

  /** The computed hash */
  readonly computedHash: string;

  constructor(nodeId: string, expectedHash: string, computedHash: string) {
    super(`Hash verification failed for node: ${nodeId}`, {
      nodeId,
      expectedHash,
      computedHash,
    });
    this.nodeId = nodeId;
    this.expectedHash = expectedHash;
    this.computedHash = computedHash;
  }
}

/**
 * Type guard for DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Type guard for NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Type guard for ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard for ConflictError
 */
export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}
