/**
 * Repository Factory
 *
 * Centralizes instantiation of all repository implementations.
 * This is the composition root for data access layer.
 *
 * Usage:
 *   const repos = createRepositories(database);
 *   // Access repos.groveRepository, repos.loomTreeRepository, etc.
 */

import type { Database } from '@nozbe/watermelondb';

import { GroveRepository } from './grove-repository';
import { LoomTreeRepository } from './loom-tree-repository';
import { NodeRepository } from './node-repository';
import { EdgeRepository } from './edge-repository';
import { AgentRepository } from './agent-repository';
import { UserPreferencesRepository } from './user-preferences-repository';
import { DocumentRepository } from './document-repository';
import { LinkRepository } from './link-repository';
import { TagRepository } from './tag-repository';
import { LocalModelRepository } from './local-model-repository';
import { RawApiResponseRepository, TimestampCertificateRepository } from './provenance-repository';

/**
 * Bundle of all repository instances.
 *
 * Each repository is instantiated once per app lifecycle.
 * Repositories are stateless and safe to use across multiple screens/features.
 */
export interface RepositoryBundle {
  groveRepository: GroveRepository;
  loomTreeRepository: LoomTreeRepository;
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  agentRepository: AgentRepository;
  userPreferencesRepository: UserPreferencesRepository;
  documentRepository: DocumentRepository;
  linkRepository: LinkRepository;
  tagRepository: TagRepository;
  localModelRepository: LocalModelRepository;
  rawApiResponseRepository: RawApiResponseRepository;
  timestampCertificateRepository: TimestampCertificateRepository;
}

/**
 * Create all repositories with a single database instance.
 *
 * Call this once at app initialization and pass the result to context.
 *
 * @param database - WatermelonDB database instance
 * @returns Bundle of all repositories
 */
export function createRepositories(database: Database): RepositoryBundle {
  return {
    groveRepository: new GroveRepository(database),
    loomTreeRepository: new LoomTreeRepository(database),
    nodeRepository: new NodeRepository(database),
    edgeRepository: new EdgeRepository(database),
    agentRepository: new AgentRepository(database),
    userPreferencesRepository: new UserPreferencesRepository(database),
    documentRepository: new DocumentRepository(database),
    linkRepository: new LinkRepository(database),
    tagRepository: new TagRepository(database),
    localModelRepository: new LocalModelRepository(database),
    rawApiResponseRepository: new RawApiResponseRepository(database),
    timestampCertificateRepository: new TimestampCertificateRepository(database),
  };
}
