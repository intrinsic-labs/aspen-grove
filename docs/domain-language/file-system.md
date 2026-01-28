# File System Concepts

> Organizational structures for managing content in Aspen Grove: Grove, Document, Link, Tag.

---

## Grove

The top-level container for all user data. A Grove contains Loom Trees, Documents, and organizational structures. One user has one Grove.

The name completes the metaphor: individual Loom Trees form a Grove.

### Contents

A Grove contains:
- **Loom Trees** — branching explorations and conversations
- **Documents** — standalone notes, reference material, synthesized artifacts
- **Tags** — labels for organization and filtering
- **Links** — connections between items

### Ownership

In MVP, each Grove has a single owner (the human user). The Grove is created automatically on first launch.

---

## Document

A file that is not a Loom Tree — plain notes, markdown files, reference material. Documents can link to Loom Trees and vice versa.

### Characteristics

- **Mutable** — unlike Nodes, Documents can be edited directly
- **Structured** — composed of content blocks (text, headings, images, embeds)
- **Connected** — can link to Nodes, Loom Trees, and other Documents

### Use Cases

- Research notes and observations
- Synthesized findings from explorations
- Reference material and documentation
- Outlines and project planning

### Content Blocks

Documents support rich content through block types:
- Text blocks (markdown-compatible)
- Headings (levels 1-6)
- Code blocks (with language highlighting)
- Callouts (info, warning, tip, note)
- Images and audio
- **Node embeds** — display content from a specific Node
- **Tree embeds** — display a preview of a Loom Tree
- Dividers

> For full block type specification, see [Architecture: Organization](../architecture/model/organization.md).

---

## Link

A bidirectional reference between any two items (Nodes, Loom Trees, Documents). Links create the knowledge graph that connects everything.

### Properties

- **Bidirectional** — querying from either end returns the link
- **Cross-type** — can connect different item types (e.g., Document → Node)
- **Labeled** — optional description of the relationship

### Important Distinction

- **Links** connect items *across* Loom Trees or between Trees and Documents
- **Edges** connect Nodes *within* a single Loom Tree

Links are for cross-references in the knowledge graph. Edges are for the Loom Tree's internal structure.

### Use Cases

- Connect a Document claim to supporting Node evidence
- Link related Loom Trees together
- Reference a specific Node from notes
- Create topical connections across the Grove

---

## Tag

A label that can be applied to Nodes, Loom Trees, or Documents for organization and filtering.

### Characteristics

- **Grove-scoped** — tags are unique within a Grove (case-insensitive)
- **Cross-type** — same tag can apply to Nodes, Trees, and Documents
- **Colored** — optional visual distinction in the UI

### Use Cases

- Categorize by topic (`#research`, `#creative-writing`, `#debugging`)
- Mark status (`#important`, `#draft`, `#archived`)
- Track models (`#claude`, `#gpt-4`, `#local-llama`)
- Create custom taxonomies

### Query Patterns

- "Show all items tagged #research"
- "Filter Loom Trees by #claude AND #comparison"
- "Find Nodes tagged #interesting in this Tree"

---

## Relationships Summary

```
Grove
├── Loom Trees
│   └── Nodes (connected by Edges)
├── Documents
│   └── Content Blocks (including embeds)
├── Tags
│   └── TagAssignments → Nodes, Trees, Documents
└── Links
    └── Connect any items bidirectionally
```

---

## Related Documentation

- [Core Concepts](./core-concepts.md) — Loom Tree, Node, Edge
- [Architecture: Organization](../architecture/model/organization.md) — Technical specification
- [Use Cases: Knowledge Management](../use-cases/knowledge-management.md) — Building a personal knowledge base