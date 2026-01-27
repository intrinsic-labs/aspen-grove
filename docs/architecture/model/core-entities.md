# Core Entities Model Specification

> Specification for the fundamental data structures of Aspen Grove: LoomTree, Node, and Edge.

---

## LoomTree

The top-level container for a branching exploration.

### Properties

- **id** — ULID, primary identifier
- **title** — string, user-editable display name
- **rootNodeId** — ULID, reference to the single root Node
- **mode** — enum: `dialogue` | `buffer`
- **systemContext** — optional string, persistent instructions prepended to every context window
- **createdAt** — timestamp
- **updatedAt** — timestamp
- **archivedAt** — optional timestamp, soft delete marker

### Constraints

- Every LoomTree has exactly one root Node
- Title defaults to first few words of root content or "Untitled"
- Mode is set at creation and cannot change (different modes have different rendering logic)

### Indexes

- Primary: id
- By createdAt (for listing/sorting)
- By archivedAt null (for active trees only)

---

## Node

A single unit of content within a Loom Tree.

### Properties

- **id** — ULID, primary identifier
- **loomTreeId** — ULID, reference to parent LoomTree
- **content** — Content object (see Content Types below)
- **authorAgentId** — ULID, reference to the Agent that created this node
- **contentHash** — string, computed hash for tamper evidence
- **createdAt** — timestamp
- **metadata** — NodeMetadata object

### NodeMetadata Properties

- **bookmarked** — boolean, default false
- **bookmarkLabel** — optional string
- **pruned** — boolean, default false (soft delete for branches)
- **excluded** — boolean, default false (excluded from context window)
- **tags** — array of strings

### Constraints

- Nodes are **immutable** once created — edits create new Nodes
- contentHash is computed from: content + parent hashes + createdAt + authorAgentId
- A Node with no incoming Continuation edges is the root (exactly one per LoomTree)

### Indexes

- Primary: id
- By loomTreeId (for loading all nodes of a tree)
- By loomTreeId + createdAt (for ordered traversal)
- By authorAgentId (for filtering by author)
- By bookmarked = true (for quick bookmark access)

---

## Edge

A directed hyperedge connecting source Node(s) to a target Node.

### Properties

- **id** — ULID, primary identifier
- **loomTreeId** — ULID, reference to parent LoomTree
- **sources** — array of EdgeSource objects
- **targetNodeId** — ULID, reference to the target Node
- **edgeType** — enum: `continuation` | `annotation` | `link`
- **createdAt** — timestamp

### EdgeSource Properties

- **nodeId** — ULID, reference to a source Node
- **role** — enum: `primary` | `context` | `instruction`

### Constraints

- Most edges have a single source with role `primary`
- Multi-source edges are used for complex generation (e.g., image + text prompt)
- An Edge's sources and target must belong to the same LoomTree (except `link` type which can cross trees)
- `annotation` edges are excluded from context window by default
- `link` edges are for cross-referencing, not traversal

### Indexes

- Primary: id
- By loomTreeId (for loading all edges of a tree)
- By targetNodeId (for finding incoming edges — path computation)
- By source nodeId (for finding outgoing edges — children lookup)

---

## Content Types

Node content uses a discriminated union pattern for extensibility.

### Text Content

- **type** — literal `text`
- **text** — string, markdown-compatible

### Image Content

- **type** — literal `image`
- **ref** — string, file path or blob ID
- **mimeType** — string (e.g., `image/png`, `image/jpeg`)
- **width** — number, pixels
- **height** — number, pixels
- **thumbnailRef** — optional string, reference to thumbnail
- **altText** — optional string, accessibility description

### Audio Content

- **type** — literal `audio`
- **ref** — string, file path or blob ID
- **mimeType** — string (e.g., `audio/mp3`, `audio/wav`)
- **durationMs** — number, duration in milliseconds
- **transcriptRef** — optional string, reference to transcript Node

### Mixed Content

- **type** — literal `mixed`
- **blocks** — ordered array of Text, Image, or Audio content objects

### Design Notes

- New content types can be added without changing Node schema
- References point to filesystem; actual bytes never stored in database
- Thumbnails enable fast rendering without loading full images
- Transcript references allow linking audio to searchable text

---

## Computed Concepts (Not Stored)

These are derived from the stored entities:

### Path

- Ordered array of Node IDs from root to a given node
- Computed by traversing Continuation edges backward from target to root
- The **Active Path** is UI state, not persisted

### Branch Point

- A Node that has multiple outgoing Continuation edges
- Detected by querying edges where source nodeId matches and edgeType is `continuation`

### Siblings

- Nodes that share the same parent (same source Node via Continuation edge)
- Computed by finding all Continuation edges from a given source Node

### Leaf

- A Node with no outgoing Continuation edges
- Detected by absence of edges where source nodeId matches and edgeType is `continuation`

---

## Hash Chain Computation

The contentHash provides tamper evidence.

### Inputs to Hash

1. Serialized content (deterministic JSON serialization)
2. Array of parent node contentHashes (via incoming Continuation edges), sorted
3. createdAt timestamp (ISO 8601)
4. authorAgentId

### Algorithm

- Concatenate inputs with delimiter
- Compute SHA-256 hash
- Encode as hex string

### Properties

- Any modification to content or ancestry invalidates the hash
- Root nodes have no parent hashes (empty array)
- Hash verification traverses from root to validate entire chain