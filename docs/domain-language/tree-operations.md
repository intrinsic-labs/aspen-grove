# Tree Operations

> Core operations for manipulating a Loom Tree. Available to any Agent with appropriate permissions.

---

## Overview

Tree operations are the fundamental actions for working with Loom Trees. The API is agent-agnostic — both humans and models can perform these operations.

---

## Generate Continuation

Create a new Node by requesting a continuation from a given point.

**Parameters:**
- **From Node** — the node to continue from (ID)
- **Agent** — which agent generates the continuation (ID)
- **Count** — how many alternative continuations to generate (default: 1)

**Behavior:**
1. Computes the Path from Root to the specified Node
2. Retrieves the Agent's configuration and backend Model
3. Sends the Path (as context) to the Model
4. Creates new Node(s) with Continuation edges from the source

**Result:** One or more new Nodes as children of the source Node. Multiple continuations create siblings and a Branch Point.

---

## Fork

Manually create a new branch from an existing Node. Unlike Generate Continuation, Fork creates a human-authored (or manually specified) Node as an alternative path.

**Use Cases:**
- "What if I had said this instead?"
- Creating a variant prompt to compare results
- Manually inserting content at a specific point

**Result:** A new Node as a sibling of the existing children (or as the first child if none exist).

---

## Navigate

Change the Active Path to traverse through a different branch. This doesn't modify the tree — it changes what the user is looking at.

**Variations:**
- Navigate to a specific Node (by ID)
- Navigate to a sibling (next/previous)
- Navigate to parent (go back one level)
- Navigate to a Leaf (follow a branch to its end)

**Result:** The UI updates to show the new Active Path.

---

## Bookmark

Mark a Node for easy retrieval. Bookmarks persist across sessions and can be labeled.

**Parameters:**
- **Node** — the node to bookmark (ID)
- **Label** — optional descriptive text

**Use Cases:**
- Mark important decision points
- Save interesting model responses
- Create navigation shortcuts in large trees

**Result:** The Node's `bookmarked` metadata is set to true, with optional label stored.

---

## Annotate

Attach a note to a Node without affecting the conversation flow. Creates an Annotation-type edge.

**Parameters:**
- **Target Node** — the node to annotate (ID)
- **Content** — the annotation text
- **Author Agent** — who is creating the annotation (ID)

**Behavior:**
- Annotations are excluded from model context by default
- Multiple annotations can exist on a single Node
- Annotations are Nodes themselves, connected via Annotation edges

**Use Cases:**
- Document observations about model behavior
- Leave notes for future self
- Tag content for later analysis

---

## Prune

Mark a branch as "pruned" — not deleted, but hidden from default views.

**Parameters:**
- **Node** — the node to prune (ID)
- **Cascade** — whether to also mark all descendants as pruned (default: true)

**Behavior:**
- Sets the Node's `pruned` metadata to true
- Pruned branches can be restored
- This is a soft delete — content is preserved

**Use Cases:**
- Hide dead-end explorations
- Clean up the tree view without losing history
- Mark failed approaches

---

## Export Path

Serialize a specific Path (or the entire Loom Tree) to an external format.

**Parameters:**
- **Target** — a specific Node (exports path from Root to Node) or entire tree
- **Format** — Markdown, JSON, PDF, etc.
- **Options** — include annotations, include metadata, etc.

**Result:** A file or data structure suitable for sharing or archiving outside Aspen Grove.

---

## Merge

Combine insights from multiple Paths into a new Node. This is a creative/editorial operation — the agent synthesizes content from different branches.

**Parameters:**
- **Source Paths** — two or more paths to merge from
- **Target Node** — where to attach the merged result
- **Author Agent** — who is performing the merge

**Behavior:**
- Creates a new Node with content synthesized from the sources
- The new Node can reference its sources via Links
- This is a human-driven operation (or Loom-Aware model operation)

**Use Cases:**
- Combine the best parts of different model responses
- Create a synthesis document from exploration
- Resolve branches into a single canonical path

---

## Operation Summary

| Operation | Modifies Tree | Creates Nodes | Typical Agent |
|-----------|---------------|---------------|---------------|
| Generate Continuation | Yes | Yes | Model (via Human request) |
| Fork | Yes | Yes | Human |
| Navigate | No | No | Human |
| Bookmark | Yes (metadata) | No | Human |
| Annotate | Yes | Yes | Human |
| Prune | Yes (metadata) | No | Human |
| Export Path | No | No | Human |
| Merge | Yes | Yes | Human |

---

## Related Documentation

- [Core Concepts](./core-concepts.md) — Node, Edge, Path, Branch Point
- [Agents](./agents.md) — Agent abstraction
- [Context & Memory](./context-memory.md) — How context is assembled for generation
- [Architecture: Core Entities](../architecture/model/core-entities.md) — Technical specification