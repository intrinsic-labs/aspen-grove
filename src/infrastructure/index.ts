/**
 * Infrastructure Layer
 *
 * Concrete implementations of interfaces defined in the Application layer.
 * Includes persistence, LLM adapters, media storage, and platform utilities.
 */

// Persistence
export { database, resetDatabase, getDatabaseStats } from './persistence';
export { schema } from './persistence';

// Media Storage
export {
  type ParentType,
  type ContentType,
  initializeMediaStorage,
  storeFile,
  storeFileFromUri,
  readFile,
  readFileAsBytes,
  getFileUri,
  fileExists,
  getFileInfo,
  deleteFile,
  deleteByParent,
  listFilesByParent,
  getTotalStorageUsed,
  formatBytes,
} from './media';

// Secure Storage
export {
  CredentialKeys,
  type CredentialKey,
  setCredential,
  getCredential,
  deleteCredential,
  hasCredential,
  getConfiguredProviders,
  setLocalModelCredential,
  getLocalModelCredential,
  deleteLocalModelCredential,
  clearAllCredentials,
  SecureStorageError,
} from './secure-storage';
