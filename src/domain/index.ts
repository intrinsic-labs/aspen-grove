/**
 * Domain Layer
 *
 * The domain layer contains the core business logic and entities.
 * It has no dependencies on infrastructure or framework code.
 *
 * Exports:
 * - Entities: Core data structures and interfaces
 * - Errors: Domain-specific error classes
 * - Services: Domain services for business logic
 * - Values: Value objects and utility functions
 */

// Entities - core data structures
export * from './entities';

// Errors - domain-specific error handling
export * from './errors';

// Services - domain services
export * from './services';

// Values - value objects and utilities
export * from './values';
