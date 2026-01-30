# EdgeRepository

> Manages Edge persistence.

---

## Operations

### create

Creates a new Edge connecting source Node(s) to a target Node.

**Input:**
- `loomTreeId` — ULID, reference to parent LoomTree
- `sources` — array of objects:
  - `nodeId` — ULID, reference to source Node
  - `role` — enum: `primary` | `context` | `instruction`
- `targetNodeId` — ULID, reference to target Node
- `edgeType` — enum: `continuation` | `annotation`

**Behavior:**
- Validates all nodes belong to the same LoomTree
- Creates Edge with generated id and timestamp

**Returns:** Created Edge

---

### findById

Retrieves an Edge by ID.

**Input:**
- `id` — ULID

**Returns:** Edge or null

---

### findByTarget

Finds all Edges pointing to a Node.

**Input:**
- `targetNodeId` — ULID

**Behavior:**
- Returns incoming edges for path computation

**Returns:** Array of Edges

---

### findBySource

Finds all Edges originating from a Node.

**Input:**
- `sourceNodeId` — ULID

**Behavior:**
- Returns outgoing edges for children lookup

**Returns:** Array of Edges

---

### findByLoomTree

Lists all Edges in a LoomTree with optional filtering.

**Input:**
- `loomTreeId` — ULID
- `filters` — optional object:
  - `edgeType` — `continuation` | `annotation`

**Returns:** Array of Edges

---

### delete

Removes an Edge.

**Input:**
- `id` — ULID

**Returns:** Boolean success

---

### addVersionSource

Adds a version node as an alternate source to an edge (for Buffer Mode editing).

**Input:**
- `edgeId` — ULID
- `versionNodeId` — ULID, the new version node to add as source
- `role` — enum: `primary` | `context` | `instruction` (typically matches existing sources)

**Behavior:**
- Appends new source to the edge's sources array
- Validates version node belongs to same LoomTree
- Used when editing a node creates a version node — all downstream edges gain the version as an alternate source

**Returns:** Updated Edge

---

## Hyperedge Support

In Buffer Mode, edges can have multiple sources to support version nodes. When a Node is edited (creating a version node with `editedFrom`), downstream edges are updated:

```typescript
// Example: Node 5 edited to create Node 5'
// Node 6's incoming edge becomes:
{
  sources: [
    { nodeId: "node5", role: "primary" },
    { nodeId: "node5-prime", role: "primary" }
  ],
  targetNodeId: "node6",
  edgeType: "continuation"
}
```

Path context determines which source to use during traversal.

See [Buffer Mode Spec](../../specs/buffer-mode.md) for complete details.

---

## Related Documentation

- [Core Entities: Edge](../../model/core-entities.md) — Entity definition
- [Node Repository](./node-repository.md) — Node persistence
- [Buffer Mode Spec](../../specs/buffer-mode.md) — Hyperedge behavior