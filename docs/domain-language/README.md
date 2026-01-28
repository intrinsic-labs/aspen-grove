# Aspen Grove — Domain Language

> This directory defines the core terminology and concepts used throughout Aspen Grove. All code, documentation, and discussion should use these terms consistently.

---

## Contents

| Document | Description |
|----------|-------------|
| [Core Concepts](./core-concepts.md) | Loom Tree, Node, Edge, Path, Branch Point, and other fundamental structures |
| [Interaction Modes](./interaction-modes.md) | Dialogue Mode, Buffer Mode, Voice Mode, and Loom-Aware settings |
| [Agents](./agents.md) | Agent abstraction for humans and models |
| [Tree Operations](./tree-operations.md) | Generate Continuation, Fork, Navigate, Bookmark, and other tree manipulations |
| [File System](./file-system.md) | Grove, Document, Link, Tag organizational structures |
| [Context & Memory](./context-memory.md) | Context Window, System Context, Raw API Response, Excluded Content |
| [Conventions](./conventions.md) | Technical decisions, naming conventions, and open questions |
| [Field Guide & Future](./field-guide.md) | Field Guide feature and future concepts |

---

## Quick Reference

### Core Terminology

- **Loom Tree** — the hypergraph data structure (the thing)
- **Looming** or **Weaving** — the act of exploring and creating within a Loom Tree (the activity)
- **Loom** — a category of LLM interface that enables branching, tree-based interaction (the tool type). Aspen Grove is a Loom.

### Key Principles

1. **Both humans and models are Agents** — the tree treats all participants uniformly
2. **Nodes are immutable** — edits create new nodes, preserving history
3. **Everything is connected** — Links, Tags, and the knowledge graph tie it together
4. **Provenance matters** — every model output has traceable evidence

---

## Related Documentation

- [Architecture Overview](../architecture/README.md) — Technical specifications
- [Use Cases](../use-cases/README.md) — How users interact with Aspen Grove
- [Provenance Overview](../provenance-overview.md) — Verification and authenticity

---

*This document should evolve as the domain becomes clearer through implementation.*