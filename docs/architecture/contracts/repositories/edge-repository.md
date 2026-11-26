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

### addSourceToEdge

`addSourceToEdge(edgeId, source): Promise<Edge>` creates an `edge_sources` row or updates the role for an existing (edge, node) pair. Other source rows retain their roles.

### Buffer mutation

`IBufferMutationRepository.apply(plan)` checks the buffer tree, path owner, expected sequence, revision, edit lineage and tree-local IDs inside one writer. A successful batch creates immutable versions and edges, appends primary sources to existing continuation edges, and writes the selected path’s sequence, buffer cursor, incoming selections and tree activity together. Existing context and instruction sources survive.

The revision is `paths.updated_at` in epoch milliseconds. Each batch advances it to at least the previous value plus one, so two commands in the same millisecond remain distinguishable. `applied` acknowledges a committed batch. `already-applied` recognizes the intended sequence and inserted IDs. A switch can create zero nodes, so the first sequence membership carries the operation ID as a durable retry marker. Other mismatches return `stale` before preparation.

Commit and switch share a per-tree queue. Each command uses a draft snapshot with a stable operation ID, timestamp and reserved IDs. Drafts live in Watermelon local storage by tree and path. Reads report sequence or revision conflicts and retain the text for recovery. A successful command clears its own snapshot. Hard tree deletion clears drafts for its paths.

---

## Hyperedge Support (Buffer Mode)

Hyperedge support is **specific to Buffer Mode** — it enables edits without duplicating downstream nodes.

**Note on `editedFrom`**: The `editedFrom` field is set in **both** Dialogue and Buffer modes when a node is created by editing another. The difference is in tree behavior:
- **Dialogue Mode**: Edit creates a traditional branch (sibling node, separate downstream). No hyperedge updates needed.
- **Buffer Mode**: Edit creates a version node, and downstream edges are updated to accept either version as a source.

When a Node is edited in Buffer Mode (creating a version node with `editedFrom`), downstream edges are updated:

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