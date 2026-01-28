# LinkRepository

> Manages Link persistence for cross-references between items.

---

## Operations

### create

Creates a new bidirectional Link between two items.

**Input:**
- `groveId` — ULID, reference to parent Grove
- `sourceType` — enum: `node` | `loomTree` | `document`
- `sourceId` — ULID, reference to source item
- `targetType` — enum: `node` | `loomTree` | `document`
- `targetId` — ULID, reference to target item
- `label` — optional string, describes the relationship

**Behavior:**
- Generates id and timestamp
- Creates bidirectional reference (queryable from either end)

**Returns:** Created Link

---

### findById

Retrieves a Link by ID.

**Input:**
- `id` — ULID

**Returns:** Link or null

---

### findBySource

Finds all Links originating from a specific item.

**Input:**
- `sourceType` — enum: `node` | `loomTree` | `document`
- `sourceId` — ULID

**Behavior:**
- Returns Links where the item is the source

**Returns:** Array of Links

---

### findByTarget

Finds all Links pointing to a specific item.

**Input:**
- `targetType` — enum: `node` | `loomTree` | `document`
- `targetId` — ULID

**Behavior:**
- Returns Links where the item is the target

**Returns:** Array of Links

---

### findConnections

Finds all Links connected to an item (as source OR target).

**Input:**
- `itemType` — enum: `node` | `loomTree` | `document`
- `itemId` — ULID

**Behavior:**
- Returns all Links where the item appears on either side
- Useful for showing all connections in a knowledge graph view

**Returns:** Array of Links

---

### delete

Removes a Link.

**Input:**
- `id` — ULID

**Returns:** Boolean success

---

### deleteOrphaned

Removes Links where source or target no longer exists.

**Behavior:**
- Scans for Links pointing to deleted items
- Removes orphaned Links automatically
- Typically called during cleanup/maintenance

**Returns:** Count of deleted Links

---

## Important Distinction

- **Links** connect items *across* Loom Trees or between Trees and Documents
- **Edges** connect Nodes *within* a single Loom Tree

Links are for the knowledge graph. Edges are for tree structure.

---

## Query Patterns

| Query | Method |
|-------|--------|
| "What links point to this Node?" | `findByTarget('node', nodeId)` |
| "What does this Document reference?" | `findBySource('document', docId)` |
| "Show all connections for this Loom Tree" | `findConnections('loomTree', treeId)` |
| "Find all links in the Grove" | Query by `groveId` (not exposed as dedicated method) |

---

## Related Documentation

- [Organization Model](../../model/organization.md) — Entity definition
- [Document Repository](./document-repository.md) — Document persistence (embeds create Links)
- [Tag Repository](./tag-repository.md) — Alternative organization mechanism