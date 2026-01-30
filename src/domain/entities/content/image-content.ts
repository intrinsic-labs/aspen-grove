/**
 * Image Content
 *
 * Represents image content within a Node.
 * References point to filesystem; actual bytes never stored in database.
 */

export interface ImageContent {
  readonly type: 'image';

  /** File path or blob ID reference to the image */
  readonly ref: string;

  /** MIME type (e.g., 'image/png', 'image/jpeg') */
  readonly mimeType: string;

  /** Width in pixels */
  readonly width: number;

  /** Height in pixels */
  readonly height: number;

  /** Optional reference to thumbnail for fast rendering */
  readonly thumbnailRef?: string;

  /** Optional accessibility description */
  readonly altText?: string;
}

/**
 * Create an ImageContent object
 */
export function createImageContent(params: {
  ref: string;
  mimeType: string;
  width: number;
  height: number;
  thumbnailRef?: string;
  altText?: string;
}): ImageContent {
  return {
    type: 'image',
    ref: params.ref,
    mimeType: params.mimeType,
    width: params.width,
    height: params.height,
    thumbnailRef: params.thumbnailRef,
    altText: params.altText,
  };
}

/**
 * Type guard for ImageContent
 */
export function isImageContent(content: unknown): content is ImageContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as ImageContent).type === 'image'
  );
}
