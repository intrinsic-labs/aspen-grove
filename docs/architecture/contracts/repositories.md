# Repository Contracts Specification

> Abstract interfaces for data access. Infrastructure layer implements these contracts.

---

## Overview

Repositories provide the boundary between application logic and persistence. Use cases depend on these abstract contracts, never on concrete implementations. This enables:

- Unit testing with in-memory implementations
- Swapping storage backends without changing business logic
- Clear separation of concerns

---

## Common Patterns

### Return Types

- Single item queries return the item or null (not found)
- Collection queries return arrays (empty if none found)
- Mutations return the created/updated item
- Deletions return boolean success

### Error Handling

- Repositories throw domain-specific errors, not database errors
- NotFoundError, ValidationError, ConflictError
- Callers handle errors appropriately for their context

### Pagination

- List operations accept optional pagination parameters
- limit: maximum items to return
- offset: number of items to skip
- Returns total count alongside results for UI pagination

### Filtering

- List operations accept filter objects specific to each entity
- Filters are optional — omitted fields mean "no filter"
- Multiple filters combine with AND logic

---

## LoomTreeRepository

Manages LoomTree persistence.

### Operations

**create**
- Input: title, mode, systemContext (optional)
- Creates LoomTree with generated id and timestamps
- Creates root Node (empty content) and links to LoomTree
- Returns: created LoomTree

**findById**
- Input: id
- Returns: LoomTree or null

**findByGrove**
- Input: groveId, filters (optional), pagination (optional)
- Filters: archived (boolean), mode (dialogue|buffer), search (string)
- Returns: array of LoomTrees, total count

**update**
- Input: id, changes (title, systemContext)
- Updates updatedAt timestamp
- Returns: updated LoomTree

**archive**
- Input: id
- Sets archivedAt to current timestamp
- Returns: boolean success

**restore**
- Input: id
- Clears archivedAt
- Returns: boolean success

**delete**
- Input: id
- Hard delete — removes LoomTree, all Nodes, all Edges
- Cascades to provenance records and media files
- Returns: boolean success

---

## NodeRepository

Manages Node persistence.

### Operations

**create**
- Input: loomTreeId, content, authorAgentId, parentNodeIds (optional)
- Computes contentHash from content + parent hashes + timestamp + author
- Creates Node with generated id
- Creates Continuation edges from parents if provided
- Returns: created Node with computed hash

**findById**
- Input: id
- Returns: Node or null

**findByLoomTree**
- Input: loomTreeId, filters (optional), pagination (optional)
- Filters: authorAgentId, bookmarked, pruned, contentType
- Returns: array of Nodes, total count

**findRoot**
- Input: loomTreeId
- Returns: root Node (node with no incoming Continuation edges)

**findChildren**
- Input: nodeId
- Returns: array of Nodes connected by outgoing Continuation edges

**findSiblings**
- Input: nodeId
- Returns: array of Nodes sharing same parent (excluding self)

**findPath**
- Input: nodeId
- Traverses Continuation edges backward to root
- Returns: ordered array of Nodes from root to given node

**updateMetadata**
- Input: id, metadata changes (bookmarked, bookmarkLabel, pruned, excluded, tags)
- Does not modify content or contentHash
- Returns: updated Node

**verifyHash**
- Input: id
- Recomputes expected hash and compares to stored hash
- Returns: verification result (valid | invalid | error)

**verifyPathHashes**
- Input: nodeId
- Verifies hash chain from root to given node
- Returns: array of verification results per node

---

## EdgeRepository

Manages Edge persistence.

### Operations

**create**
- Input: loomTreeId, sources (array of nodeId + role), targetNodeId, edgeType
- Validates all nodes belong to same LoomTree (except link type)
- Returns: created Edge

**findById**
- Input: id
- Returns: Edge or null

**findByTarget**
- Input: targetNodeId
- Returns: array of Edges pointing to this node

**findBySource**
- Input: sourceNodeId
- Returns: array of Edges originating from this node

**findByLoomTree**
- Input: loomTreeId, filters (optional)
- Filters: edgeType
- Returns: array of Edges

**delete**
- Input: id
- Returns: boolean success

---

## AgentRepository

Manages Agent persistence.

### Operations

**create**
- Input: name, type, backendId, configuration, permissions, loomAware
- Returns: created Agent

**findById**
- Input: id
- Returns: Agent or null

**findByType**
- Input: type (human | model), filters (optional), pagination (optional)
- Filters: archived, loomAware
- Returns: array of Agents, total count

**findByBackend**
- Input: backendId
- Returns: array of Agents using this Human or Model

**update**
- Input: id, changes (name, configuration, permissions, loomAware)
- Returns: updated Agent

**archive**
- Input: id
- Returns: boolean success

**restore**
- Input: id
- Returns: boolean success

---

## HumanRepository

Manages Human persistence.

### Operations

**create**
- Input: displayName, email (optional), preferences
- Returns: created Human

**findById**
- Input: id
- Returns: Human or null

**findDefault**
- Returns: the default Human for single-user app

**update**
- Input: id, changes (displayName, email, avatarRef, preferences)
- Returns: updated Human

---

## ModelRepository

Manages Model persistence.

### Operations

**create**
- Input: identifier, provider, displayName, endpoint (optional), credentialsRef, capabilities
- Returns: created Model

**findById**
- Input: id
- Returns: Model or null

**findByProvider**
- Input: provider, filters (optional)
- Filters: archived, hasCredentials
- Returns: array of Models

**findByIdentifier**
- Input: identifier (e.g., "claude-sonnet-4-20250514")
- Returns: Model or null

**update**
- Input: id, changes (displayName, endpoint, credentialsRef, capabilities)
- Returns: updated Model

**archive**
- Input: id
- Returns: boolean success

---

## DocumentRepository

Manages Document persistence.

### Operations

**create**
- Input: groveId, title, content
- Returns: created Document

**findById**
- Input: id
- Returns: Document or null

**findByGrove**
- Input: groveId, filters (optional), pagination (optional)
- Filters: archived, search (full-text on title + content)
- Returns: array of Documents, total count

**update**
- Input: id, changes (title, content)
- Updates updatedAt timestamp
- Returns: updated Document

**archive**
- Input: id
- Returns: boolean success

**delete**
- Input: id
- Hard delete — removes Document and related Links
- Returns: boolean success

---

## LinkRepository

Manages Link persistence.

### Operations

**create**
- Input: groveId, sourceType, sourceId, targetType, targetId, label (optional)
- Returns: created Link

**findById**
- Input: id
- Returns: Link or null

**findBySource**
- Input: sourceType, sourceId
- Returns: array of Links from this item

**findByTarget**
- Input: targetType, targetId
- Returns: array of Links to this item

**findConnections**
- Input: itemType, itemId
- Returns: all Links where item is source OR target

**delete**
- Input: id
- Returns: boolean success

**deleteOrphaned**
- Removes Links where source or target no longer exists
- Returns: count of deleted Links

---

## TagRepository

Manages Tag and TagAssignment persistence.

### Operations

**createTag**
- Input: groveId, name, color (optional)
- Enforces unique name within Grove (case-insensitive)
- Returns: created Tag

**findTagById**
- Input: id
- Returns: Tag or null

**findTagByName**
- Input: groveId, name
- Returns: Tag or null

**findTagsByGrove**
- Input: groveId
- Returns: array of Tags

**updateTag**
- Input: id, changes (name, color)
- Returns: updated Tag

**deleteTag**
- Input: id
- Removes Tag and all TagAssignments
- Returns: boolean success

**assignTag**
- Input: tagId, targetType, targetId
- Creates TagAssignment if not exists
- Returns: created or existing TagAssignment

**unassignTag**
- Input: tagId, targetType, targetId
- Removes TagAssignment
- Returns: boolean success

**findTagsForItem**
- Input: targetType, targetId
- Returns: array of Tags assigned to this item

**findItemsWithTag**
- Input: tagId, targetType (optional)
- Returns: array of items (type + id pairs)

---

## RawApiResponseRepository

Manages provenance API response storage.

### Operations

**create**
- Input: nodeId, provider, requestId, modelIdentifier, responseBody, responseHeaders, timestamps, tokenUsage
- Compresses responseBody and responseHeaders
- Returns: created RawApiResponse

**findByNode**
- Input: nodeId
- Returns: RawApiResponse or null (decompresses on retrieval)

**delete**
- Input: id
- Returns: boolean success

**deleteByNode**
- Input: nodeId
- Returns: boolean success

---

## TimestampCertificateRepository

Manages RFC 3161 timestamp certificates.

### Operations

**create**
- Input: nodeId, contentHash, timestampAuthority, certificate, timestamp
- Returns: created TimestampCertificate

**findByNode**
- Input: nodeId
- Returns: TimestampCertificate or null

**findPending**
- Returns: array of Nodes awaiting timestamp (no certificate yet)

**findUnverified**
- Returns: array of TimestampCertificates where verified = false

**markVerified**
- Input: id
- Sets verified = true, verifiedAt = now
- Returns: updated TimestampCertificate

**delete**
- Input: id
- Returns: boolean success

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

- Use case requests transaction from unit of work
- Performs multiple repository operations
- Commits on success, rolls back on error
- Repositories detect active transaction and participate