/**
 * Repository Implementations Module
 *
 * Exports all WatermelonDB repository implementations.
 * These concrete implementations fulfill the abstract contracts
 * defined in the application layer.
 */

// Core repositories
export { GroveRepository } from './grove-repository';
export { LoomTreeRepository } from './loom-tree-repository';
export { NodeRepository } from './node-repository';
export { EdgeRepository } from './edge-repository';
export { AgentRepository } from './agent-repository';

// User repositories
export { UserPreferencesRepository } from './user-preferences-repository';

// TODO: Implement in later phases
// export { LocalModelRepository } from './local-model-repository';
// export { DocumentRepository } from './document-repository';
// export { LinkRepository } from './link-repository';
// export { TagRepository } from './tag-repository';
// export { RawApiResponseRepository } from './provenance-repository';
// export { TimestampCertificateRepository } from './provenance-repository';
