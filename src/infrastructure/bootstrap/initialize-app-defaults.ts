import type { Database } from '@nozbe/watermelondb';
import { InitializeAppDefaultsUseCase } from '@application/use-cases';
import {
  WatermelonAgentRepository,
  WatermelonGroveRepository,
  WatermelonUserPreferencesRepository,
} from '@infrastructure/persistence/watermelon/repositories';

/** Non-UI runner for first-launch bootstrap defaults. */
export const initializeAppDefaults = async (database: Database) => {
  const useCase = new InitializeAppDefaultsUseCase({
    userPreferencesRepository: new WatermelonUserPreferencesRepository(database),
    agentRepository: new WatermelonAgentRepository(database),
    groveRepository: new WatermelonGroveRepository(database),
  });

  return useCase.execute();
};
