# Core Concepts

> Fundamental structures and terminology for the Loom Tree hypergraph.

---

## Loom Tree

The central data structure of Aspen Grove. A **Loom Tree** is a hypergraph-backed tree that represents a branching exploration of dialogue or text. Unlike linear chat, a Loom Tree preserves all paths taken and not taken, allowing navigation through possibility space.

The name references the **Loom of Time** — a representation of the universe as a tapestry where choices weave potentials into realities.

A Loom Tree is the atomic unit of LLM interaction in Aspen Grove. Every conversation, every text buffer session, every exploration is a Loom Tree.

### Related Terminology

- **Loom Tree** — the hypergraph data structure (the thing)
- **Looming** or **Weaving** — the act of exploring and creating within a Loom Tree (the activity)
- **Loom** — a category of LLM interface that enables branching, tree-based interaction (the tool type). Aspen Grove is a Loom.

---

## Node

A single unit of content within a Loom Tree. Nodes are the vertices of the hypergraph.

Nodes are **immutable** once created. Edits create new nodes rather than modifying existing ones. Each node carries a content hash for tamper-evidence as part of the [provenance system](../provenance-overview.md).

When a node is created by editing another node, the `editedFrom` field tracks this lineage. This applies to both Dialogue and Buffer modes — the difference is in tree behavior:
- **Dialogue Mode**: Edit creates a branch (sibling node with separate downstream), conversation continues from edit point
- **Buffer Mode**: Edit creates a version node with hyperedge support, preserving downstream without duplication

Nodes are **multimodal by design** — they can contain text, images, audio, or combinations thereof.

> For full property list and technical constraints, see [Architecture: Core Entities](../architecture/model/core-entities.md).

---

## Edge

A directed hyperedge connecting one or more source Nodes to a target Node. Edges represent relationships between nodes in the Loom Tree.

In a hypergraph, edges can connect **multiple sources** to a target. This is important for representing complex generation relationships (e.g., an image + text prompt together producing a new node).

There are two edge types:
- **Continuation** — the target node continues from the source(s); the primary edge type for traversal
- **Annotation** — a comment or note attached to a node (excluded from model context by default)

> **Note on Branches**: "Branch" is not an edge type. A branch is simply the situation where multiple continuation edges originate from the same node.

> For full property list including source roles, see [Architecture: Core Entities](../architecture/model/core-entities.md).

---

## Path

A linear sequence of Nodes connected by Continuation edges, representing one possible traversal through the Loom Tree. When you "read" a conversation, you're reading a Path.

The **Active Path** is the currently selected traversal — what the user sees as the "current conversation."

Paths are computed, not stored. They are derived by traversing edges from a given node back to the Root.

---

## Branch Point

A Node that has multiple outgoing Continuation edges — meaning the exploration forked here. Branch Points are where multiple continuations were generated, or the human chose to try a different direction.

---

## Root

The first Node in a Loom Tree. Every Loom Tree has exactly one Root. The Root may be empty (representing a blank starting point) or may contain initial context/system instructions.

---

## Leaf

A Node with no outgoing Continuation edges. Leaves are the "ends" of explored paths — places where a branch of exploration stopped (for now).

---

## Continuation

A generated response to a given Path. When you request a Continuation, the generating agent receives the Active Path as context and produces a new Node.

Multiple Continuations from the same point create sibling Nodes and a Branch Point.

---

## Sibling

Nodes that share the same parent Node (i.e., they are alternative continuations from the same point). Siblings represent the "multiverse" — different possibilities that emerged from the same moment.

---

## Related Documentation

- [Interaction Modes](./interaction-modes.md) — Dialogue Mode, Buffer Mode, Voice Mode
- [Tree Operations](./tree-operations.md) — Generate Continuation, Fork, Navigate, etc.
- [Architecture: Core Entities](../architecture/model/core-entities.md) — Technical specification