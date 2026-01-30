/**
 * UserPreferences Repository Implementation
 *
 * WatermelonDB implementation of IUserPreferencesRepository.
 * Manages the singleton UserPreferences record.
 */

import { Database } from '@nozbe/watermelondb';

import type {
  IUserPreferencesRepository,
  Observable,
  Observer,
} from '../../../application/repositories';
import type {
  UserPreferences,
  CreateUserPreferencesInput,
  UpdateUserPreferencesInput,
  Ulid,
} from '../../../domain';
import { NotFoundError, ConflictError, DEFAULT_USER_PREFERENCES } from '../../../domain';
import { UserPreferencesModel } from '../models';

/**
 * WatermelonDB implementation of UserPreferences repository.
 */
export class UserPreferencesRepository implements IUserPreferencesRepository {
  constructor(private database: Database) {}

  async create(input: CreateUserPreferencesInput): Promise<UserPreferences> {
    // Check if preferences already exist (singleton constraint)
    const existing = await this.get();
    if (existing) {
      throw new ConflictError('UserPreferences already exist', 'singleton');
    }

    const prefsCollection = this.database.get<UserPreferencesModel>('user_preferences');
    const now = Date.now();

    const created = await this.database.write(async () => {
      return prefsCollection.create((prefs) => {
        prefs._raw.id = input.id;
        prefs.displayName = input.displayName ?? DEFAULT_USER_PREFERENCES.displayName;
        prefs.email = input.email ?? DEFAULT_USER_PREFERENCES.email;
        prefs.avatarRef = input.avatarRef ?? DEFAULT_USER_PREFERENCES.avatarRef;
        prefs.defaultVoiceModeEnabled =
          input.defaultVoiceModeEnabled ?? DEFAULT_USER_PREFERENCES.defaultVoiceModeEnabled;
        prefs.defaultTemperature =
          input.defaultTemperature ?? DEFAULT_USER_PREFERENCES.defaultTemperature;
        prefs.theme = input.theme ?? DEFAULT_USER_PREFERENCES.theme;
        prefs.fontSize = input.fontSize ?? DEFAULT_USER_PREFERENCES.fontSize;
        prefs.fontFace = input.fontFace ?? DEFAULT_USER_PREFERENCES.fontFace;
        prefs.nodeViewStyle = input.nodeViewStyle ?? DEFAULT_USER_PREFERENCES.nodeViewStyle;
        prefs.nodeViewCornerRadius =
          input.nodeViewCornerRadius ?? DEFAULT_USER_PREFERENCES.nodeViewCornerRadius;
        prefs.verboseErrorAlerts =
          input.verboseErrorAlerts ?? DEFAULT_USER_PREFERENCES.verboseErrorAlerts;
      });
    });

    return created.toDomain();
  }

  async get(): Promise<UserPreferences | null> {
    const prefsCollection = this.database.get<UserPreferencesModel>('user_preferences');
    const results = await prefsCollection.query().fetch();

    if (results.length === 0) {
      return null;
    }

    return results[0].toDomain();
  }

  async getOrThrow(): Promise<UserPreferences> {
    const prefs = await this.get();
    if (!prefs) {
      throw new NotFoundError('UserPreferences', 'singleton');
    }
    return prefs;
  }

  async update(changes: UpdateUserPreferencesInput): Promise<UserPreferences> {
    const prefsCollection = this.database.get<UserPreferencesModel>('user_preferences');
    const results = await prefsCollection.query().fetch();

    if (results.length === 0) {
      throw new NotFoundError('UserPreferences', 'singleton');
    }

    const model = results[0];

    await this.database.write(async () => {
      await model.update((prefs) => {
        if (changes.displayName !== undefined) prefs.displayName = changes.displayName;
        if (changes.email !== undefined) prefs.email = changes.email;
        if (changes.avatarRef !== undefined) prefs.avatarRef = changes.avatarRef;
        if (changes.defaultVoiceModeEnabled !== undefined)
          prefs.defaultVoiceModeEnabled = changes.defaultVoiceModeEnabled;
        if (changes.defaultTemperature !== undefined)
          prefs.defaultTemperature = changes.defaultTemperature;
        if (changes.theme !== undefined) prefs.theme = changes.theme;
        if (changes.fontSize !== undefined) prefs.fontSize = changes.fontSize;
        if (changes.fontFace !== undefined) prefs.fontFace = changes.fontFace;
        if (changes.nodeViewStyle !== undefined) prefs.nodeViewStyle = changes.nodeViewStyle;
        if (changes.nodeViewCornerRadius !== undefined)
          prefs.nodeViewCornerRadius = changes.nodeViewCornerRadius;
        if (changes.verboseErrorAlerts !== undefined)
          prefs.verboseErrorAlerts = changes.verboseErrorAlerts;
      });
    });

    return model.toDomain();
  }

  async exists(): Promise<boolean> {
    const prefsCollection = this.database.get<UserPreferencesModel>('user_preferences');
    const count = await prefsCollection.query().fetchCount();
    return count > 0;
  }

  async getId(): Promise<Ulid | null> {
    const prefsCollection = this.database.get<UserPreferencesModel>('user_preferences');
    const results = await prefsCollection.query().fetch();

    if (results.length === 0) {
      return null;
    }

    return results[0].id as Ulid;
  }

  observe(): Observable<UserPreferences | null> {
    const prefsCollection = this.database.get<UserPreferencesModel>('user_preferences');

    return {
      subscribe: (
        observerOrNext: Observer<UserPreferences | null> | ((value: UserPreferences | null) => void)
      ) => {
        const observer: Observer<UserPreferences | null> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = prefsCollection
          .query()
          .observe()
          .subscribe({
            next: (models) => {
              if (models.length === 0) {
                observer.next(null);
              } else {
                observer.next(models[0].toDomain());
              }
            },
            error: (err) => observer.error?.(err),
          });

        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }
}
