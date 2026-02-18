import type { Collection, Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type {
  IUserPreferencesRepository,
  UserPreferencesChanges,
} from '@application/repositories';
import type {
  FontSize,
  NodeViewStyle,
  Theme,
  UserPreferences as UserPreferencesEntity,
} from '@domain/entities';
import { createULID, type ULID } from '@domain/value-objects';

import UserPreferencesModel from '../model/UserPreferences';
import { toOptionalString } from './helpers';

const DEFAULT_DISPLAY_NAME = 'Human';
const DEFAULT_THEME: Theme = 'system';
const DEFAULT_FONT_SIZE: FontSize = 16;
const DEFAULT_VOICE_MODE = false;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_NODE_VIEW_STYLE: NodeViewStyle = 'filled';
const DEFAULT_NODE_CORNER_RADIUS = 12;

/** WatermelonDB implementation of `IUserPreferencesRepository`. */
export class WatermelonUserPreferencesRepository
  implements IUserPreferencesRepository
{
  private readonly db: Database;
  private readonly userPreferences: Collection<UserPreferencesModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.userPreferences = this.db.get<UserPreferencesModel>('user_preferences');
    this.now = now;
  }

  async get(): Promise<UserPreferencesEntity> {
    return this.db.write(async () => {
      const model = await this.ensureSingletonModel();
      return this.toDomain(model);
    });
  }

  async update(changes: UserPreferencesChanges): Promise<UserPreferencesEntity> {
    return this.db.write(async () => {
      const model = await this.ensureSingletonModel();
      await model.update((record) => {
        if (changes.displayName !== undefined) {
          record.displayName = changes.displayName;
        }
        if (changes.email !== undefined) {
          record.email = changes.email ?? null;
        }
        if (changes.avatarRef !== undefined) {
          record.avatarRef = changes.avatarRef ?? null;
        }

        if (changes.theme !== undefined) {
          record.theme = changes.theme;
        }
        if (changes.fontSize !== undefined) {
          record.fontSize = changes.fontSize;
        }
        if (changes.fontFace !== undefined) {
          record.fontFace = changes.fontFace ?? null;
        }

        if (changes.defaultVoiceModeEnabled !== undefined) {
          record.defaultVoiceModeEnabled = changes.defaultVoiceModeEnabled;
        }
        if (changes.defaultTemperature !== undefined) {
          record.defaultTemperature = changes.defaultTemperature;
        }

        if (changes.nodeViewStyle !== undefined) {
          record.nodeViewStyle = changes.nodeViewStyle;
        }
        if (changes.nodeViewCornerRadius !== undefined) {
          record.nodeViewCornerRadius = changes.nodeViewCornerRadius;
        }

        record.updatedAt = this.now();
      });

      return this.toDomain(model);
    });
  }

  private async ensureSingletonModel(): Promise<UserPreferencesModel> {
    const models = await this.userPreferences
      .query(Q.sortBy('created_at', Q.asc))
      .fetch();

    if (models.length === 0) {
      return this.createDefaultModel();
    }

    const keeper = models[0];
    if (models.length > 1) {
      for (let index = 1; index < models.length; index++) {
        await models[index].destroyPermanently();
      }
    }

    return keeper;
  }

  private async createDefaultModel(): Promise<UserPreferencesModel> {
    const id = createULID();
    const createdAt = this.now();

    return this.userPreferences.create((record) => {
      record._raw.id = id;
      record.displayName = DEFAULT_DISPLAY_NAME;
      record.email = null;
      record.avatarRef = null;
      record.theme = DEFAULT_THEME;
      record.fontSize = DEFAULT_FONT_SIZE;
      record.fontFace = null;
      record.defaultVoiceModeEnabled = DEFAULT_VOICE_MODE;
      record.defaultTemperature = DEFAULT_TEMPERATURE;
      record.nodeViewStyle = DEFAULT_NODE_VIEW_STYLE;
      record.nodeViewCornerRadius = DEFAULT_NODE_CORNER_RADIUS;
      record.createdAt = createdAt;
      record.updatedAt = createdAt;
    });
  }

  private toDomain(model: UserPreferencesModel): UserPreferencesEntity {
    return {
      id: model.id as ULID,
      displayName: toOptionalString(model.displayName),
      email: toOptionalString(model.email),
      avatarRef: toOptionalString(model.avatarRef),
      theme: model.theme as Theme,
      fontSize: model.fontSize as FontSize,
      fontFace: toOptionalString(model.fontFace),
      defaultVoiceModeEnabled: model.defaultVoiceModeEnabled,
      defaultTemperature: model.defaultTemperature,
      nodeViewStyle: model.nodeViewStyle as NodeViewStyle,
      nodeViewCornerRadius: model.nodeViewCornerRadius,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
