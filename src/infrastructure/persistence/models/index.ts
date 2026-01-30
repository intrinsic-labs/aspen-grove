/**
 * WatermelonDB Models Module
 *
 * Exports all database models and the modelClasses array
 * for database registration.
 */

import { GroveModel } from './grove-model';
import { LoomTreeModel } from './loom-tree-model';
import { NodeModel } from './node-model';
import EdgeModel from './edge-model';
import { AgentModel } from './agent-model';
import { UserPreferencesModel } from './user-preferences-model';
import { LocalModelModel } from './local-model-model';
import { DocumentModel } from './document-model';
import { LinkModel } from './link-model';
import { TagModel, TagAssignmentModel } from './tag-model';
import { RawApiResponseModel, TimestampCertificateModel } from './provenance-models';

// Re-export all models
export {
  GroveModel,
  LoomTreeModel,
  NodeModel,
  EdgeModel,
  AgentModel,
  UserPreferencesModel,
  LocalModelModel,
  DocumentModel,
  LinkModel,
  TagModel,
  TagAssignmentModel,
  RawApiResponseModel,
  TimestampCertificateModel,
};

/**
 * All model classes for database registration.
 *
 * Pass this array to the Database constructor's modelClasses option.
 */
export const modelClasses = [
  GroveModel,
  LoomTreeModel,
  NodeModel,
  EdgeModel,
  AgentModel,
  UserPreferencesModel,
  LocalModelModel,
  DocumentModel,
  LinkModel,
  TagModel,
  TagAssignmentModel,
  RawApiResponseModel,
  TimestampCertificateModel,
];
