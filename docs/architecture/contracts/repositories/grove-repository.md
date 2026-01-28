# GroveRepository

> Manages Grove persistence.

---

## Operations

### create

Creates a new Grove.

**Input:**
- `name` — optional string, defaults to "My Grove"
- `ownerAgentId` — ULID, reference to the owner (human) Agent

**Behavior:**
- Generates id and timestamps
- Creates the top-level container for user data

**Returns:** Created Grove

---

### findById

Retrieves a Grove by ID.

**Input:**
- `id` — ULID

**Returns:** Grove or null

---

### findByOwner

Finds the Grove owned by a specific Agent.

**Input:**
- `ownerAgentId` — ULID

**Behavior:**
- In MVP, there is one Grove per user
- Returns the Grove where `ownerAgentId` matches

**Returns:** Grove or null

---

### update

Updates Grove properties.

**Input:**
- `id` — ULID
- `changes` — object with optional fields:
  - `name` — string

**Behavior:**
- Updates `updatedAt` timestamp

**Returns:** Updated Grove

---

## MVP Constraints

- One Grove per user (single-user app)
- Grove is created automatically on first launch
- No delete operation — Grove persists for app lifetime
- All Loom Trees and Documents belong to exactly one Grove

---

## Related Documentation

- [Organization Model](../../model/organization.md) — Entity definition
- [Loom Tree Repository](./loom-tree-repository.md) — LoomTree persistence
- [Document Repository](./document-repository.md) — Document persistence