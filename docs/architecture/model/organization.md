# Organization Entities Model Specification

> Specification for Grove, Tag and TagAssignment — the organizational structures of Aspen Grove.

Code: `src/domain/entities/grove.ts`, `src/domain/entities/tag.ts`; persistence in `WatermelonGroveRepository` and `WatermelonTagRepository`.

---

## Grove

The top-level container for all user data.

### Properties

- **id** — ULID, primary identifier
- **name** — string, display name (default: "My Grove")
- **ownerAgentId** — ULID, reference to the owner (human) Agent
- **createdAt** — timestamp
- **updatedAt** — timestamp

### Constraints

- One Grove per user (single-user, local-first app)
- Grove is created automatically on first launch
- All Loom Trees and Tags belong to exactly one Grove

### Indexes

- Primary: id

---

## Tag

A label for organization and filtering.

### Properties

- **id** — ULID, primary identifier
- **groveId** — ULID, reference to parent Grove
- **name** — string, the tag text (e.g., "research", "claude", "important")
- **color** — optional string, hex color for UI display
- **createdAt** — timestamp

### Constraints

- Tag names are unique within a Grove (case-sensitive)
- Tags are created on first use, or manually
- Deleting a tag removes all TagAssignments but not the tagged items

### Indexes

- Primary: id
- By groveId (for listing all tags)
- By groveId + name (for lookup/uniqueness)

---

## TagAssignment

Junction entity connecting Tags to items.

### Properties

- **id** — ULID, primary identifier
- **tagId** — ULID, reference to Tag
- **targetType** — enum: `node` | `loomTree`
- **targetId** — ULID, reference to tagged item
- **createdAt** — timestamp

### Constraints

- One tag can be assigned to many items
- One item can have many tags
- Duplicate assignments (same tag + same target) are not allowed

### Query Patterns

- "What items have tag X?" — query by tagId
- "What tags are on this tree?" — query by targetType=loomTree, targetId=X
- "Filter Loom Trees by tag" — the tree list's filter chips

---

## Relationships Summary

- Grove → Human Agent (owner)
- Grove contains: Loom Trees, Tags
- LoomTree contains: Nodes, Edges
- TagAssignment connects Tags to Loom Trees and Nodes

There is no cross-tree link entity: Edges connect Nodes within one tree.

---

## Search

Search runs across all trees on node text content (`INodeRepository.searchByContent`, a `LIKE` query), with results grouped by tree.

---

## Lifecycle Considerations

- **Archiving a Loom Tree** sets `archivedAt`; archived trees are excluded from default queries and can be restored
- **Hard-deleting a Loom Tree** removes its Nodes, Edges and tree-owned Agents
- **Deleting a Tag** deletes its TagAssignments; the items remain
