# Core Entities Model Specification

> Specification for the fundamental data structures of Aspen Grove: LoomTree, Node, and Edge.

---

## LoomTree

The top-level container for a branching exploration.

### Properties

- **id** — ULID, primary identifier
- **groveId** — ULID, reference to parent Grove
- **title** — string, user-editable display name
- **description** — optional string, user-editable tree description
- **rootNodeId** — ULID, reference to the single root Node
- **mode** — enum: `dialogue` | `buffer`
- **systemContext** — optional string, persistent instructions prepended to every context window
- **createdAt** — timestamp
- **updatedAt** — timestamp
- **archivedAt** — optional timestamp, soft delete marker

### Constraints

- Every LoomTree has exactly one root Node
- Title defaults to first few words of root content or "Loom Tree <index>"
- Description defaults to nil
- Mode is set at creation and cannot change (different modes have different rendering logic)

### Indexes

- Primary: id
- By groveId (for listing trees in a Grove)
- By groveId + createdAt (for listing/sorting within Grove)
- By archivedAt null (for active trees only)

---

## Node

A single unit of content within a Loom Tree.

### Properties

- **id** — ULID, primary identifier
- **loomTreeId** — ULID, reference to parent LoomTree
- **content** — Content object (see Content Types below)
- **authorAgentId** — ULID, reference to the Agent that created this node
- **authorType** — enum: `human` | `model`, denormalized from Agent.type for efficient hash verification
- **contentHash** — string, computed hash for tamper evidence
- **createdAt** — timestamp
- **metadata** — NodeMetadata object
- **editedFrom** — optional ULID, reference to the Node this was edited from (Buffer Mode version relationship)

### NodeMetadata Properties

- **bookmarked** — boolean, default false
- **bookmarkLabel** — optional string
- **pruned** — boolean, default false (soft delete for branches)
- **excluded** — boolean, default false (excluded from context window)

*Note: Tags are managed via TagAssignment, not stored on the Node. See [Organization](./organization.md#tagassignment) for the tagging system.*

### Constraints

- Nodes are **immutable** once created — edits create new Nodes
- authorType is set at creation from the authoring Agent's type and never changes
- contentHash computation differs by authorType (see [Provenance](./provenance.md#hash-chain-computation))
- A Node with no incoming Continuation edges is the root (exactly one per LoomTree)
- If `editedFrom` is set, this Node is a *version* of the referenced Node (see [Buffer Mode](#buffer-mode-version-nodes))

### Indexes

- Primary: id
- By loomTreeId (for loading all nodes of a tree)
- By loomTreeId + createdAt (for ordered traversal)
- By authorAgentId (for filtering by author)
- By authorType (for filtering human vs model nodes)
- By bookmarked = true (for quick bookmark access)
- By editedFrom (for finding all versions of a node)

---

## Edge

A directed hyperedge connecting source Node(s) to a target Node.

### Properties

- **id** — ULID, primary identifier
- **loomTreeId** — ULID, reference to parent LoomTree
- **sources** — array of EdgeSource objects
- **targetNodeId** — ULID, reference to the target Node
- **edgeType** — enum: `continuation` | `annotation`
- **createdAt** — timestamp

### EdgeSource Properties

- **nodeId** — ULID, reference to a source Node
- **role** — enum: `primary` | `context` | `instruction`

### Constraints

- Most edges have a single source with role `primary`
- Multi-source edges are used for complex generation (e.g., image + text prompt)
- All Edge sources and targets must belong to the same LoomTree
- `annotation` edges are excluded from context window by default

### Hyperedge Behavior for Version Nodes (Buffer Mode)

In Buffer Mode, when a Node is edited (creating a version node with `editedFrom`), downstream edges are updated to accept either version as a valid source:

- Edge sources array can contain multiple nodeIds representing **version equivalents**
- When traversing, the active path determines which version to use
- This enables editing nodes without duplicating all downstream nodes

Example: If Node 5 is edited to create Node 5':
- Node 6's incoming edge: `sources: [{nodeId: 5, role: primary}, {nodeId: 5', role: primary}]`
- Path context specifies whether to use 5 or 5'
- Node 6 (and all downstream) remains shared — no duplication

See [buffer-mode.md](../specs/buffer-mode.md) for the complete specification.

*Note: Cross-references between Loom Trees, Documents, and Nodes use the [Link entity](./organization.md#link), not Edges.*

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

### Shared Primitives

The TextBlock, ImageBlock, and AudioBlock types defined here are **shared primitives** used across the system. Documents extend these with additional block types suited for structured prose (headings, code blocks, callouts, embeds, etc.).

See [organization.md](./organization.md#content-block-primitives) for the complete DocumentBlock type system that builds on these primitives.

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

Each Node stores a `contentHash` field that provides tamper evidence. The hash computation algorithm differs for human-authored vs model-generated nodes to maximize provenance integrity.

For the complete hash chain algorithm, verification process, and rationale, see [Provenance Entities](./provenance.md#hash-chain-computation).

**Key points:**
- Human nodes hash against `authorAgentId`
- Model nodes hash against the SHA-256 of their `RawApiResponse`
- Any modification to content or ancestry invalidates the hash chain

---

## Buffer Mode: Version Nodes

Buffer Mode introduces the concept of **version nodes** — nodes that represent edits to existing content without creating traditional branches.

### The Problem

In a traditional tree, editing node 5 in an 18-node path would require duplicating nodes 6-18 to create a new branch. This is wasteful when the user just wants to fix a typo.

### The Solution

Version nodes use the `editedFrom` field and hyperedge support to enable edits without downstream duplication:

1. **Version relationship**: `editedFrom` links the edited node to its original
2. **Hyperedge sources**: Downstream edges accept any version as a valid source
3. **Path resolution**: The active path specifies which version to use at each position

### Version vs Branch

| Concept | Created by | Downstream behavior | Use case |
|---------|------------|---------------------|----------|
| **Version** | Editing existing content | Shared (no duplication) | "Fix this typo" |
| **Branch** | Generating alternatives | Separate per branch | "Try a different direction" |

```
Versions (editing):                    Branches (generation):
    
... → 4 → 5 ──→ 6 → 7 → ...           ... → 4 → 5a → 6a → 7a → ...
          ↓                                     ↘ 5b → 6b → 7b → ...  
          5' (editedFrom: 5)                    ↘ 5c → 6c → 7c → ...
          ↓
          5'' (editedFrom: 5')
          
Node 6 follows from ANY version        Each branch has its own Node 6
of Node 5 (via hyperedge)              (6a, 6b, 6c are different nodes)
```

### Visual Distinction in Buffer Mode

For model-authored nodes that have been edited, character-level authorship is computed by diffing original vs edited content:
- Unchanged characters → rendered in model color (e.g., blue)
- Changed/added characters → rendered in human color (default)

This allows users to see exactly what they've modified in model-generated text.

For complete Buffer Mode specification, see [buffer-mode.md](../specs/buffer-mode.md).
