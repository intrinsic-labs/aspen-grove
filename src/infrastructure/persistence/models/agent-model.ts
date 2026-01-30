/**
 * Agent WatermelonDB Model
 *
 * Represents an Agent entity in the database.
 * Agents are the unified abstraction for humans and models
 * that can participate in Loom Tree interactions.
 */

import { Model } from '@nozbe/watermelondb';
import { field, json, writer } from '@nozbe/watermelondb/decorators';
import type {
  Agent,
  AgentConfiguration,
  AgentPermissions,
  AuthorType,
  Ulid,
  Timestamp,
} from '../../../domain';
import {
  DEFAULT_AGENT_CONFIGURATION,
  DEFAULT_AGENT_PERMISSIONS,
} from '../../../domain';

/**
 * Sanitizer for AgentConfiguration JSON field.
 */
function sanitizeConfiguration(raw: unknown): AgentConfiguration {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_AGENT_CONFIGURATION;
  }

  const data = raw as Record<string, unknown>;

  return {
    systemPrompt:
      typeof data.systemPrompt === 'string' ? data.systemPrompt : null,
    temperature:
      typeof data.temperature === 'number' ? data.temperature : null,
    maxTokens: typeof data.maxTokens === 'number' ? data.maxTokens : null,
    stopSequences: Array.isArray(data.stopSequences)
      ? data.stopSequences.filter((s): s is string => typeof s === 'string')
      : [],
    customParameters:
      typeof data.customParameters === 'object' && data.customParameters !== null
        ? (data.customParameters as Record<string, unknown>)
        : {},
  };
}

/**
 * Sanitizer for AgentPermissions JSON field.
 */
function sanitizePermissions(raw: unknown): AgentPermissions {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_AGENT_PERMISSIONS;
  }

  const data = raw as Record<string, unknown>;

  return {
    read: typeof data.read === 'boolean' ? data.read : true,
    write: typeof data.write === 'boolean' ? data.write : true,
  };
}

/**
 * WatermelonDB model for Agent entities.
 *
 * Both humans and models are represented as Agents, enabling uniform
 * tree operations regardless of participant type.
 */
export class AgentModel extends Model {
  static table = 'agents';

  /** Display name */
  @field('name') name!: string;

  /** Agent type: 'human' or 'model' */
  @field('type') type!: string;

  /** Model reference for model agents (null for humans) */
  @field('model_ref') modelRef!: string | null;

  /** Configuration settings (stored as JSON) */
  @json('configuration', sanitizeConfiguration) configuration!: AgentConfiguration;

  /** Permission settings (stored as JSON) */
  @json('permissions', sanitizePermissions) permissions!: AgentPermissions;

  /** Whether agent can access tree navigation tools */
  @field('loom_aware') loomAware!: boolean;

  /** Creation timestamp */
  @field('created_at') createdAt!: number;

  /** Last update timestamp */
  @field('updated_at') updatedAt!: number;

  /** Soft delete timestamp (null if active) */
  @field('archived_at') archivedAt!: number | null;

  /**
   * Convert this model to a domain Agent entity.
   */
  toDomain(): Agent {
    return {
      id: this.id as Ulid,
      name: this.name,
      type: this.type as AuthorType,
      modelRef: this.modelRef,
      configuration: this.configuration,
      permissions: this.permissions,
      loomAware: this.loomAware,
      createdAt: this.createdAt as Timestamp,
      updatedAt: this.updatedAt as Timestamp,
      archivedAt: this.archivedAt as Timestamp | null,
    };
  }

  /**
   * Update agent name.
   */
  @writer async updateName(name: string): Promise<void> {
    await this.update((record) => {
      record.name = name;
      record.updatedAt = Date.now();
    });
  }

  /**
   * Update agent configuration.
   */
  @writer async updateConfiguration(config: Partial<AgentConfiguration>): Promise<void> {
    await this.update((record) => {
      record.configuration = { ...record.configuration, ...config };
      record.updatedAt = Date.now();
    });
  }

  /**
   * Update agent permissions.
   */
  @writer async updatePermissions(perms: Partial<AgentPermissions>): Promise<void> {
    await this.update((record) => {
      record.permissions = { ...record.permissions, ...perms };
      record.updatedAt = Date.now();
    });
  }

  /**
   * Update loom-aware setting.
   */
  @writer async setLoomAware(loomAware: boolean): Promise<void> {
    await this.update((record) => {
      record.loomAware = loomAware;
      record.updatedAt = Date.now();
    });
  }

  /**
   * Archive this agent.
   */
  @writer async archive(): Promise<void> {
    await this.update((record) => {
      record.archivedAt = Date.now();
      record.updatedAt = Date.now();
    });
  }

  /**
   * Restore this agent from archive.
   */
  @writer async restore(): Promise<void> {
    await this.update((record) => {
      record.archivedAt = null;
      record.updatedAt = Date.now();
    });
  }
}
