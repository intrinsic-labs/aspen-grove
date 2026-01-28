# Repository Contracts

> Abstract interfaces for data access. Infrastructure layer implements these contracts.

---

## Overview

Repositories provide the boundary between application logic and persistence. Use cases depend on these abstract contracts, never on concrete implementations. This enables:

- Unit testing with in-memory implementations
- Swapping storage backends without changing business logic
- Clear separation of concerns

---

## Contents

| Document | Description |
|----------|-------------|
| [Loom Tree Repository](./loom-tree-repository.md) | LoomTree persistence |
| [Node Repository](./node-repository.md) | Node persistence and traversal |
| [Edge Repository](./edge-repository.md) | Edge persistence |
| [Agent Repository](./agent-repository.md) | Agent persistence |
| [Grove Repository](./grove-repository.md) | Grove persistence |
| [Document Repository](./document-repository.md) | Document persistence |
| [Link Repository](./link-repository.md) | Link persistence |
| [Tag Repository](./tag-repository.md) | Tag and TagAssignment persistence |
| [Provenance Repositories](./provenance-repositories.md) | RawApiResponse and TimestampCertificate |
| [User Preferences Repository](./user-preferences-repository.md) | UserPreferences singleton |
| [Local Model Repository](./local-model-repository.md) | LocalModel persistence |

---

## Common Patterns

### Return Types

- Single item queries return the item or null (not found)
- Collection queries return arrays (empty if none found)
- Mutations return the created/updated item
- Deletions return boolean success

### Error Handling

- Repositories throw domain-specific errors, not database errors
- `NotFoundError`, `ValidationError`, `ConflictError`
- Callers handle errors appropriately for their context

### Pagination

- List operations accept optional pagination parameters
- `limit`: maximum items to return
- `offset`: number of items to skip
- Returns total count alongside results for UI pagination

### Filtering

- List operations accept filter objects specific to each entity
- Filters are optional — omitted fields mean "no filter"
- Multiple filters combine with AND logic

---

## Transaction Support

### Requirements

- Repositories support transactions for multi-step operations
- Transaction scope is explicit (begin, commit, rollback)
- Nested transactions not required for MVP

### Use Cases Requiring Transactions

- Creating Node with Edges (atomic)
- Deleting LoomTree with cascade
- Bulk tag operations

### Pattern

```typescript
// Use case requests transaction from unit of work
const tx = await unitOfWork.begin();
try {
  // Performs multiple repository operations
  await nodeRepository.create(tx, nodeData);
  await edgeRepository.create(tx, edgeData);
  
  // Commits on success
  await tx.commit();
} catch (error) {
  // Rolls back on error
  await tx.rollback();
  throw error;
}
```

Repositories detect active transaction and participate automatically.

---

## Related Documentation

- [Core Entities](../../model/core-entities.md) — Entity definitions
- [Agents](../../model/agents.md) — Agent and Model entities
- [Organization](../../model/organization.md) — Grove, Document, Link, Tag entities
- [Provenance](../../model/provenance.md) — RawApiResponse and TimestampCertificate entities