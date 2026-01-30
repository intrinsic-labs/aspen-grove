/**
 * Media Infrastructure
 *
 * File storage utilities for images, audio, and other media content.
 */

export {
  // Types
  type ParentType,
  type ContentType,

  // Initialization
  initializeMediaStorage,
  ensureDirectoryExists,

  // Storage operations
  storeFile,
  storeFileFromUri,
  readFile,
  readFileAsBytes,
  getFileUri,
  fileExists,
  getFileInfo,

  // Deletion operations
  deleteFile,
  deleteByParent,

  // Listing and stats
  listFilesByParent,
  getTotalStorageUsed,

  // Utilities
  computeContentHash,
  getExtensionFromMimeType,
  formatBytes,
} from './file-storage';
