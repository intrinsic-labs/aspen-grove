# File System Concepts

> Organizational structures for managing content in Aspen Grove: Grove and Tag.

---

## Grove

The top-level container for all user data. A Grove contains Loom Trees and the Tags that organize them. One user has one Grove.

The name completes the metaphor: individual Loom Trees form a Grove.

### Contents

A Grove contains:
- **Loom Trees** — branching explorations and conversations
- **Tags** — labels for organization and filtering

### Ownership

Each Grove has a single owner (the human user). The Grove is created automatically on first launch.

---

## Tag

A label that can be applied to Loom Trees or Nodes for organization and filtering.

### Characteristics

- **Grove-scoped** — tag names are unique within a Grove
- **Cross-type** — the same tag can apply to Loom Trees and Nodes
- **Colored** — optional visual distinction in the UI

### Use Cases

- Categorize by topic (`#research`, `#creative-writing`)
- Mark status (`#important`, `#draft`)
- Track models (`#claude`, `#gpt-4`, `#local-llama`)

### Query Patterns

- "Show all trees tagged #research" (the tree list filter chips)
- "Find Nodes tagged #interesting in this Tree"

---

## Relationships Summary

```
Grove
├── Loom Trees
│   └── Nodes (connected by Edges)
└── Tags
    └── TagAssignments → Nodes, Loom Trees
```

Edges connect Nodes *within* a single Loom Tree. There are no cross-tree links.

---

## Related Documentation

- [Core Concepts](./core-concepts.md) — Loom Tree, Node, Edge
- [Architecture: Organization](../architecture/model/organization.md) — Technical specification
