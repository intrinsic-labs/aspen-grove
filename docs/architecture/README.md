# Aspen Grove Architecture Documentation

> Technical architecture specifications for Aspen Grove. These documents define the structure, patterns, and contracts that guide implementation.

---

## How to Use This Documentation

1. **Start with ADRs** — Understand the key decisions and their rationale
2. **Review Model specs** — Learn the data structures and their relationships
3. **Study Contracts** — Understand the interfaces between layers

These specifications are written to make TypeScript implementation straightforward. They use bullet points and prose rather than code to avoid maintaining a second codebase.

---

## Architecture Decision Records (ADR)

Captured decisions with context and rationale.

| ADR | Title | Status |
|-----|-------|--------|
| [001](./adr/001-persistence.md) | Persistence with WatermelonDB | Accepted |
| [002](./adr/002-multimodal-storage.md) | Multimodal Content Storage Strategy | Accepted |
| [003](./adr/003-layer-boundaries.md) | Clean Architecture Layer Boundaries | Accepted |

---

## Data Model Specifications

Entity definitions, relationships, and constraints.

| Document | Covers |
|----------|--------|
| [Core Entities](./model/core-entities.md) | LoomTree, Node, Edge, Content Types |
| [Agents](./model/agents.md) | Agent, Model, UserPreferences |
| [Organization](./model/organization.md) | Grove, Document, Link, Tag |
| [Provenance](./model/provenance.md) | RawApiResponse, TimestampCertificate, Hash Chain Computation |

---

## Contract Specifications

Abstract interfaces that define layer boundaries.

| Document | Covers |
|----------|--------|
| [Repositories](./contracts/repositories/README.md) | Data access contracts for all entities |
| [LLM Provider](./contracts/llm-provider.md) | Model API abstraction |
| [Media Storage](./contracts/media-storage.md) | Binary content storage |

---

## Layer Overview

From [ADR-003](./adr/003-layer-boundaries.md):

```
┌─────────────────────────────────────────────┐
│            Interface Layer                   │
│   (React Native UI, Navigation, State)       │
├─────────────────────────────────────────────┤
│          Infrastructure Layer                │
│   (WatermelonDB, LLM Adapters, Filesystem)   │
├─────────────────────────────────────────────┤
│           Application Layer                  │
│   (Use Cases, Repository Interfaces)         │
├─────────────────────────────────────────────┤
│             Domain Layer                     │
│   (Entities, Value Objects, Business Rules)  │
└─────────────────────────────────────────────┘

        Dependencies point inward only
```

---

## Review & Specifications

| Document | Description |
|----------|-------------|
| [Review Findings](./review-findings.md) | Pre-development review issues and resolutions |
| [Buffer Mode Spec](./specs/buffer-mode.md) | Buffer Mode specification |
| [Buffer Mode Questions](./specs/buffer-mode-questions.md) | Open questions for Buffer Mode specification |
| [Loom Tools Spec](./specs/loom-tools/README.md) | Loom-aware model tools specification |
| [Context Assembly Spec](./specs/context-assembly.md) | Context window construction for LLM requests |

*Additional specs will be added to `./specs/` as issues are resolved.*

---

## Related Documents

- [Domain Language](../domain-language/README.md) — Core concepts and terminology
- [Use Cases](../use-cases/README.md) — User interactions and flows

---

## Implementation Order

Recommended sequence for building:

1. **Domain Layer** — Entity interfaces, value objects, hash computation
2. **Application Layer** — Repository interfaces, use case skeletons
3. **Infrastructure Layer** — WatermelonDB implementation, LLM adapters
4. **Interface Layer** — React Native screens and components

Within each layer, start with the core Loom Tree operations (create tree, add node, navigate) before expanding to organization features (tags, links, documents).

---

*These specifications should evolve as implementation reveals new requirements or constraints.*