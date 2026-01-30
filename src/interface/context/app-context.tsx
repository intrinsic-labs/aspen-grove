/**
 * App Context
 *
 * Provides app-wide access to:
 * - Initialization state (loading, error, result)
 * - All repository instances
 * - User preferences and app metadata
 *
 * Initialized once at app startup in root layout.
 */

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { database } from '@infrastructure/persistence';
import {
  createRepositories,
  type RepositoryBundle,
} from '@infrastructure/persistence/repositories/factory';
import {
  createAppInitializationService,
  type InitializationResult,
} from '@application/services/app-initialization';

/**
 * App context value type
 */
export interface AppContextValue {
  // Initialization state
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  initializationResult: InitializationResult | null;

  // Repositories
  repositories: RepositoryBundle;
}

/**
 * Create the context (exported for testing)
 */
const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Props for AppContextProvider
 */
export interface AppContextProviderProps {
  children: ReactNode;
}

/**
 * App Context Provider
 *
 * Initializes repositories and app state on first render.
 * Wraps the entire app to provide access to initialization state and repositories.
 */
export function AppContextProvider({ children }: AppContextProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [initializationResult, setInitializationResult] = useState<InitializationResult | null>(
    null
  );
  const [repositories] = useState(() => createRepositories(database));

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create initialization service with repositories
        const initService = createAppInitializationService({
          groveRepository: repositories.groveRepository,
          agentRepository: repositories.agentRepository,
          userPreferencesRepository: repositories.userPreferencesRepository,
        });

        // Initialize the app
        const result = await initService.initialize();

        if (mounted) {
          setInitializationResult(result);
          setIsInitialized(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [repositories]);

  const value: AppContextValue = {
    isInitialized,
    isLoading,
    error,
    initializationResult,
    repositories,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook to access app context
 *
 * @throws Error if called outside AppContextProvider
 * @returns App context value
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }

  return context;
}
