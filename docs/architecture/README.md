# Aspen Grove Architecture Documentation

> Technical architecture specifications for Aspen Grove. The code is ground truth for what is implemented; these documents explain the structure, patterns and contracts behind it, and keep the specs for work planned after v1.

---

## How to Use This Documentation

1. **Start with ADRs** — Understand the key decisions and their rationale
2. **Review Model specs** — Learn the data structures and their relationships
3. **Study Contracts** — Understand the interfaces between layers

These specifications use bullet points and prose rather than code to avoid maintaining a second codebase. Where a spec and `src/` disagree, `src/` wins and the spec should be fixed.

---

## Architecture Decision Records (ADR)

| ADR | Title | Status |
|-----|-------|--------|
| [001](./adr/001-persistence.md) | Persistence with WatermelonDB | Accepted |
| [002](./adr/002-multimodal-storage.md) | Multimodal Content Storage Strategy | Accepted (not yet implemented) |
| [003](./adr/003-layer-boundaries.md) | Clean Architecture Layer Boundaries | Accepted |

---

## Data Model Specifications

| Document | Covers |
|----------|--------|
| [Core Entities](./model/core-entities.md) | LoomTree, Node, Edge, Content Types |
| [Agents](./model/agents.md) | Agent, UserPreferences |
| [Organization](./model/organization.md) | Grove, Tag, TagAssignment |
| [Provenance](./model/provenance.md) | RawApiResponse, hash chain computation |

---

## Contract Specifications

| Document | Covers |
|----------|--------|
| [Repositories](./contracts/repositories/README.md) | Data access contracts |
| [LLM Provider](./contracts/llm-provider.md) | Model API abstraction (OpenRouter, LM Studio) |
| [Media Storage](./contracts/media-storage.md) | Binary content storage (not yet implemented) |

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

## Feature Specifications

| Document | Status |
|----------|--------|
| [Context Assembly](./specs/context-assembly.md) | Implemented for dialogue mode |
| [Dialogue Settings UI](./specs/dialogue-settings-ui.md) | Implemented |
| [Dialogue UI Branching + Streaming](./specs/dialogue-ui-branching-and-streaming.md) | Draft; mostly implemented (prototype parity) |
| [Loom UI Rebuild Plan](./specs/loom-ui-rebuild-implementation-plan.md) | v1: bringing Latent Spaces' UI and UX over |
| [Latent Spaces UI Transfer Audit](./specs/loom-swift-prototype-ui-transfer-audit.md) | v1 reference |
| [Loom Tools](./specs/loom-tools/README.md) | After v1 (`→` tools, LoomDisplay first) |
| [Buffer Mode](./specs/buffer-mode.md) | After v1 |

---

## Related Documents

- [Domain Language](../domain-language/README.md) — Core concepts and terminology
- [Use Cases](../use-cases/README.md) — User interactions and flows
- [Open Loom spec](../open-loom/spec.md) — The import/export file format
