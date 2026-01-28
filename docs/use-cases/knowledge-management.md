# Knowledge Management Use Cases

> Organizing, connecting, and preserving what emerges from exploration and creation.

---

## 3.1 Building a Personal Knowledge Base

**Goal**: Accumulate insights, notes, and artifacts in an organized structure.

**Flow**:
1. User creates Documents for standalone notes and reference material
2. User creates Looms for model interactions
3. User Links related items (Document ↔ Loom, Node ↔ Document, etc.)
4. User applies Tags for cross-cutting organization
5. Over time, the Grove becomes a connected knowledge graph
6. User searches and navigates via Links and Tags

**Value**: Nothing is lost. Every interaction, every insight has a place and can be found again.

**Agents Involved**: Human (Loom-Aware)

---

## 3.2 Linking Insights to Evidence

**Goal**: Connect conclusions to the explorations that produced them.

**Flow**:
1. User explores a topic across multiple Loom Trees
2. User synthesizes findings in a Document
3. User Links specific claims in the Document to specific Nodes that support them
4. Reader (including future self) can follow Links to see the primary evidence
5. If the Loom has provenance data, claims can be verified against raw model output

**Value**: Research integrity. Conclusions are traceable to sources.

**Agents Involved**: Human (Loom-Aware)

---

## 3.3 Exporting and Sharing

**Goal**: Share findings with others outside Aspen Grove.

**Flow**:
1. User selects a Path, Loom, or Document to export
2. User chooses export format (Markdown, JSON, PDF)
3. System serializes content with appropriate structure
4. For Looms, user chooses whether to export:
   - Single Path (linear conversation)
   - Full tree (all branches)
   - Selected branches
5. User shares the exported file

**Value**: Knowledge doesn't stay locked in the app. Users can publish, collaborate externally, or archive.

**Extends With** (Future): Direct publishing to web, collaborative sharing with other Aspen Grove users

---

## 3.4 Learning via Field Guide

**Goal**: Understand how to use Aspen Grove and think about LLMs effectively.

**Flow**:
1. New user opens the Field Guide
2. User reads conceptual articles explaining Looms, latent space, multiverse thinking
3. User follows prompting guides to improve their interaction patterns
4. User references tool documentation when learning new features
5. User explores external resources for deeper learning
6. As user gains experience, they contribute observations to their own notes (linked to Field Guide concepts)

**Value**: The tool teaches its own philosophy. Users don't just learn buttons — they learn a way of thinking.

**Agents Involved**: Human

**Extends With** (Future): Personal observation notebook integrated with Field Guide, researcher interviews, community guides

---

## Related Documentation

- [Domain Language: File System](../domain-language/file-system.md) — Grove, Document, Link, Tag
- [Domain Language: Field Guide](../domain-language/field-guide.md) — Field Guide feature
- [Exploration & Study](./exploration-study.md) — Source material for knowledge
- [Creation & Collaboration](./creation-collaboration.md) — Creating artifacts to preserve