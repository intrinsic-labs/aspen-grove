# Aspen Grove — Use Cases

> This directory describes how users interact with Aspen Grove to accomplish their goals. Use cases are organized by primary intent and reference the domain language defined in the [Domain Language](../domain-language/README.md) documentation.

---

## Overview

Aspen Grove is a loom for getting to know language models. Its use cases fall under two purposes:

1. **Exploration & Study** — Understanding how models think, behave, and respond
2. **Creation & Collaboration** — Working with models to produce meaningful output

These aren't separate modes — they blend together. A user might start exploring a model's behavior and shift into collaborative writing. Aspen Grove is not a chat client, a notes app or a coding harness.

The activity of working within Loom Trees is called **looming** or **weaving**.

---

## Contents

| Document | Description |
|----------|-------------|
| [Exploration & Study](./exploration-study.md) | Understanding model capabilities, behaviors, and quirks |
| [Creation & Collaboration](./creation-collaboration.md) | Working with models to produce meaningful output |
| [Cross-Cutting Scenarios](./cross-cutting-scenarios.md) | Complex workflows combining multiple patterns |
| [Future Use Cases](./future-use-cases.md) | After v1: LoomDisplay, buffer mode, Backrooms |

---

## Agent Configuration Examples

| Use Case | Human is Loom-Aware | Model is Loom-Aware | Notes |
|----------|------------------|------------------|-------|
| Branching Exploration | ✓ | ✗ | Human navigates, model responds |
| Comparative Model Study | ✓ | ✗ | Multiple models, none see tree |
| Prompt Iteration Study | ✓ | ✗ | Human creates variants |
| Behavioral Documentation | ✓ | ✗ | Bookmarks, tags, annotations |
| Assisted Exploration (after v1) | ✓ | ✓ (collaborator) | Two-role pattern |
| Provenance Verification | ✓ | — | Human-only activity |
| Buffer Mode Writing (after v1) | ✓ | ✗ | Human navigates, model completes |
| Collaborative Problem-Solving | ✓ | ✗ | Character voices optional |
| Iterative Refinement | ✓ | ✗ | Human drives iteration |
| Multi-Model Collaboration | ✓ | Varies | Per-agent configuration |

---

## Related Documentation

- [Domain Language](../domain-language/README.md) — Core terminology and concepts
- [Architecture Overview](../architecture/README.md) — Technical specifications
- [Buffer Mode Spec](../architecture/specs/buffer-mode.md) — Detailed Buffer Mode specification

---

*This document should evolve as we learn from actual usage patterns.*