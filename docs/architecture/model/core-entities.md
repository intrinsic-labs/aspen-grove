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
- **summary** — optional string, auto-generated 1-2 sentence summary (see [Summary Generation](#summary-generation))
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
- **localId** — string (6-8 chars), tree-unique short identifier for loom-aware context (see [Local ID Generation](#local-id-generation))
- **loomTreeId** — ULID, reference to parent LoomTree
- **content** — Content object (see Content Types below)
- **summary** — optional string, auto-generated 1-2 sentence summary (see [Summary Generation](#summary-generation))
- **authorAgentId** — ULID, reference to the Agent that created this node
- **authorType** — enum: `human` | `model`, denormalized from Agent.type for efficient hash verification
- **contentHash** — string, computed hash for tamper evidence
- **createdAt** — timestamp
- **metadata** — NodeMetadata object
- **editedFrom** — optional ULID, reference to the Node this was edited from (set in both Dialogue and Buffer modes when a node is created by editing another; see [Edit Lineage](#edit-lineage))

### NodeMetadata Properties

- **bookmarked** — boolean, default false
- **bookmarkLabel** — optional string
- **pruned** — boolean, default false (soft delete for branches)
- **excluded** — boolean, default false (excluded from context window)

*Note: Tags are managed via TagAssignment, not stored on the Node. See [Organization](./organization.md#tagassignment) for the tagging system.*

### Constraints

- Nodes are **immutable** once created — edits create new Nodes
- `localId` is computed at creation and never changes
- `localId` must be unique within the LoomTree (extend on collision)
- authorType is set at creation from the authoring Agent's type and never changes
- contentHash computation differs by authorType (see [Provenance](./provenance.md#hash-chain-computation))
- A Node with no incoming Continuation edges is the root (exactly one per LoomTree)
- If `editedFrom` is set, this Node was created by editing the referenced Node (see [Edit Lineage](#edit-lineage))

### Indexes

- Primary: id
- By loomTreeId + localId (unique, for loom-aware tool lookups)
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

*Note: Cross-references between Loom Trees, Documents, and Nodes use the [Link entity](./organization.md#link), not Edges. See also [Link Repository](../contracts/repositories/link-repository.md) for persistence operations.*

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

## Edit Lineage

The `editedFrom` field tracks lineage when a node is created by editing another node. This applies to **both Dialogue and Buffer modes**, though the tree behavior differs.

### Why Track Edit Lineage?

Since nodes are immutable, "editing" always creates a new node. Without `editedFrom`, you'd have a sibling node with similar content but no indication of the relationship. Tracking lineage:

- Preserves the provenance of content changes
- Enables UI features like "show edit history" or "diff with original"
- Supports the hyperedge optimization in Buffer Mode

### Edit Behavior by Mode

| Mode | Edit Behavior | Tree Result | `editedFrom` |
|------|---------------|-------------|--------------|
| **Dialogue** | Edit creates branch, conversation continues from edit point | Sibling node (traditional branch, separate downstream) | ✓ Set |
| **Buffer** | Edit in place, downstream preserved | Version node (hyperedge keeps downstream attached) | ✓ Set |

**Dialogue Mode**: Editing a message is like saying "what if I had said this instead?" — it creates a branch point and the conversation continues down the new path. This matches user expectations in chat-like interfaces.

**Buffer Mode**: Editing is like editing a document — you fix a typo or revise a paragraph, but the rest of the document stays intact. This requires hyperedge support (see below).

---

## Buffer Mode: Version Nodes and Hyperedges

Buffer Mode uses **version nodes** and **hyperedges** to enable edits without duplicating downstream content.

### The Problem

In a traditional tree, editing node 5 in an 18-node path would require duplicating nodes 6-18 to create a new branch. This is wasteful when the user just wants to fix a typo.

### The Solution

Version nodes use hyperedge support to enable edits without downstream duplication:

1. **Version relationship**: `editedFrom` links the edited node to its original
2. **Hyperedge sources**: Downstream edges accept any version as a valid source
3. **Path resolution**: The active path specifies which version to use at each position

### Version vs Branch (Buffer Mode)

| Concept | Created by | Downstream behavior | Use case |
|---------|------------|---------------------|----------|
| **Version** | Editing existing content | Shared (no duplication) | "Fix this typo" |
| **Branch** | Generating alternatives | Separate per branch | "Try a different direction" |

```
Versions (editing in Buffer):          Branches (generation):
    
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

---

## Local ID Generation

The `localId` field provides a short, human-friendly identifier for use in loom-aware model interactions. Full ULIDs are 26 characters, which wastes context space and is error-prone for models to work with.

### Algorithm

1. Take the first 6 characters of the Node's ULID
2. Check for collision within the same LoomTree
3. If collision exists, extend by 1 character and repeat
4. Maximum length: 8 characters (collision after 8 chars is astronomically unlikely within a single tree)

### Example

```
ULID: 01HQ3K4N7Y8M2P5R6T9W0X1Z2A
localId: 01HQ3K (6 chars, no collision)

ULID: 01HQ3K9B2C4D5E6F7G8H9J0K1L
localId: 01HQ3K9 (7 chars, collision with above at 6)
```

### Design Rationale

- **Why not sequential?** Sequential IDs don't encode any structural information and require maintaining a counter. ULID prefixes are naturally unique.
- **Why not full ULID?** 26 characters is wasteful in model context and hard for models to reference accurately.
- **Why 6 characters default?** 6 hex characters = 16^6 = 16.7 million possible values. Collision within a single tree (typically < 10,000 nodes) is extremely rare.

---

## Summary Generation

Summaries provide condensed representations of content for efficient context management in loom-aware interactions.

### Node Summaries

Generated asynchronously after node creation.

**Context required:**
- Parent node content (required for meaningful summary)
- Grandparent content if node is short (< 50 tokens)
- Tree title for framing

**Model selection:**
- Default: Claude 3.5 Haiku or GPT-4o-mini (based on API key availability, with fallback)
- User can override with any configured model
- Max tokens: 50

**Prompt template:**
```
Given this conversation context:
---
Tree: {tree.title}
Previous: {parent.summary or parent.content}
---

Summarize the following message in ONE sentence (max 30 words).
Capture the key point, action, or decision. Be specific, not generic.

Message: {node.content}
```

**Lazy fallback:** If `summary` is null when accessed (migration, failed generation), generate on demand.

### LoomTree Summaries

Generated periodically to capture tree purpose and themes.

**Trigger points:**
- Every 10 new nodes (configurable)
- On tree close
- Manual user trigger

**Context:**
- Node summaries from primary path
- Branch point node summaries
- User-edited `description` field

**Prompt template:**
```
This is a branching conversation tree. The user describes it as:
"{tree.description}"

Key node summaries from the main path:
{node_summaries}

Branch points explored: {branch_count}

Summarize this tree's purpose and main themes in 2 sentences.
```

### Document Summaries

Documents also support summaries, generated on document close after editing. See [Organization](./organization.md#document) for Document entity specification.
