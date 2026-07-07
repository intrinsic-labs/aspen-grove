export type ContextAssemblyErrorCode =
  | 'systemContextTooLong'
  | 'contextExceedsLimit'
  | 'strategyNotImplemented';

/**
 * Raised when context assembly cannot produce a valid completion request,
 * e.g. the (never-truncated) system context alone exceeds the model limit.
 */
export class ContextAssemblyError extends Error {
  readonly code: ContextAssemblyErrorCode;

  constructor(input: {
    readonly code: ContextAssemblyErrorCode;
    readonly message: string;
  }) {
    super(input.message);
    this.name = 'ContextAssemblyError';
    this.code = input.code;
  }
}
