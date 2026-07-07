# Aspen Grove — Agent Development Guide

*Written by the majestic opus 4.5 and the meticulous rocketbro*

> A comprehensive summary of Aspen Grove's architecture, domain concepts, and specifications. Use this document to answer development questions or as a map to find detailed specifications.

**Last Updated**: Based on pre-development documentation review  

---

## Table of Contents

1. [What is Aspen Grove?](#what-is-aspen-grove)
2. [Core Domain Concepts](#core-domain-concepts)
3. [Agents & Models](#agents--models)
4. [Interaction Modes](#interaction-modes)
5. [Tree Operations](#tree-operations)
6. [Organization & Knowledge Management](#organization--knowledge-management)
7. [Provenance System](#provenance-system)
8. [Architecture Overview](#architecture-overview)
9. [Data Model Summary](#data-model-summary)
10. [Context Assembly](#context-assembly)
11. [Loom-Aware Tools](#loom-aware-tools)
12. [Key Technical Decisions](#key-technical-decisions)
13. [Document Map](#document-map)

---

## What is Aspen Grove?

Aspen Grove is a **Loom** — an LLM interface that treats conversations as explorable trees rather than linear chats. Users can branch, backtrack, compare alternatives, and build understanding through exploration.

### Key Principles

1. **Models are probability spaces, not oracles** — The same prompt can yield wildly different responses
2. **Exploration beats optimization** — Sometimes the third branch is where the insight lives
3. **Provenance matters** — Hash chains, timestamps, and raw API responses provide verification
4. **Both humans and models are Agents** — Uniform treatment at the API level
5. **Nodes are immutable** — Edits create new nodes, preserving history

### Tech Stack

- **React Native** — Cross-platform mobile
- **TypeScript** — Type safety throughout
- **WatermelonDB** — Local-first persistence with lazy loading
- **Clean Architecture** — Domain → Application → Infrastructure → Interface

---

## Core Domain Concepts

### Loom Tree

The central data structure — a hypergraph-backed tree representing branching exploration. Every conversation is a Loom Tree.

- Has exactly one **root node**
- Contains **nodes** (content) connected by **edges** (relationships)
- Mode is set at creation: `dialogue` or `buffer`
- Has optional `systemContext` prepended to every context window

### Node

A single unit of content. Nodes are **immutable** — edits create new nodes.

**Key Properties:**
- `id` — ULID primary identifier
- `localId` — 6-8 char tree-unique short ID (for loom-aware context efficiency)
- `content` — Text, image, audio, or mixed content
- `authorAgentId` / `authorType` — Who created it (human or model)
- `contentHash` — SHA-256 for tamper evidence
- `metadata` — bookmarked, pruned, excluded flags
- `editedFrom` — Reference to original node if this node was created by editing another (used in both modes for lineage tracking)

### Edge

A directed hyperedge connecting source node(s) to a target node.

**Types:**
- `continuation` — Target continues from source(s); primary traversal edge
- `annotation` — Comment/note attached to a node (excluded from context by default)

**Source Roles** (for multi-source edges):
- `primary` — Main content in conversation flow
- `context` — Supplementary reference
- `instruction` — Directives appended to system context

**Important:** "Branch" is not an edge type — it's simply when multiple continuation edges originate from the same node.

### Computed Concepts (Not Stored)

- **Path** — Linear sequence of nodes from root to target (computed by traversing edges)
- **Active Path** — Currently selected traversal (UI state)
- **Branch Point** — Node with multiple outgoing continuation edges
- **Siblings** — Nodes sharing the same parent
- **Leaf** — Node with no outgoing continuation edges

📄 **Full spec:** `docs/domain-language/core-concepts.md`, `docs/architecture/model/core-entities.md`

---

## Agents, Humans, & Models

### Agent

The unified abstraction for any entity that participates in a Loom Tree. **Both humans and models are agents.**

**Key Properties:**
- `type` — `human` | `model` (immutable after creation)
- `modelRef` — For model agents: `{provider}:{identifier}` or `local:{ulid}`
- `loomAware` — Can access tree navigation/manipulation tools
- `configuration` — systemPrompt, temperature, maxTokens, etc.
- `permissions` — read, write
- `ownerTreeId` — When set, the agent is **tree-owned**: private to that
  LoomTree, hidden from the shared library, and hard-deleted with the tree.
  `null` = shared/library agent.

**One model can back multiple agents** with different configurations (e.g., "Claude Balanced" vs "Claude Creative" with different temperatures).

### Tree → Agent Linkage

Each dialogue tree references the model agent that generates when the user
sends a turn (`LoomTree.defaultModelAgentId`, required for dialogue trees).
There is **no global "active provider"** — provider routing is resolved per
request from the agent's `modelRef`. Editing dialogue settings inside a chat
either mutates the shared agent (explicit choice) or forks a tree-owned copy.
New trees use the pinned default agent (`UserPreferences.defaultModelAgentId`)
with fallback to the first shared model agent.

### Model Reference Format

- Remote: `anthropic:claude-sonnet-4-20250514`, `openai:gpt-4o`, `openrouter:model-name`
- Local: `local:{ulid}` (references LocalModel entity)

### UserPreferences

App-wide singleton for user settings (not tied to any Agent):
- displayName, email, avatarRef
- theme, fontSize, fontFace
- defaultVoiceModeEnabled, defaultTemperature
- nodeViewStyle, nodeViewCornerRadius

### Default Setup

On first launch:
1. Create UserPreferences singleton
2. Create owner Human Agent (type: human, loomAware: true)
3. Create Grove (see below) with ownerAgentId referencing the human agent

📄 **Full spec:** `docs/domain-language/agents.md`, `docs/architecture/model/agents.md`

---

## Interaction Modes

### Dialogue Mode

Traditional back-and-forth conversation with clear message boundaries and author attribution. The familiar chat experience, but with branching.

### Buffer Mode

Continuous text without message boundaries — model completions stream directly into the document. Think "collaborative text editor."

**Key Concepts:**
- **Working buffer** — Uncommitted text at document end
- **Committed nodes** — Persisted nodes rendered as continuous text
- **Two distinct operations:**
  - **Editing** — Creates version node (`editedFrom` set), downstream shared via hyperedge (no duplication)
  - **Branching** — Creates sibling nodes, each with potentially different downstream

**Visual distinction:** Model text in distinct color (e.g., blue); human text in default color. Character-level authorship computed by diffing original vs edited content.

### Edit Behavior by Mode

| Mode | Edit Behavior | Tree Result | `editedFrom` |
|------|---------------|-------------|--------------|
| **Buffer** | Edit in place, downstream preserved | Version node (hyperedge keeps downstream attached) | ✓ Set |
| **Dialogue** | Edit creates branch, continue from edit point | Sibling node (traditional branch, separate downstream) | ✓ Set |

In both modes, `editedFrom` tracks lineage ("this node originated from editing that node"). The difference is in tree structure: Buffer Mode uses hyperedges to preserve downstream nodes; Dialogue Mode creates a traditional branch.

📄 **Full spec:** `docs/architecture/specs/buffer-mode.md`

### Voice Mode

App-wide toggle for hands-free interaction. When ON:
1. User sends prompt (typed or dictated)
2. Model generates → TTS reads aloud
3. TTS finishes → Auto-listen with 4-second silence timeout
4. User speaks → Transcribed → Sent after 4s pause
5. Loop continues

**Think Mode:** Pause button suspends timeout to let the user think mid-dictation.

📄 **Full spec:** `docs/domain-language/interaction-modes.md#voice-mode`

### Loom-Aware Setting

Agent-level toggle determining whether the agent can see/manipulate tree structure.

- **Loom-Aware ON:** Sees metadata, can navigate branches, use loom tools
- **Loom-Aware OFF:** Sees only the active path as linear conversation

**Two-Role Pattern:** Subject model (not loom-aware, being studied) + Collaborator model (loom-aware, helping analyze).

📄 **Full spec:** `docs/domain-language/interaction-modes.md#loom-aware`, `docs/architecture/specs/loom-tools/README.md`

---

## Tree Operations

| Operation | Creates Nodes | Effect |
|-----------|---------------|--------|
| **Generate Continuation** | Yes | Request continuation(s) from agent; multiple creates branch point |
| **Fork** | Yes | Manually create alternative path |
| **Navigate** | No | Change active path (UI only) |
| **Bookmark** | No | Mark node for easy retrieval with optional label |
| **Annotate** | Yes | Attach note via annotation edge (excluded from context) |
| **Prune** | No | Soft-hide branch (metadata flag) |
| **Export Path** | No | Serialize to Markdown/JSON/PDF |
| **Merge** | Yes | Synthesize content from multiple paths |

📄 **Full spec:** `docs/domain-language/tree-operations.md`

---

## Organization & Knowledge Management

### Grove

Top-level container for all user data. One user, one Grove (MVP).

Contains: Loom Trees, Documents, Tags, Links

### Document

Mutable rich document for notes and reference material. Composed of content blocks:

**Shared Primitives:** TextBlock, ImageBlock, AudioBlock
**Document-Specific:** HeadingBlock, CodeBlock, CalloutBlock, NodeEmbedBlock, TreeEmbedBlock, DividerBlock

### Link

Bidirectional reference between any two items (Node, LoomTree, Document). Creates the knowledge graph.

**Important distinction:**
- **Links** — Cross-tree/cross-document references
- **Edges** — Connections within a single Loom Tree

### Tag

Labels for organization. Applied via TagAssignment junction entity. Case-sensitive uniqueness within Grove.

📄 **Full spec:** `docs/domain-language/file-system.md`, `docs/architecture/model/organization.md`

---

## Provenance System

### Tiered Verification Strategy

| Tier | What It Proves | Default | Notes |
|------|----------------|---------|-------|
| **Hash Chains** | Integrity (no tampering) | ✓ | Any modification invalidates chain |
| **RFC 3161 Timestamps** | Existence at specific time | ✓ | Third-party signed proof |
| **Raw API Storage** | Comprehensive evidence | ✓ | Full response + headers stored |
| **TLS Notary** | Cryptographic proof of origin | Future | +10-15s latency |
| **Provider Signatures** | Complete proof | Aspirational | Requires provider support |

### Hash Chain Computation

**Human-authored nodes:** Hash of content + parent hashes + createdAt + authorAgentId

**Model-generated nodes:** Hash of content + parent hashes + createdAt + authorAgentId + SHA-256(raw API response bytes)

The raw response hash must be computed **immediately upon receipt**, before any parsing.

### RawApiResponse Entity

Stored for every model-generated node:
- Complete response body + headers (gzip compressed)
- Request/response timestamps, latency
- Token usage, provider request ID

📄 **Full spec:** `docs/provenance-overview.md`, `docs/architecture/model/provenance.md`

---

## Architecture Overview

### Layer Structure (Clean Architecture)

```
┌─────────────────────────────────────────────┐
│            Interface Layer                  │
│    (React Native UI, Navigation, State)     │
├─────────────────────────────────────────────┤
│          Infrastructure Layer               │
│  (WatermelonDB, LLM Adapters, Filesystem)   │
├─────────────────────────────────────────────┤
│           Application Layer                 │
│   (Use Cases, Repository Interfaces)        │
├─────────────────────────────────────────────┤
│             Domain Layer                    │
│  (Entities, Value Objects, Business Rules)  │
└─────────────────────────────────────────────┘

        Dependencies point inward only
```

### Key Principles

1. **Domain knows nothing** about persistence, UI, or external services
2. **Application defines interfaces**; Infrastructure implements them
3. **Contract pattern** enables testing with mocks and swapping implementations

### Directory Structure

```
src/
├── domain/           # Entities, value objects, errors
├── application/      # Use cases, repository interfaces
├── infrastructure/   # WatermelonDB, LLM adapters, media storage
└── interface/        # React Native screens, components, navigation
```

📄 **Full spec:** `docs/architecture/README.md`, `docs/architecture/adr/003-layer-boundaries.md`

---

## Data Model Summary

### Core Entities

| Entity | Key Fields | Notes |
|--------|------------|-------|
| **LoomTree** | id, groveId, rootNodeId, mode, systemContext | One root, mode immutable |
| **Node** | id, localId, loomTreeId, content, authorAgentId, contentHash, editedFrom | Immutable once created |
| **Edge** | id, sources[], targetNodeId, edgeType | Hyperedge support |
| **Agent** | id, type, modelRef, loomAware, configuration, permissions | Unified human/model |
| **UserPreferences** | (singleton) | App-wide settings |
| **LocalModel** | id, identifier, endpoint, authConfig | User-defined models |

### Organization Entities

| Entity | Key Fields | Notes |
|--------|------------|-------|
| **Grove** | id, ownerAgentId | Top level container, one per user |
| **Document** | id, groveId, blocks[] | Mutable rich content |
| **Link** | sourceType/Id, targetType/Id | Bidirectional |
| **Tag** | id, groveId, name, color | Case-sensitive |
| **TagAssignment** | tagId, targetType, targetId | Junction table |

### Provenance Entities

| Entity | Key Fields | Notes |
|--------|------------|-------|
| **RawApiResponse** | nodeId, responseBody, responseHeaders | Compressed storage |
| **TimestampCertificate** | nodeId, contentHash, certificate | RFC 3161 proof |

### Content Types (Discriminated Union)

- `text` — Inline markdown string
- `image` — Reference + metadata (ref, mimeType, dimensions, thumbnailRef)
- `audio` — Reference + metadata (ref, mimeType, durationMs, transcriptRef)
- `mixed` — Ordered array of content blocks

📄 **Full spec:** `docs/architecture/model/` directory

---

## Context Assembly

### System Context Combination

1. **Agent-level** (`Agent.configuration.systemPrompt`) — First
2. **Tree-level** (`LoomTree.systemContext`) — Second (more specific, closer to messages)

### Dialogue Mode Assembly

1. Traverse active path root → current
2. Filter excluded/pruned nodes
3. Combine system context
4. Convert nodes to messages (human → user, model → assistant)
5. Merge consecutive same-author messages
6. Apply truncation if needed

### Buffer Mode Assembly

1. Traverse active path with version resolution
2. Filter excluded nodes
3. Concatenate as continuous text (no system context by default)
4. Append working buffer
5. Apply truncation if needed

### Truncation Strategies

| Strategy | Behavior | Best For |
|----------|----------|----------|
| `truncateMiddle` (default) | Preserve start + end, remove middle | Long conversations |
| `rollingWindow` | Keep only recent content | Chat-like interactions |
| `stopAtLimit` | Error if exceeded | Research/provenance-critical |

📄 **Full spec:** `docs/architecture/specs/context-assembly.md`

---

## Loom-Aware Tools

Aspen Grove's tools are designed to feel more natural to the model than most existing LLM tool systems. A tool should feel like reaching for something, not filing a formal request. The model shouldn't have to break chain of thought and have this awkward stop/start process to gather information.

### Tool Syntax

Commands use `→` prefix on their own line:
```
→ view a7x2
→ annotate a7x2 "this is where the tone shifts"
→ continue from b3k9 n:3
```

### Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Navigation** | view, list, tree, switch | Explore tree structure |
| **Content** | continue, respond, annotate, link, edit, bookmark, prune | Create/modify content |
| **Document** | read, write | Access linked documents |
| **Memory** | pin, stash, recall, drop, memory | Manage working context |
| **Meta** | help, think, search | Self-help, reasoning, web search |

### Ambient Context

**Per-node metadata** (inline with each message):
```
[a7x2] human · 3m ago
2 continuations · 1 annotation · bookmarked
---
Content here...
```

**System-level context** (once per turn, at end):
```
=== Loom Context ===
Tree: "Marie Character Study" (dialogue mode)
47 nodes · 6 branches · depth: 12
Position: ... → [a7x2] → [b3k9]*
Permissions: loom_aware, loom_write, doc_read
===
```

### Permissions (Modular)

- `loom_aware` — Base: view, navigate, memory tools
- `loom_write` — Create nodes, annotations, links
- `loom_generate` — Request continuations from subject models
- `doc_read` — View documents
- `doc_write` — Edit documents

### Client-Side Parsing

Loom tools are parsed **client-side only** — not registered as provider tools. This avoids conflicting guidance from provider tool systems and ensures consistent behavior across providers.

📄 **Full spec:** `docs/architecture/specs/loom-tools/` directory

---

## Key Technical Decisions

### ADR-001: Persistence with WatermelonDB

- SQLite under the hood, lazy loading by default
- Observable queries for reactive UI
- Sync primitives for future cloud support

### ADR-002: Multimodal Storage Strategy

- Node content contains **references**, not binary data
- Files stored in filesystem: `media/{loomtrees|documents}/{parentId}/...`
- Content hash filenames enable deduplication
- Thumbnails generated on store

### ADR-003: Clean Architecture Layer Boundaries

- Four layers with inward-only dependencies
- Contract pattern for testability and flexibility
- Domain layer is pure TypeScript, no framework dependencies

### Naming Conventions

- Types/Classes: PascalCase (`LoomTree`, `Node`)
- Variables/Properties: camelCase (`activePath`, `contentHash`)
- Constants: SCREAMING_SNAKE_CASE
- Files: kebab-case (`loom-tree.ts`)

### IDs

ULIDs for all entities — sortable, unique, compatible with WatermelonDB.

📄 **Full spec:** `docs/architecture/adr/` directory, `docs/domain-language/conventions.md`

---

## Document Map

Use this to find detailed specifications when the summary isn't enough.

### Domain Language (Conceptual)

| Topic | Document |
|-------|----------|
| Core structures (Loom Tree, Node, Edge, Path) | `docs/domain-language/core-concepts.md` |
| Dialogue/Buffer/Voice/Loom-Aware modes | `docs/domain-language/interaction-modes.md` |
| Agent abstraction | `docs/domain-language/agents.md` |
| Generate, Fork, Navigate, Bookmark, etc. | `docs/domain-language/tree-operations.md` |
| Grove, Document, Link, Tag | `docs/domain-language/file-system.md` |
| Context Window, System Context, Excluded | `docs/domain-language/context-memory.md` |
| Naming, code organization | `docs/domain-language/conventions.md` |
| Field Guide, future concepts | `docs/domain-language/field-guide.md` |

### Use Cases

| Topic | Document |
|-------|----------|
| Branching exploration, model comparison, provenance | `docs/use-cases/exploration-study.md` |
| Buffer Mode writing, voice collaboration | `docs/use-cases/creation-collaboration.md` |
| Personal knowledge base, linking, export | `docs/use-cases/knowledge-management.md` |
| Research projects, long-form writing | `docs/use-cases/cross-cutting-scenarios.md` |
| Backroom, Ruminate, future features | `docs/use-cases/future-use-cases.md` |

### Architecture (Technical)

| Topic | Document |
|-------|----------|
| Overview and implementation order | `docs/architecture/README.md` |
| All review findings and resolutions | `docs/architecture/review-findings.md` |

### Architecture Decision Records

| Topic | Document |
|-------|----------|
| WatermelonDB choice | `docs/architecture/adr/001-persistence.md` |
| Media storage strategy | `docs/architecture/adr/002-multimodal-storage.md` |
| Clean Architecture layers | `docs/architecture/adr/003-layer-boundaries.md` |

### Data Model Specifications

| Topic | Document |
|-------|----------|
| LoomTree, Node, Edge, Content Types | `docs/architecture/model/core-entities.md` |
| Agent, Model, UserPreferences, LocalModel | `docs/architecture/model/agents.md` |
| Grove, Document, Link, Tag | `docs/architecture/model/organization.md` |
| RawApiResponse, TimestampCertificate, Hash Chain | `docs/architecture/model/provenance.md` |

### Feature Specifications

| Topic | Document |
|-------|----------|
| Buffer Mode structural model | `docs/architecture/specs/buffer-mode.md` |
| Context assembly algorithm | `docs/architecture/specs/context-assembly.md` |
| Loom-aware tools overview | `docs/architecture/specs/loom-tools/README.md` |
| Complete tool definitions | `docs/architecture/specs/loom-tools/tool-reference.md` |
| Context, permissions, execution | `docs/architecture/specs/loom-tools/context-and-execution.md` |

### Contract Specifications

| Topic | Document |
|-------|----------|
| Repository pattern overview | `docs/architecture/contracts/repositories/README.md` |
| Individual repositories | `docs/architecture/contracts/repositories/*.md` |
| LLM provider abstraction | `docs/architecture/contracts/llm-provider.md` |
| Media storage service | `docs/architecture/contracts/media-storage.md` |
| Web search service | `docs/architecture/contracts/web-search.md` |

### Provenance

| Topic | Document |
|-------|----------|
| High-level strategy | `docs/provenance-overview.md` |
| Technical specification | `docs/architecture/model/provenance.md` |

---

## Quick Reference: Common Questions

### "How do I add a new content type?"

Content uses discriminated union in `core-entities.md`. Add new type variant, update media storage if binary content.

### "How does branching work?"

Multiple continuation edges from same node = branch point. Siblings are alternative continuations. See `core-concepts.md`.

### "How is context sent to models?"

See `context-assembly.md`. System context combined, nodes converted to messages, truncation applied.

### "How do edits work if nodes are immutable?"

Edits always create new nodes with `editedFrom` set to track lineage. The tree behavior differs by mode:
- **Buffer Mode**: Creates version node, downstream preserved via hyperedge (no duplication)
- **Dialogue Mode**: Creates sibling node (traditional branch), conversation continues from edit point

See `buffer-mode.md` for Buffer Mode specifics.

### "How do I implement a new LLM provider?"

Implement `LLMProvider` interface from `llm-provider.md`. Key: capture raw response bytes before parsing for provenance.

### "What's the difference between Link and Edge?"

- **Edge**: Connects nodes within a single Loom Tree (continuation, annotation)
- **Link**: Connects items across trees/documents (knowledge graph)

### "How does the hash chain work?"

Human nodes: content + parents + timestamp + agentId
Model nodes: content + parents + timestamp + agentId + SHA-256(raw response)
See `provenance.md`.

### "How do loom-aware tools work?"

Client-side parsing of `→ command` syntax. Not provider tools. See `loom-tools/README.md`.

---

## Implementation Order (Recommended)

1. **Domain Layer** — Entity interfaces, value objects, hash computation
2. **Application Layer** — Repository interfaces, use case skeletons
3. **Infrastructure Layer** — WatermelonDB implementation, LLM adapters
4. **Interface Layer** — React Native screens and components

Within each layer, start with core Loom Tree operations before expanding to organization features.

---

*This guide should answer most development questions. For details, follow the document map to the authoritative specification.*
