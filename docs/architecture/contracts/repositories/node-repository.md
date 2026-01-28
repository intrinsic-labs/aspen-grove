# NodeRepository

> Manages Node persistence.

---

## Operations

### create

Creates a new Node with optional parent connections.

**Input:**
- `loomTreeId` — ULID, reference to parent LoomTree
- `content` — Content object (text, image, audio, or mixed)
- `authorAgentId` — ULID, reference to the authoring Agent
- `authorType` — enum: `human` | `model`
- `contentHash` — string, pre-computed hash (see [Provenance](../../model/provenance.md#hash-chain-computation))
- `parentNodeIds` — optional array of ULIDs
- `editedFrom` — optional ULID, for version nodes in Buffer Mode

**Behavior:**
- `contentHash` is pre-computed by use case layer
- Creates Node with generated id and provided contentHash
- Creates Continuation edges from parents if provided

**Returns:** Created Node

---

### findById

Retrieves a Node by ID.

**Input:**
- `id` — ULID

**Returns:** Node or null

---

### findByLoomTree

Lists Nodes in a LoomTree with optional filtering and pagination.

**Input:**
- `loomTreeId` — ULID
- `filters` — optional object:
  - `authorAgentId` — ULID, filter by author
  - `authorType` — `human` | `model`, filter by author type
  - `bookmarked` — boolean, filter bookmarked nodes
  - `pruned` — boolean, filter pruned nodes
  - `contentType` — `text` | `image` | `audio` | `mixed`
- `pagination` — optional object:
  - `limit` — number
  - `offset` — number

**Returns:** Array of Nodes, total count

---

### findRoot

Finds the root Node of a LoomTree.

**Input:**
- `loomTreeId` — ULID

**Behavior:**
- Finds the node with no incoming Continuation edges

**Returns:** Root Node

---

### findChildren

Finds all direct children of a Node.

**Input:**
- `nodeId` — ULID

**Behavior:**
- Finds Nodes connected by outgoing Continuation edges

**Returns:** Array of Nodes

---

### findSiblings

Finds sibling Nodes (nodes sharing the same parent).

**Input:**
- `nodeId` — ULID

**Behavior:**
- Finds Nodes sharing the same parent, excluding the given node

**Returns:** Array of Nodes

---

### findPath

Computes the path from root to a given Node.

**Input:**
- `nodeId` — ULID

**Behavior:**
- Traverses Continuation edges backward to root

**Returns:** Ordered array of Nodes from root to given node

---

### updateMetadata

Updates Node metadata without modifying content.

**Input:**
- `id` — ULID
- `metadata` — object with optional fields:
  - `bookmarked` — boolean
  - `bookmarkLabel` — string
  - `pruned` — boolean
  - `excluded` — boolean

**Behavior:**
- Does not modify content or contentHash
- Updates only metadata fields

**Returns:** Updated Node

*Note: Tags are managed separately via [TagRepository](./tag-repository.md). Use `assignTag` and `unassignTag` for Node tagging.*

---

### verifyHash

Verifies the hash integrity of a single Node.

**Input:**
- `id` — ULID

**Behavior:**
- Retrieves Node and required verification data
- Delegates to hash verification service for recomputation

**Returns:** Verification result (`valid` | `invalid` | `incomplete`)

---

### verifyPathHashes

Verifies hash integrity for an entire path.

**Input:**
- `nodeId` — ULID

**Behavior:**
- Retrieves path from root to given node
- Delegates to hash verification service for chain verification

**Returns:** Array of verification results per node

*Note: Hash verification requires different algorithms for human vs model nodes, and model node verification requires joining with RawApiResponse data. The repository coordinates data retrieval but delegates actual verification logic to a domain service.*

---

## Related Documentation

- [Core Entities: Node](../../model/core-entities.md) — Entity definition
- [Provenance](../../model/provenance.md) — Hash chain computation
- [Edge Repository](./edge-repository.md) — Edge persistence
- [Tag Repository](./tag-repository.md) — Tagging operations