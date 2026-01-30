/**
 * Model Capabilities
 *
 * Describes what features a model supports.
 * Used for both remote models (from catalog) and local models.
 */

/**
 * Capabilities that vary between models.
 * Used to determine what operations are available.
 */
export interface ModelCapabilities {
  /** Can process image inputs */
  readonly supportsImages: boolean;

  /** Can process audio inputs */
  readonly supportsAudio: boolean;

  /** Can use function/tool calling */
  readonly supportsToolUse: boolean;

  /** Maximum context window size in tokens */
  readonly maxContextTokens: number;

  /** Maximum response length in tokens */
  readonly maxOutputTokens: number;
}

/**
 * Default capabilities (conservative defaults)
 */
export const DEFAULT_MODEL_CAPABILITIES: ModelCapabilities = {
  supportsImages: false,
  supportsAudio: false,
  supportsToolUse: false,
  maxContextTokens: 4096,
  maxOutputTokens: 4096,
};

/**
 * Create a ModelCapabilities object with defaults for unspecified fields
 */
export function createModelCapabilities(
  partial: Partial<ModelCapabilities> = {}
): ModelCapabilities {
  return {
    ...DEFAULT_MODEL_CAPABILITIES,
    ...partial,
  };
}

/**
 * Type guard for ModelCapabilities
 */
export function isModelCapabilities(value: unknown): value is ModelCapabilities {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const caps = value as Record<string, unknown>;

  return (
    typeof caps.supportsImages === 'boolean' &&
    typeof caps.supportsAudio === 'boolean' &&
    typeof caps.supportsToolUse === 'boolean' &&
    typeof caps.maxContextTokens === 'number' &&
    typeof caps.maxOutputTokens === 'number'
  );
}

/**
 * Check if a model can handle a specific content type
 */
export function canHandleContentType(
  capabilities: ModelCapabilities,
  contentType: 'text' | 'image' | 'audio' | 'mixed'
): boolean {
  switch (contentType) {
    case 'text':
      return true; // All models support text
    case 'image':
      return capabilities.supportsImages;
    case 'audio':
      return capabilities.supportsAudio;
    case 'mixed':
      // Mixed content requires checking what's actually in it
      // This is a conservative check - caller should verify specific blocks
      return true;
  }
}
