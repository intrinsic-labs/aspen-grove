# Organization Entities Model Specification

> Specification for Grove, Document, Link, and Tag — the organizational structures of Aspen Grove.

---

## Content Block Primitives

Aspen Grove uses a shared set of content block primitives across both Nodes and Documents. This ensures consistency in how multimodal content is handled throughout the system.

### Shared Primitives (from Core Entities)

These block types are defined in [core-entities.md](./core-entities.md) and reused here:

- **TextBlock** — `{ type: 'text', text: string }` — markdown-compatible text
- **ImageBlock** — `{ type: 'image', ref, mimeType, width, height, thumbnailRef?, altText? }`
- **AudioBlock** — `{ type: 'audio', ref, mimeType, durationMs, transcriptRef? }`

Nodes use these primitives directly (or as a `mixed` array). Documents extend them with additional block types suited for structured prose.

### Document-Specific Block Types

#### Heading Block

- **type** — literal `heading`
- **level** — number: `1 | 2 | 3 | 4 | 5 | 6`
- **text** — string, the heading content

#### Code Block

- **type** — literal `code`
- **language** — optional string (e.g., `typescript`, `python`)
- **code** — string, the code content

#### Callout Block

- **type** — literal `callout`
- **variant** — enum: `info` | `warning` | `tip` | `note`
- **content** — array of TextBlock | ImageBlock (nested content)

#### Node Embed Block

- **type** — literal `node-embed`
- **nodeId** — ULID, reference to the embedded Node
- **loomTreeId** — ULID, reference to the Node's parent LoomTree
- **displayMode** — enum: `inline` | `card` | `full`

#### Tree Embed Block

- **type** — literal `tree-embed`
- **loomTreeId** — ULID, reference to the embedded LoomTree
- **pathToNode** — optional ULID, specific node to highlight
- **displayMode** — enum: `card` | `preview`

#### Divider Block

- **type** — literal `divider`

### DocumentBlock Union

A DocumentBlock is one of:
- TextBlock (shared)
- ImageBlock (shared)
- AudioBlock (shared)
- HeadingBlock
- CodeBlock
- CalloutBlock
- NodeEmbedBlock
- TreeEmbedBlock
- DividerBlock

### Design Notes

- Shared primitives ensure consistent rendering components across Nodes and Documents
- Document-specific blocks enable richer authoring experiences
- Embed blocks create semantic links (also stored as Link entities for querying)
- New block types can be added without changing the Document schema
- Block order is significant — documents render blocks in array order

---

## Grove

The top-level container for all user data.

### Properties

- **id** — ULID, primary identifier
- **name** — string, display name (default: "My Grove")
- **ownerId** — ULID, reference to the Human who owns this Grove
- **createdAt** — timestamp
- **updatedAt** — timestamp

### Constraints

- One Grove per user (MVP — single-user app)
- Grove is created automatically on first launch
- All Loom Trees and Documents belong to exactly one Grove

### Indexes

- Primary: id
- By ownerId (for future multi-user support)

---

## Document

A rich, mutable document for notes, reference material, and composed artifacts.

### Properties

- **id** — ULID, primary identifier
- **groveId** — ULID, reference to parent Grove
- **title** — string, display name
- **blocks** — array of DocumentBlock objects (see Content Block Primitives above)
- **createdAt** — timestamp
- **updatedAt** — timestamp
- **archivedAt** — optional timestamp, soft delete marker

### Constraints

- Documents are mutable (unlike Nodes)
- Blocks array can be empty (blank document)
- Embed blocks (node-embed, tree-embed) should have corresponding Link entities for bidirectional querying
- Documents support all shared multimodal primitives plus document-specific block types

### Indexes

- Primary: id
- By groveId (for listing all documents)
- By groveId + updatedAt (for recent documents)
- By archivedAt null (for active documents only)
- Full-text search on title + text block content

### Rendering Considerations

- Shared blocks (Text, Image, Audio) use the same rendering components as Node content
- Document-specific blocks have dedicated renderers
- Embed blocks fetch and display referenced content inline
- Invalid embed references (deleted nodes/trees) display gracefully with "content unavailable" state

---

## Link

A bidirectional reference between any two items.

### Properties

- **id** — ULID, primary identifier
- **groveId** — ULID, reference to parent Grove
- **sourceType** — enum: `node` | `loomTree` | `document`
- **sourceId** — ULID, reference to source item
- **targetType** — enum: `node` | `loomTree` | `document`
- **targetId** — ULID, reference to target item
- **label** — optional string, describes the relationship
- **createdAt** — timestamp

### Constraints

- Links are bidirectional — querying from either end returns the link
- Source and target can be different types (e.g., Document → Node)
- Links within the same Loom Tree use Edge with type `link`, not this entity
- This Link entity is for cross-tree and cross-document references

### Indexes

- Primary: id
- By groveId (for listing all links)
- By sourceType + sourceId (for finding links from an item)
- By targetType + targetId (for finding links to an item)

### Query Patterns

- "What links point to this Node?" — query by targetType=node, targetId=X
- "What does this Document reference?" — query by sourceType=document, sourceId=X
- "Show all connections for this Loom Tree" — query both source and target

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

- Tag names are unique within a Grove (case-insensitive)
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
- **targetType** — enum: `node` | `loomTree` | `document`
- **targetId** — ULID, reference to tagged item
- **createdAt** — timestamp

### Constraints

- One tag can be assigned to many items
- One item can have many tags
- Duplicate assignments (same tag + same target) are not allowed

### Indexes

- Primary: id
- By tagId (for finding all items with a tag)
- By targetType + targetId (for finding all tags on an item)
- Unique constraint on tagId + targetType + targetId

### Query Patterns

- "What items have tag X?" — query by tagId
- "What tags are on this Document?" — query by targetType=document, targetId=X
- "Filter Loom Trees by tag" — join TagAssignment where targetType=loomTree

---

## Relationships Summary

### Grove Ownership

- Grove → Human (owner)
- Grove contains: Loom Trees, Documents, Tags, Links

### Loom Tree Containment

- LoomTree → Grove
- LoomTree contains: Nodes, Edges

### Cross-References

- Link connects any two items across types
- TagAssignment connects Tags to any item type

---

## Search and Discovery

### Full-Text Search Targets

- Document: title, text blocks content, heading blocks content
- LoomTree: title, systemContext
- Node: text content (when type is text or mixed)
- Tag: name

### Filter Dimensions

- By type (Loom Tree, Document)
- By tag (one or more)
- By date range (created, updated)
- By archived status

### Sort Options

- Recently updated
- Recently created
- Alphabetical by title
- Most linked (future)

---

## Lifecycle Considerations

### Archiving vs Deletion

- Soft delete via archivedAt timestamp
- Archived items excluded from default queries
- Can be restored by clearing archivedAt
- Hard delete available but requires confirmation

### Cascade Behavior

- Archiving a Loom Tree: Nodes and Edges remain but are inaccessible
- Archiving a Document: Links remain but show "archived" state
- Deleting a Tag: TagAssignments are deleted, items remain
- Deleting a Loom Tree: Nodes, Edges, and related Links are deleted

### Orphan Handling

- Links to deleted items: remove Link or mark as broken
- TagAssignments to deleted items: remove automatically
- Media files for deleted Nodes: cleanup job removes orphaned files
- Media files for deleted Documents: same cleanup job handles document media
- Embed blocks in Documents pointing to deleted content: render as "unavailable" until document is edited