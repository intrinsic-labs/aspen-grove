# LoomTreeRepository

> Manages LoomTree persistence.

---

## Operations

### create

Creates a new LoomTree with its root Node.

**Input:**
- `groveId` — ULID, reference to parent Grove
- `mode` — enum: `dialogue` | `buffer`
- `title` — optional string, display name
- `description` — optional string
- `systemContext` — optional string, persistent instructions
- `initialContent` — optional content for root Node
- `authorAgentId` — required if `initialContent` provided

**Behavior:**
- Creates LoomTree with generated id and timestamps
- Creates root Node with `initialContent` (or empty content if not provided)
- If `initialContent` provided, `authorAgentId` must be provided for the root Node
- If `title` not provided, derives from `initialContent` (first ~50 chars) or defaults to "Loom Tree ${timestamp}"

**Returns:** Created LoomTree with `rootNodeId` populated, `summary` initially null

---

### findById

Retrieves a LoomTree by ID.

**Input:**
- `id` — ULID

**Returns:** LoomTree or null

---

### findByGrove

Lists LoomTrees in a Grove with optional filtering and pagination.

**Input:**
- `groveId` — ULID
- `filters` — optional object:
  - `archived` — boolean, filter by archive status
  - `mode` — `dialogue` | `buffer`, filter by mode
  - `search` — string, search in title/description
- `pagination` — optional object:
  - `limit` — number
  - `offset` — number

**Returns:** Array of LoomTrees, total count

---

### update

Updates LoomTree metadata.

**Input:**
- `id` — ULID
- `changes` — object with optional fields:
  - `title` — string
  - `description` — string
  - `systemContext` — string

**Behavior:**
- Updates `updatedAt` timestamp
- Note: `summary` is not directly editable — use `regenerateSummary` instead

**Returns:** Updated LoomTree

---

### regenerateSummary

Triggers regeneration of the LoomTree summary.

**Input:**
- `id` — ULID

**Behavior:**
- Gathers node summaries from primary path and branch points
- Includes user-edited `description` field as context
- Generates new summary via summarization model (Haiku/GPT-4o-mini)
- Updates `summary` field and `updatedAt` timestamp

**Returns:** Updated LoomTree

**Triggers:**
- Called automatically every 10 new nodes (configurable)
- Called on tree close
- Can be invoked manually by user

---

### archive

Soft-deletes a LoomTree.

**Input:**
- `id` — ULID

**Behavior:**
- Sets `archivedAt` to current timestamp

**Returns:** Boolean success

---

### restore

Restores an archived LoomTree.

**Input:**
- `id` — ULID

**Behavior:**
- Clears `archivedAt`

**Returns:** Boolean success

---

### delete

Hard-deletes a LoomTree and all related data.

**Input:**
- `id` — ULID

**Behavior:**
- Removes LoomTree, all Nodes, all Edges
- Cascades to provenance records and media files

**Returns:** Boolean success

---

## Related Documentation

- [Core Entities: LoomTree](../../model/core-entities.md) — Entity definition
- [Node Repository](./node-repository.md) — Node persistence
- [Edge Repository](./edge-repository.md) — Edge persistence