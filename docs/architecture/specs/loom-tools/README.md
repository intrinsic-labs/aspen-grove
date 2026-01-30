# Loom-Aware Tools Specification

> How model agents interact with Loom Trees: tool definitions, execution model, ambient context, and memory management.

**Status**: Approved
**Related**: [Context Assembly](../context-assembly.md), [Buffer Mode](../buffer-mode.md), [Agents](../../model/agents.md), [Core Entities](../../model/core-entities.md)

---

## Overview

This specification is organized into three documents:

| Document | Contents |
|----------|----------|
| **README.md** (this file) | Vision, design goals, prerequisites, ambient context, tool syntax |
| [tool-reference.md](./tool-reference.md) | Complete tool definitions with syntax, parameters, and examples |
| [context-and-execution.md](./context-and-execution.md) | Context assembly, permissions, error handling, execution model |

---

## Vision

The loom-aware system enables language models to operate as true collaborators within the loom workspace, with the same agency and capabilities as human users. Rather than being passive responders to prompts, a loom-aware model can navigate the tree structure, inspect branches, create annotations, generate continuations, and manage its own working memory—all through a natural, low-friction interface.

The core principle: **humans and models get access to the same operations.** Humans interact through a graphical interface optimized for touch and vision. Models interact through a minimal command syntax optimized for token efficiency and natural expression. Both are calling the same underlying operations on the same shared workspace.

This is not about making the model an assistant that proposes actions for human approval. It's about genuine collaborative agency, where human and model can work in parallel on different branches, leave annotations for each other, and build on each other's contributions.

---

## Design Goals

**Give models spatial/structural awareness.** Conversations aren't linear, but models typically experience them that way. Loom awareness means understanding that you're at a particular location in a tree, that other branches exist, that you can move around and explore. The tree becomes a navigable space, not just a scrolling history.

**Support genuine collaboration.** In the two-role pattern (subject + collaborator), each participant contributes different capabilities. The subject model generates content. The collaborator model offers reflection, meta-awareness, navigation, and can invoke the subject to create branches and timelines. The loom is the shared workspace where this collaboration unfolds.

**Enable careful observation.** The tree structure creates a record of collaborative cognition—where we branched, what alternatives we explored, how ideas evolved. This supports the broader goal of helping humans understand how models behave and think.

**Reduce the prosthetic feeling of tool use.** Current tool-calling patterns feel clunky—structured JSON, explicit function signatures, stop-start execution. The loom-aware system aims for something closer to peripheral awareness and natural action. Tools should feel like reaching for something, not filing a formal request.

**Manage context efficiently.** The first portion of context tends to be where models perform best. The system should maximize signal by keeping tool calls minimal, summarizing aggressively, and giving models explicit control over what stays in working memory versus what gets stashed or dropped.

---

## Prerequisites

This specification depends on additions to the core data model:

### Node.localId

A tree-unique short identifier for efficient in-context reference. See [Core Entities](../../model/core-entities.md#local-id-generation) for the full specification.

- 6-character prefix of the ULID, extended on collision
- Computed at creation time, stored and indexed
- Used in ambient context and tool calls instead of full ULIDs

### Summary Fields

One-to-two sentence summaries for efficient context scanning:

- `Node.summary` — Generated async after creation with parent context
- `Document.summary` — Regenerated on document close
- `LoomTree.summary` — Regenerated periodically (every N nodes or on close)

See [Summary Generation](./context-and-execution.md#summary-generation) for the generation strategy.

---

## Ambient Context

Loom-aware agents receive context at two levels: **per-node metadata** (attached to each node in the exchange, mirroring the UI) and **system-level context** (tree-wide orientation, included once per turn).

### Per-Node Metadata

Every node in the conversation context includes inline metadata, just as the user sees node information in the UI. This allows the model to reference any node by its localId.

**Format:**
```
[a7x2] human · 3m ago
2 continuations · 1 annotation · bookmarked
---
The way I see it, Marie's reluctance stems from her childhood—specifically 
the summer her father left...

[b3k9] model · 2m ago
1 continuation
---
Building on that insight, we could explore how Thomas represents...
```

**Metadata shown per node:**
- **localId** — Short identifier in brackets
- **authorType** — `human` or `model`
- **relative timestamp** — How long ago created
- **continuations** — Count of child nodes (if any)
- **annotations** — Count of annotations (if any)
- **bookmarked** — Flag if bookmarked
- **links** — Count of links (if any)

This mirrors what users see in the UI for every node. The model can reference any visible localId in tool calls.

### System-Level Context

Tree-wide orientation provided once per turn, clearly delimited. Placed at the end of context, just before the model generates (recency bias keeps it fresh for decision-making).

**Format:**
```
=== Loom Context ===
Tree: "Marie Character Study" (dialogue mode)
47 nodes · 6 branches · depth: 12
Position: ... → [a7x2] → [b3k9]*
Permissions: loom_aware, loom_write, doc_read
Human active at [c4m2], depth:8
===
```

**System-level metadata:**
- **Tree title and mode** — dialogue or buffer
- **Tree stats** — Total nodes, branch count
- **Current depth** — Distance from root
- **Position trace** — Path to current node (abbreviated for long paths)
- **Permissions** — What this agent can do
- **Other agents** — Where other agents are active (by node localId)

### Mode-Specific Considerations

The metadata format is the same for both dialogue and buffer mode. The `mode` indicator in system-level context tells the model how content is rendered, but per-node metadata remains consistent.

In buffer mode, nodes may have additional context like word count, but the core metadata (localId, author, timestamps, connections) is unchanged.

---

## Tool Syntax

Tool calls use a minimal natural language syntax. Each tool call goes on its own line, prefixed with an arrow character:

```
→ view a7x2
→ annotate a7x2 "this is where the tone shifts"
→ continue from b3k9 n:3
```

The arrow (→) is the delimiter that signals "this line is an action." Everything after it is parsed as a command.

### Natural Language Flexibility

The syntax is deliberately loose and forgiving. These are equivalent:

```
→ view a7x2
→ view node a7x2
→ show a7x2
→ show me node a7x2
```

A lightweight classifier maps natural variations to canonical operations. The model doesn't have to remember exact syntax—it just has to be clear about intent.

### Batching

Multiple tool calls on consecutive lines are batched and executed together:

```
→ view a7x2
→ view b3k9
→ list a7x2 annotations
```

Results are returned together before the model continues generating.

### Tool Calls Are Not Persisted

Tool call lines are parsed and executed, not stored in conversation context. They appear in the action trace (a compressed log of operations) but don't consume context window space after execution.

---

## Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Navigation** | view, list, tree, switch | Explore and understand tree structure |
| **Content** | continue, respond, annotate, link, edit, bookmark, prune | Create nodes, annotations, links; manage branches |
| **Document** | read, write | Access and modify linked documents |
| **Memory** | pin, stash, recall, drop, memory | Manage working context |
| **Meta** | help, think, search | Self-help, private reasoning, web search |

See [tool-reference.md](./tool-reference.md) for complete definitions.

---

## Quick Reference

### Navigation
```
→ view [localId]                    # See node summary
→ view [localId] full               # See full content
→ list [localId] continuations      # See children
→ tree                              # See tree structure
→ switch to [localId]               # Move position
```

### Content
```
→ continue from [localId] n:3       # Generate continuations (subject model)
→ continue using agent:"GPT-4o"     # Generate with specific agent
→ respond [localId] "content"       # Add own content
→ annotate [localId] "note"         # Add annotation
→ link [localId] to doc:"name"      # Create link
→ bookmark [localId] "label"        # Mark for easy retrieval
→ prune [localId]                   # Hide branch (soft delete)
→ restore [localId]                 # Restore pruned branch
```

### Memory
```
→ pin [localId]                     # Keep in working memory
→ stash "label" content-of:[id]     # Save for later
→ recall "label"                    # Retrieve stashed
→ memory                            # Review memory state
```

### Meta
```
→ help                              # See available tools
→ help [tool]                       # Tool details
→ think                             # Start private scratchpad
←                                   # End scratchpad
→ search "query"                    # Search the web
→ search "query" depth:deep         # Deep search with content extraction
```

---

## Next Steps

- [tool-reference.md](./tool-reference.md) — Complete tool definitions
- [context-and-execution.md](./context-and-execution.md) — Context assembly, permissions, execution model