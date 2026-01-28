# TagRepository

> Manages Tag and TagAssignment persistence.

---

## Tag Operations

### createTag

Creates a new Tag.

**Input:**
- `groveId` — ULID, reference to parent Grove
- `name` — string, the tag text (e.g., "research", "claude", "important")
- `color` — optional string, hex color for UI display

**Behavior:**
- Generates id and timestamp
- Enforces unique name within Grove (case-insensitive)
- Use `COLLATE NOCASE` in SQLite or normalize to lowercase on insert

**Returns:** Created Tag

**Throws:** `ConflictError` if tag name already exists in Grove

---

### findTagById

Retrieves a Tag by ID.

**Input:**
- `id` — ULID

**Returns:** Tag or null

---

### findTagByName

Finds a Tag by name within a Grove.

**Input:**
- `groveId` — ULID
- `name` — string (case-insensitive match)

**Returns:** Tag or null

---

### findTagsByGrove

Lists all Tags in a Grove.

**Input:**
- `groveId` — ULID

**Returns:** Array of Tags

---

### updateTag

Updates Tag properties.

**Input:**
- `id` — ULID
- `changes` — object with optional fields:
  - `name` — string (must remain unique within Grove)
  - `color` — string, hex color

**Behavior:**
- Validates uniqueness if name changes

**Returns:** Updated Tag

**Throws:** `ConflictError` if new name conflicts with existing tag

---

### deleteTag

Removes a Tag and all its assignments.

**Input:**
- `id` — ULID

**Behavior:**
- Removes Tag entity
- Removes all TagAssignments referencing this tag
- Does not affect the tagged items themselves

**Returns:** Boolean success

---

## TagAssignment Operations

### assignTag

Assigns a Tag to an item.

**Input:**
- `tagId` — ULID, reference to Tag
- `targetType` — enum: `node` | `loomTree` | `document`
- `targetId` — ULID, reference to tagged item

**Behavior:**
- Creates TagAssignment if not exists
- If assignment already exists, returns existing (idempotent)

**Returns:** Created or existing TagAssignment

---

### unassignTag

Removes a Tag from an item.

**Input:**
- `tagId` — ULID
- `targetType` — enum: `node` | `loomTree` | `document`
- `targetId` — ULID

**Behavior:**
- Removes TagAssignment if exists
- No-op if assignment doesn't exist

**Returns:** Boolean success

---

### findTagsForItem

Finds all Tags assigned to a specific item.

**Input:**
- `targetType` — enum: `node` | `loomTree` | `document`
- `targetId` — ULID

**Returns:** Array of Tags

---

### findItemsWithTag

Finds all items that have a specific Tag.

**Input:**
- `tagId` — ULID
- `targetType` — optional enum: `node` | `loomTree` | `document`

**Behavior:**
- If `targetType` provided, filters to that type only
- If `targetType` omitted, returns all item types

**Returns:** Array of objects with `type` and `id` properties

---

## Query Patterns

| Query | Method |
|-------|--------|
| "Show all items tagged #research" | `findItemsWithTag(tagId)` |
| "Filter Loom Trees by #claude AND #comparison" | Multiple `findItemsWithTag` calls, intersect results |
| "What tags are on this Document?" | `findTagsForItem('document', docId)` |
| "Find all tags in my Grove" | `findTagsByGrove(groveId)` |

---

## Implementation Notes

### Case-Insensitive Uniqueness

Tags are case-insensitive unique within a Grove. Implementation options:

1. **SQLite COLLATE NOCASE**: Define the unique constraint with `COLLATE NOCASE`
2. **Normalize on insert**: Convert to lowercase before storing, store original for display

Recommended: Option 1 for simplicity, or store both normalized and display versions.

### Cascade Behavior

- Deleting a Tag removes all TagAssignments
- Deleting an item (Node, LoomTree, Document) should remove its TagAssignments
- TagAssignments are the only junction — Tags and items have no direct relationship

---

## Related Documentation

- [Organization Model](../../model/organization.md) — Entity definitions
- [Node Repository](./node-repository.md) — Node operations (doesn't store tags directly)
- [Link Repository](./link-repository.md) — Alternative organization mechanism