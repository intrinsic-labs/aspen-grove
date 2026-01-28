# Buffer Mode — Specification

> This document specifies the structural model and behavior for Buffer Mode, a Loom Tree interaction style where content appears as continuous text rather than discrete messages.

**Status**: Draft  
**Related**: [domain-language.md](../../domain-language.md#buffer-mode), [buffer-mode-questions.md](./buffer-mode-questions.md), [core-entities.md](../model/core-entities.md)

---

## Overview

Buffer Mode is a UI-level abstraction over a Loom Tree that presents branching, multi-author content as a seamless, editable document. The user experience should feel like editing a regular text document while preserving the full power of branching exploration.

**Primary Use Case**: Creative writing with base/pretrained models, where the user writes prose, generates short continuations (e.g., 50 tokens), and iteratively builds a story.

**Key Insight**: Buffer Mode has two fundamentally different operations with different intents and effects:

| Operation | Intent | Effect on Tree |
|-----------|--------|----------------|
| **Edit** | "Fix this paragraph in my current document" | Creates version node, downstream unchanged |
| **Branch** | "Explore alternative continuations from here" | Creates sibling nodes, each potentially with different downstream |

---

## Core Concepts

### The Buffer View

The buffer presents a linear view of a path through the Loom Tree:

```
┌─────────────────────────────────────────────────────┐
│ [Node 1 content][Node 2 content][Node 3 content]... │
│ ← committed nodes →                 [working buffer]│
└─────────────────────────────────────────────────────┘
```

- **Committed nodes**: Persisted nodes in the tree, rendered as continuous text
- **Working buffer**: Uncommitted text at the end of the document (after the last node's final character)
- **Visual distinction**: Model-authored text appears in a distinct color (e.g., blue); human-authored text appears in default color

### Node Boundaries

Each committed node "owns" a character range in the rendered document. Boundaries are computed dynamically based on current content:

```
Document: "Once upon a time, there was a castle on a hill."
          |---- Node 1 ----|---- Node 2 ----|-- Node 3 --|
          chars 0-18        chars 19-35      chars 36-47
```

When a node's content changes (via editing), its boundary shifts, and all downstream boundaries recompute accordingly.

### Authors and Nodes

- Each node has exactly one author (human or model)
- Multiple human-authored nodes in sequence is valid (e.g., user typed, hit generate, then typed more before the response)
- Authorship is visual (color-coded) but structurally simple (one author per node)

### Visual Color Rules

Color indicates authorship at the **character level**, not just the node level:

| Scenario | Color |
|----------|-------|
| Human-authored node | Human color (default) |
| Model-authored node, unchanged | Model color (e.g., blue) |
| Model-authored node, edited portions | Human color |

For model-authored nodes that have been edited, we diff the original content against current content:
- Characters unchanged from original → model color
- Characters added or modified → human color

This means a model response where the user tweaks a few words will show mostly blue with the edits in default color.

---

## The Two Operations

### 1. Editing (Version Creation)

**Intent**: Modify content within the current path without affecting the exploration structure.

**Behavior**:
- User edits text within an existing node's character range
- Creates a **version node** with an `edited_from` relationship to the original
- Downstream nodes remain attached — they follow from "this logical position" not "this specific node"
- The path automatically uses the new version
- Original node preserved as a sibling (accessible but not duplicated downstream)

**Implementation via Hypergraph**:

```
Before edit:
  ... → Node 4 → Node 5 → Node 6 → ... → Node 18

After editing Node 5:
  Node 5' created with:
    - edited_from: Node 5
    - Same parent as Node 5
  
  Node 6's incoming edge becomes a hyperedge:
    - sources: [Node 5, Node 5']  (either version valid)
    - target: Node 6
    - Path context determines which source to use
```

**Key Property**: No duplication of downstream nodes. Editing node 5 in an 18-node path does NOT create copies of nodes 6-18.

### 2. Branching (Sibling Creation)

**Intent**: Explore alternative continuations from a decision point.

**Behavior**:
- User requests N continuations (e.g., taps generate with count=3)
- Creates N **sibling nodes** as children of the current position
- First continuation appears immediately in the buffer (in model color)
- User navigates between siblings via scroll wheel UI
- Selecting a different sibling switches the **entire downstream path**

**Implementation**:

```
Before generation (cursor at end of Node 4):
  ... → Node 4 → [working buffer: "The door creaked open..."]

After generating 3 continuations:
  Working buffer committed as Node 5 (human-authored)
  Three model nodes created as children of Node 5:
  
  ... → Node 4 → Node 5 → Node 6a  (active)
                       ↘ Node 6b
                       ↘ Node 6c
```

**Key Property**: Siblings represent divergent exploration paths. Switching to 6b means potentially different content at positions 7, 8, etc. Navigation between siblings is a UI concern addressed elsewhere.

---

## Working Buffer Lifecycle

The working buffer is the **only** uncommitted state in the document.

### Location
- Always at the end of the document
- Starts after the final character of the last committed node
- Contains text the user has typed but not yet "committed"

### Commit Triggers
The working buffer becomes a new human-authored node when:
1. User hits **Generate** — buffer commits, then model generates continuation(s)
2. User **edits a committed node** — buffer commits first (to preserve it), then edit proceeds

### Not a Commit Trigger
- Simply moving the cursor around
- Navigating between sibling branches (working buffer travels with you? or is discarded? TBD)

---

## Edit Mechanics

### Determining Edit Target

When the user types or deletes:
1. Compute current node boundaries based on rendered content
2. Find which node contains the cursor position
3. If cursor is within a committed node → edit that node (create/update pending edit)
4. If cursor is after all committed nodes → append to working buffer

### Pending Edits

Edits are held in memory before being committed to the tree:

```
PendingEdit = {
  nodeId: string,           // The node being edited
  originalContent: string,  // Content at edit start
  currentContent: string,   // Content after edits
  editedRanges: Range[]     // Which parts changed (optional, for UI highlighting)
}
```

**Commit triggers for pending edits**:
- User hits Generate
- User begins editing a *different* node
- Explicit save/commit action (TBD if needed)

### Boundary Behavior on Delete

When user deletes the final character(s) of a node:
- Node's boundary shrinks
- Cursor is now at the new end of that node (still within it)
- Typing adds to that node's pending edit
- Only when cursor moves *past* the node's (now shorter) range does it enter the next region

### Cross-Boundary Edits

When a selection spans multiple nodes and the user performs an edit:

**For deletion:**
- The delete is split into separate edits for each affected node
- Each node gets a pending edit that removes the selected portion from that node
- Example: Selection spans end of Node 5 and beginning of Node 6
  - Node 5 pending edit: removes selected characters from its end
  - Node 6 pending edit: removes selected characters from its beginning

**For insertion/paste (MVP limitation):**
- Text is inserted at the cursor position (start of selection)
- This affects only the node where the selection starts
- The selected text in other nodes is deleted (per deletion rules above)

**Visual feedback:**
- Subtle node boundary indicators help users understand structure
- Selection highlight may show boundary crossings

---

## Sibling Navigation Behavior

When user navigates to a different sibling (UI mechanism TBD):

### What Changes on Sibling Switch

| Aspect | Behavior |
|--------|----------|
| Current node content | Replaced with sibling's content |
| Downstream nodes | Replaced with sibling's downstream path |
| Upstream nodes | Unchanged (shared ancestry) |
| Working buffer | Auto-committed before switch |
| Pending edits | Committed before switch |

---

## Data Model Additions

### Node Extensions for Buffer Mode

```typescript
interface Node {
  // ... existing fields from core-entities.md
  
  // Buffer Mode specific
  editedFrom?: string;  // NodeId of the node this was edited from (version relationship)
}
```

### Edge Extensions (Hyperedge Support)

```typescript
interface Edge {
  // ... existing fields
  
  // For hyperedge support
  sources: string[];  // Array of NodeIds (multiple sources for version-aware edges)
  
  // Path resolution
  preferredSource?: string;  // Which source to use by default (optional)
}
```

### Path Extensions

```typescript
interface PathContext {
  nodeSequence: string[];      // Ordered NodeIds in this path (specific versions)
  versionSelections: {         // Which version to use at positions with multiple
    [position: string]: string;  // position identifier → selected NodeId
  };
}
```

---

## Path Resolution Logic

### How the Path Knows Which Version to Use

When a node has multiple versions (original + edits), the path must resolve which one to display and use for context.

**Core Rule**: The path explicitly tracks which version is active at each position.

```
Path stores: [node1, node2, node5', node6, node7, ...]
                            ↑
                    Using edited version 5', not original 5
```

### Version Resolution Behavior

| Action | Path Update |
|--------|-------------|
| User edits node 5 → creates 5' | Path switches from 5 to 5' automatically |
| User edits 5' → creates 5'' | Path switches from 5' to 5'' automatically |
| User navigates to sibling (iPod wheel) at position 5 | Path switches to selected version |
| User navigates to different *branch* (not just version) | Entire downstream path may change |

### Distinguishing Versions vs Branches

- **Versions**: Same logical position, different content due to editing. Created via `edited_from` relationship. Downstream nodes are *shared* — no duplication.
  
- **Branches**: Different continuations from a branch point. Created via generation. Downstream nodes are *separate* — each branch has its own continuation.

```
Versions (editing):                    Branches (generation):
    
... → 4 → 5 ──→ 6 → 7 → ...           ... → 4 → 5a → 6a → 7a → ...
          ↓                                     ↘ 5b → 6b → 7b → ...  
          5' (edited_from: 5)                   ↘ 5c → 6c → 7c → ...
          ↓
          5'' (edited_from: 5')
          
Node 6 follows from ANY version       Each branch has its own node 6
of node 5 (5, 5', or 5'')             (6a, 6b, 6c are different nodes)
```

### Rendering the Active Path

1. Start from root
2. At each position, use the version specified in `versionSelections` (or default to latest edit if not specified)
3. At branch points, follow the branch specified in `nodeSequence`
4. Concatenate content from resolved nodes
5. Append working buffer

---

## Context Assembly for Generation

When requesting a continuation in Buffer Mode:

1. **Compute the active path**: Walk from root through selected versions/siblings to current position
2. **Concatenate content**: Join all node contents into a single string (the "document")
3. **Append working buffer**: Include uncommitted user text
4. **Send as completion request**: No system prompt by default (user can configure), just the document text
5. **Cursor position**: Continuation appends at end (mid-document continuation is post-MVP)

### Example Request

```typescript
{
  prompt: "Once upon a time, there was a castle on a hill. The door creaked open and",
  max_tokens: 50,
  n: 3,  // Generate 3 alternatives
  // ... other model params from Agent config
}
```

---

## Provenance in Buffer Mode

### Per-Generation Storage
- Each model generation stores its `RawApiResponse` immediately
- Response linked to the created node(s)

### Version Nodes
- Edited nodes (versions) have their own content hash
- `edited_from` field provides lineage
- Original node's provenance unchanged

### Hash Computation
- Computed on commit (when node is persisted)
- Hash covers final content only (not edit history)
- Edit history preserved via `edited_from` chain

---

## Open Questions (Remaining)

### Q1: Working Buffer on Branch Switch — RESOLVED
If user has uncommitted text in working buffer and switches to a sibling branch:
- **Decision**: Auto-commit before switch
- **Rationale**: Users shouldn't lose work. They can delete the node later if unwanted.

### Q2: Mid-Document Continuation — RESOLVED
Can user place cursor mid-document and generate a continuation there?
- **Decision**: Not for MVP
- **Rationale**: Requires complex node splitting semantics

### Q3: Undo/Redo — RESOLVED
How does undo interact with the version system?
- **Decision**: Standard text undo for MVP (within pending edits, before commit)
- **Rationale**: Tree-level undo is complex; standard undo covers most cases

### Q4: Merging Branches — RESOLVED
Can user pull content from one sibling into another?
- **Decision**: Copy-paste only for MVP
- **Rationale**: Structural merge is complex; copy-paste covers the use case adequately

---

## Summary

Buffer Mode achieves "document-like editing with branching exploration" through:

1. **Hypergraph structure**: Edges can have multiple sources, enabling version nodes without downstream duplication
2. **Two distinct operations**: Editing (creates versions, preserves downstream) vs. Branching (creates siblings, divergent downstream)
3. **Working buffer**: Single point of uncommitted state, always at document end
4. **Visual continuity**: Nodes rendered seamlessly, author distinguished by color at the character level
5. **Path resolution**: Explicit tracking of which version is active at each position

The model preserves the full Loom Tree semantics (immutable nodes, provenance, branching) while presenting a familiar document editing experience.

---

## Changelog

- **v0.1** (Initial): Core spec based on design discussion — editing vs branching distinction, hypergraph support for versions, working buffer model