import { File, Directory, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

/**
 * File Storage Service
 *
 * Provides utilities for storing and retrieving media files (images, audio)
 * in the app's document directory. Files are organized by parent entity type
 * (loomtrees, documents) and content type (images, audio, thumbnails).
 *
 * Directory structure:
 * - {documentDirectory}/media/loomtrees/{loomTreeId}/images/
 * - {documentDirectory}/media/loomtrees/{loomTreeId}/thumbnails/
 * - {documentDirectory}/media/loomtrees/{loomTreeId}/audio/
 * - {documentDirectory}/media/documents/{documentId}/images/
 * - {documentDirectory}/media/documents/{documentId}/thumbnails/
 * - {documentDirectory}/media/documents/{documentId}/audio/
 */

export type ParentType = 'loomtrees' | 'documents';
export type ContentType = 'images' | 'thumbnails' | 'audio';

/**
 * Get the media root directory
 */
function getMediaRoot(): Directory {
  return new Directory(Paths.document, 'media');
}

/**
 * Get the directory for a specific parent entity
 */
function getParentDirectory(parentType: ParentType, parentId: string): Directory {
  return new Directory(getMediaRoot(), parentType, parentId);
}

/**
 * Get the directory for a specific content type
 */
function getContentDirectory(
  parentType: ParentType,
  parentId: string,
  contentType: ContentType
): Directory {
  return new Directory(getParentDirectory(parentType, parentId), contentType);
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDirectoryExists(directory: Directory): void {
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
}

/**
 * Initialize the media directory structure
 */
export function initializeMediaStorage(): void {
  const mediaRoot = getMediaRoot();
  ensureDirectoryExists(mediaRoot);
  console.log('[FileStorage] Media storage initialized at:', mediaRoot.uri);
}

/**
 * Compute SHA-256 hash of data for content-addressable storage
 */
export async function computeContentHash(data: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  return hash;
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    // Images
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/m4a': 'm4a',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/aac': 'aac',
  };

  return mimeToExt[mimeType] || 'bin';
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Store a file in the media directory
 *
 * Files are named by their content hash for deduplication.
 *
 * @param parentType - 'loomtrees' or 'documents'
 * @param parentId - The ULID of the parent entity
 * @param contentType - 'images', 'thumbnails', or 'audio'
 * @param base64Data - Base64-encoded file data
 * @param mimeType - The MIME type of the file
 * @returns The relative reference path to the stored file
 */
export async function storeFile(
  parentType: ParentType,
  parentId: string,
  contentType: ContentType,
  base64Data: string,
  mimeType: string
): Promise<string> {
  // Compute hash for deduplication
  const hash = await computeContentHash(base64Data);
  const extension = getExtensionFromMimeType(mimeType);
  const filename = `${hash}.${extension}`;

  // Build paths
  const directory = getContentDirectory(parentType, parentId, contentType);
  const file = new File(directory, filename);

  // Ensure directory exists
  ensureDirectoryExists(directory);

  // Check if file already exists (deduplication)
  if (file.exists) {
    console.log('[FileStorage] File already exists, returning existing reference:', filename);
    return `${parentType}/${parentId}/${contentType}/${filename}`;
  }

  // Convert base64 to Uint8Array and write
  const bytes = base64ToUint8Array(base64Data);
  file.write(bytes);

  console.log('[FileStorage] Stored file:', filename);

  // Return relative reference path
  return `${parentType}/${parentId}/${contentType}/${filename}`;
}

/**
 * Store a file from a local URI (e.g., from image picker)
 *
 * @param parentType - 'loomtrees' or 'documents'
 * @param parentId - The ULID of the parent entity
 * @param contentType - 'images', 'thumbnails', or 'audio'
 * @param sourceUri - Local file URI to copy from
 * @param mimeType - The MIME type of the file
 * @returns The relative reference path to the stored file
 */
export async function storeFileFromUri(
  parentType: ParentType,
  parentId: string,
  contentType: ContentType,
  sourceUri: string,
  mimeType: string
): Promise<string> {
  // Read source file as base64
  const sourceFile = new File(sourceUri);
  const base64Data = await sourceFile.base64();

  return storeFile(parentType, parentId, contentType, base64Data, mimeType);
}

/**
 * Read a file as base64 data
 *
 * @param reference - The relative reference path
 * @returns Base64-encoded file data, or null if not found
 */
export async function readFile(reference: string): Promise<string | null> {
  const file = new File(getMediaRoot(), reference);

  if (!file.exists) {
    console.warn('[FileStorage] File not found:', reference);
    return null;
  }

  return file.base64();
}

/**
 * Read file as bytes
 *
 * @param reference - The relative reference path
 * @returns Uint8Array or null if not found
 */
export async function readFileAsBytes(reference: string): Promise<Uint8Array | null> {
  const file = new File(getMediaRoot(), reference);

  if (!file.exists) {
    console.warn('[FileStorage] File not found:', reference);
    return null;
  }

  return file.bytes();
}

/**
 * Get the absolute file URI for native APIs
 *
 * @param reference - The relative reference path
 * @returns Absolute file system URI
 */
export function getFileUri(reference: string): string {
  const file = new File(getMediaRoot(), reference);
  return file.uri;
}

/**
 * Check if a file exists
 *
 * @param reference - The relative reference path
 * @returns true if the file exists
 */
export function fileExists(reference: string): boolean {
  const file = new File(getMediaRoot(), reference);
  return file.exists;
}

/**
 * Get file info (size, modification time)
 *
 * @param reference - The relative reference path
 * @returns File info or null if not found
 */
export function getFileInfo(
  reference: string
): { size: number; modificationTime: number | null } | null {
  const file = new File(getMediaRoot(), reference);

  if (!file.exists) {
    return null;
  }

  return {
    size: file.size,
    modificationTime: file.modificationTime,
  };
}

/**
 * Delete a file
 *
 * @param reference - The relative reference path
 * @returns true if deletion succeeded
 */
export function deleteFile(reference: string): boolean {
  const file = new File(getMediaRoot(), reference);

  try {
    if (!file.exists) {
      return true; // Already doesn't exist
    }

    file.delete();
    console.log('[FileStorage] Deleted file:', reference);
    return true;
  } catch (error) {
    console.error('[FileStorage] Failed to delete file:', reference, error);
    return false;
  }
}

/**
 * Delete all files for a parent entity
 *
 * @param parentType - 'loomtrees' or 'documents'
 * @param parentId - The ULID of the parent entity
 * @returns Number of files deleted
 */
export function deleteByParent(parentType: ParentType, parentId: string): number {
  const parentDir = getParentDirectory(parentType, parentId);

  try {
    if (!parentDir.exists) {
      return 0;
    }

    // Count files before deletion
    let count = 0;
    for (const contentType of ['images', 'thumbnails', 'audio'] as ContentType[]) {
      const contentDir = getContentDirectory(parentType, parentId, contentType);
      if (contentDir.exists) {
        const items = contentDir.list();
        count += items.filter((item) => item instanceof File).length;
      }
    }

    // Delete entire parent directory
    parentDir.delete();
    console.log(`[FileStorage] Deleted ${count} files for ${parentType}/${parentId}`);

    return count;
  } catch (error) {
    console.error('[FileStorage] Failed to delete parent:', parentType, parentId, error);
    return 0;
  }
}

/**
 * List all files for a parent entity
 *
 * @param parentType - 'loomtrees' or 'documents'
 * @param parentId - The ULID of the parent entity
 * @returns Array of relative reference paths
 */
export function listFilesByParent(parentType: ParentType, parentId: string): string[] {
  const files: string[] = [];

  for (const contentType of ['images', 'thumbnails', 'audio'] as ContentType[]) {
    const contentDir = getContentDirectory(parentType, parentId, contentType);

    if (contentDir.exists) {
      const items = contentDir.list();
      for (const item of items) {
        if (item instanceof File) {
          files.push(`${parentType}/${parentId}/${contentType}/${item.name}`);
        }
      }
    }
  }

  return files;
}

/**
 * Get total storage used by media files
 *
 * @returns Total bytes used
 */
export function getTotalStorageUsed(): number {
  const mediaRoot = getMediaRoot();

  function calculateDirSize(dir: Directory): number {
    if (!dir.exists) return 0;

    let size = 0;
    const items = dir.list();

    for (const item of items) {
      if (item instanceof File) {
        size += item.size;
      } else if (item instanceof Directory) {
        size += calculateDirSize(item);
      }
    }

    return size;
  }

  return calculateDirSize(mediaRoot);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
