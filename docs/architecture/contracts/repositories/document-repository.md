# DocumentRepository

> Manages Document persistence.

---

## Operations

### create

Creates a new Document.

**Input:**
- `groveId` — ULID, reference to parent Grove
- `title` — string, display name
- `blocks` — array of DocumentBlock objects (can be empty)

**Behavior:**
- Generates id and timestamps
- Creates Document with provided blocks

**Returns:** Created Document with `summary` initially null

---

### findById

Retrieves a Document by ID.

**Input:**
- `id` — ULID

**Returns:** Document or null

---

### findByGrove

Lists Documents in a Grove with optional filtering and pagination.

**Input:**
- `groveId` — ULID
- `filters` — optional object:
  - `archived` — boolean, filter by archive status
  - `search` — string, full-text search on title + text block content
- `pagination` — optional object:
  - `limit` — number
  - `offset` — number

**Returns:** Array of Documents, total count

---

### update

Updates Document content.

**Input:**
- `id` — ULID
- `changes` — object with optional fields:
  - `title` — string
  - `blocks` — array of DocumentBlock objects

**Behavior:**
- Updates `updatedAt` timestamp
- Replaces blocks array entirely (not partial update)
- Note: `summary` is not directly editable — use `regenerateSummary` instead
- Summary typically regenerates when user closes document after editing

**Returns:** Updated Document

---

### regenerateSummary

Triggers regeneration of the Document summary.

**Input:**
- `id` — ULID

**Behavior:**
- Analyzes document title and text block content
- Generates new summary via summarization model (Haiku/GPT-4o-mini)
- Updates `summary` field and `updatedAt` timestamp

**Returns:** Updated Document

**Triggers:**
- Called automatically when user closes document after editing
- Can be invoked manually if summary is null or stale

---

### archive

Soft-deletes a Document.

**Input:**
- `id` — ULID

**Behavior:**
- Sets `archivedAt` to current timestamp

**Returns:** Boolean success

---

### restore

Restores an archived Document.

**Input:**
- `id` — ULID

**Behavior:**
- Clears `archivedAt`

**Returns:** Boolean success

---

### delete

Hard-deletes a Document.

**Input:**
- `id` — ULID

**Behavior:**
- Removes Document and related Links
- Does not remove referenced Nodes or LoomTrees (only the Links to them)

**Returns:** Boolean success

---

## Block Types

Documents support rich content through various block types. See [Organization Model](../../model/organization.md#content-block-primitives) for full specification.

### Shared Primitives
- TextBlock
- ImageBlock
- AudioBlock

### Document-Specific Blocks
- HeadingBlock
- CodeBlock
- CalloutBlock
- NodeEmbedBlock
- TreeEmbedBlock
- DividerBlock

---

## Embed Considerations

When Documents contain embed blocks (`node-embed`, `tree-embed`):

- Corresponding Link entities should be created for bidirectional querying
- Invalid embed references (deleted nodes/trees) display gracefully with "content unavailable" state
- Deleting a Document removes the Links but not the referenced content

---

## Related Documentation

- [Organization Model](../../model/organization.md) — Entity definition
- [Link Repository](./link-repository.md) — Link persistence
- [Grove Repository](./grove-repository.md) — Grove persistence