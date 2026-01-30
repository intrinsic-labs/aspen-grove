# Aspen Grove — Use Cases

> This directory describes how users interact with Aspen Grove to accomplish their goals. Use cases are organized by primary intent and reference the domain language defined in the [Domain Language](../domain-language/README.md) documentation.

---

## Overview

Aspen Grove serves three interconnected purposes:

1. **Exploration & Study** — Understanding how models think, behave, and respond
2. **Creation & Collaboration** — Working with models to produce meaningful output
3. **Knowledge Management** — Organizing, connecting, and preserving what emerges

These aren't separate modes — they blend together. A user might start exploring a model's behavior, shift into collaborative writing, and end up with notes they want to preserve. The system supports this fluidity.

The activity of working within Loom Trees is called **looming** or **weaving**.

---

## Contents

| Document | Description |
|----------|-------------|
| [Exploration & Study](./exploration-study.md) | Understanding model capabilities, behaviors, and quirks |
| [Creation & Collaboration](./creation-collaboration.md) | Working with models to produce meaningful output |
| [Knowledge Management](./knowledge-management.md) | Organizing, connecting, and preserving insights |
| [Cross-Cutting Scenarios](./cross-cutting-scenarios.md) | Complex workflows combining multiple patterns |
| [Future Use Cases](./future-use-cases.md) | Planned capabilities beyond MVP |

---

## Agent Congifuration Examples

| Use Case | Human is Loom-Aware | Model is Loom-Aware | Notes |
|----------|------------------|------------------|-------|
| Branching Exploration | ✓ | ✗ | Human navigates, model responds |
| Comparative Model Study | ✓ | ✗ | Multiple models, none see tree |
| Prompt Iteration Study | ✓ | ✗ | Human creates variants |
| Behavioral Documentation | ✓ | Varies | Models and Humans are technically able to document each other |
| Assisted Exploration | ✓ | ✓ (collaborator) | Two-role pattern |
| Provenance Verification | ✓ | — | Human-only activity |
| Buffer Mode Writing | ✓ | ✗ | Human navigates, model completes |
| Collaborative Problem-Solving | ✓ | Optional | Web search + voice enabled |
| Iterative Refinement | ✓ | ✗ | Human drives iteration |
| Multi-Model Collaboration | ✓ | Varies | Per-agent configuration |
| Knowledge Management | ✓ | — | Human-only activity |
| Field Guide Learning | — | — | Passive consumption |

---

## Related Documentation

- [Domain Language](../domain-language/README.md) — Core terminology and concepts
- [Architecture Overview](../architecture/README.md) — Technical specifications
- [Buffer Mode Spec](../architecture/specs/buffer-mode.md) — Detailed Buffer Mode specification

---

*This document should evolve as we learn from actual usage patterns.*