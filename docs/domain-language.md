# Aspen Grove — Domain Language

> This document defines the core terminology and concepts used throughout Aspen Grove. All code, documentation, and discussion should use these terms consistently.

---

## Core Concepts

### Loom

The central data structure and interaction paradigm of Aspen Grove. A **Loom** is a hypergraph-backed tree that represents a branching exploration of conversation or text. Unlike linear chat, a Loom preserves all paths taken and not taken, allowing navigation through possibility space.

The name references the **Loom of Time** — a representation of the universe as a tapestry where choices weave potentials into realities.

A Loom is the atomic unit of LLM interaction in Aspen Grove. Every conversation, every text buffer session, every exploration is a Loom.

---

### Node

A single unit of content within a Loom. A Node contains:

- **Content** — the actual text (human-authored or model-generated)
- **Author** — who created this node (human, or a specific model identifier)
- **Timestamp** — when the node was created
- **Metadata** — additional information (bookmarks, annotations, tags, etc.)

Nodes are immutable once created. Edits create new nodes rather than modifying existing ones.

---

### Edge

A directed connection between two Nodes in the Loom. Edges represent the "then" relationship — "after this node, this other node followed."

Edges carry:

- **Source Node** — where the edge originates
- **Target Node** — where the edge points
- **Edge Type** — the nature of the connection (see Edge Types below)

---

### Edge Types

- **Continuation** — the target node is a direct continuation of the source (the most common type)
- **Branch** — the target node is an alternative continuation from the same source as a sibling
- **Annotation** — the target node is a comment or note attached to the source (not part of the main flow)
- **Link** — a reference connection to another node (possibly in a different Loom)

---

### Path

A linear sequence of Nodes connected by Edges, representing one possible traversal through the Loom. When you "read" a conversation, you're reading a Path.

The **Active Path** is the currently selected traversal — what you see as the "current conversation."

---

### Branch Point

A Node that has multiple outgoing Continuation edges — meaning the conversation forked here. Branch Points are where exploration happened: multiple continuations were generated, or the human chose to try a different direction.

---

### Root

The first Node in a Loom. Every Loom has exactly one Root. The Root may be empty (representing a blank starting point) or may contain initial context/system prompt.

---

### Leaf

A Node with no outgoing Continuation edges. Leaves are the "ends" of explored paths — places where a branch of exploration stopped (for now).

---

### Continuation

A model-generated response to a given Path. When you request a Continuation, the model receives the Active Path as context and generates a new Node.

Multiple Continuations from the same point create sibling Nodes and a Branch Point.

---

### Sibling

Nodes that share the same parent Node (i.e., they are alternative continuations from the same point). Siblings represent the "multiverse" — different possibilities that emerged from the same moment.

---

## Interaction Modes

### Chat Mode

A Loom interaction style where content is organized as discrete messages with clear author attribution. The familiar back-and-forth of conversation, but with branching.

---

### Buffer Mode

A Loom interaction style where there are no message boundaries — just continuous text. The model's completions stream directly into the document. Think "collaborative text editor" rather than "chat."

Inspired by Zed's text threads and base-model interactions.

---

### Loom-Aware

A toggle for model participants that determines whether they have access to Loom navigation tools. A **Loom-Aware** model can:

- See metadata about the tree structure (branch points, sibling counts, etc.)
- Navigate to other branches
- Request summaries of alternative paths
- Perform tree operations via tool calls

A model that is **not** Loom-Aware sees only the Active Path — it experiences the interaction as linear.

This enables the **two-role pattern**: one model as the "subject" (not Loom-Aware, being studied), another as the "collaborator" (Loom-Aware, helping navigate and analyze).

---

## Tree Operations

These are the core operations for manipulating a Loom. They should be available to any agent (human or model) with appropriate permissions.

### Generate Continuation

Create a new Node by requesting a model completion from a given Node. Parameters:

- **From Node** — the node to continue from
- **Model** — which model to use
- **Count** — how many alternative continuations to generate (default: 1)
- **Parameters** — model-specific settings (temperature, etc.)

---

### Fork

Manually create a new branch from an existing Node. Unlike Generate Continuation, Fork creates a human-authored Node as an alternative path.

---

### Navigate

Change the Active Path to traverse through a different branch. This doesn't modify the tree — it changes what you're looking at.

---

### Bookmark

Mark a Node for easy retrieval. Bookmarks persist across sessions and can be labeled.

---

### Annotate

Attach a note to a Node without affecting the conversation flow. Annotations are stored as Annotation-type edges and are excluded from model context by default.

---

### Prune

Mark a branch as "pruned" — not deleted, but hidden from default views. Pruned branches can be restored. This is a soft delete.

---

### Export Path

Serialize a specific Path (or the entire Loom) to an external format (Markdown, JSON, etc.).

---

### Merge

Combine insights from multiple Paths into a new Node. This is a creative/editorial operation — the human (or Loom-Aware model) synthesizes content from different branches.

---

## File System Concepts

### Grove

The top-level container for all user data. A Grove contains Looms, Documents, and organizational structures. One user has one Grove.

(The name completes the metaphor: individual Looms are trees; together they form a Grove.)

---

### Document

A file that is not a Loom — plain notes, markdown files, reference material. Documents can link to Looms and vice versa.

---

### Link

A bidirectional reference between any two items (Nodes, Looms, Documents). Links create the knowledge graph that connects everything.

---

### Tag

A label that can be applied to Nodes, Looms, or Documents for organization and filtering.

---

## Participants

### Human

The user. There is one Human per session (multi-user is out of scope for now).

---

### Model

An LLM participant in a Loom. Models are identified by their specific identifier (e.g., `claude-sonnet-4-20250514`, `gpt-4o`, `llama-3-70b`).

Models have:

- **Identity** — the specific model version
- **Loom-Aware** — whether they have access to tree navigation tools
- **Configuration** — model-specific parameters

Multiple models can participate in a single Loom.

---

### Agent

A generic term for any entity that can perform operations on the Loom — Human or Model. The Loom API treats all Agents uniformly.

---

## Context & Memory

### Context Window

The content sent to a model when requesting a Continuation. By default, this is the Active Path from Root to the current Node.

---

### System Context

Persistent instructions included at the start of every Context Window for a given Loom. Similar to a system prompt.

---

### Excluded Content

Nodes or Annotations marked to be excluded from the Context Window. Useful for human-only notes or meta-commentary that shouldn't influence the model.

---

## Future Concepts (Not MVP)

These terms are defined for conceptual clarity but are not part of the initial implementation:

### Field Guide
Curated content explaining how to think about and work with LLMs — articles, prompting guides, research links, and a personal observation notebook.

### Backroom
A space for multi-model conversations where models talk to each other, optionally observed by the human.

### Ruminate
A mode where the model continues processing asynchronously when the human is away.

### Activation Memory
A memory system based on storing neural activation patterns rather than text summaries (speculative/research).

---

## Naming Conventions

When implementing, use these terms consistently:

| Concept | Variable/Type Name |
|---------|-------------------|
| Loom | `Loom` |
| Node | `Node` |
| Edge | `Edge` |
| Path | `Path` |
| Branch Point | `BranchPoint` |
| Active Path | `activePath` |
| Continuation | `Continuation` |
| Sibling | `sibling` / `siblings` |
| Grove | `Grove` |
| Document | `Document` |
| Agent | `Agent` |
| Human | `Human` |
| Model | `Model` |

---

## Open Questions

- **Node IDs**: UUIDs? ULIDs? Content-addressable hashes?
- **Persistence**: Local SQLite? File-based? What's the storage model?
- **Sync**: Is cross-device sync in scope? If so, how does that affect the data model?
- **Permissions**: Do we need granular permissions for tree operations, or is it all-or-nothing?
- **Model Identity**: How do we handle model versions that change over time? Is `claude-sonnet-4-20250514` today the same as `claude-sonnet-4-20250514` in six months?

---

*This document should evolve as the domain becomes clearer through implementation.*