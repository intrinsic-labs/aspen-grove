/**
 * Application Services Module
 *
 * Exports application-level services that orchestrate domain logic
 * and coordinate between repositories.
 */

export {
  AppInitializationService,
  createAppInitializationService,
  type InitializationResult,
  type AppInitializationDependencies,
} from './app-initialization';
