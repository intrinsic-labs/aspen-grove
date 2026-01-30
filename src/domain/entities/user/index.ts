/**
 * User Module
 *
 * Exports UserPreferences and LocalModel entities.
 */

export type {
  UserPreferences,
  CreateUserPreferencesInput,
  UpdateUserPreferencesInput,
} from './user-preferences';

export { DEFAULT_USER_PREFERENCES } from './user-preferences';

export type {
  LocalModel,
  CreateLocalModelInput,
  UpdateLocalModelInput,
  LocalModelFilters,
  AuthConfig,
} from './local-model';

export {
  NO_AUTH_CONFIG,
  createAuthConfig,
  isAuthConfig,
  createLocalModelRef,
  isLocalModelRef,
  parseLocalModelRef,
} from './local-model';
