# Field Guide & Future Concepts

> The educational backbone of Aspen Grove, plus concepts planned for future development.

---

## Field Guide

Curated content explaining how to think about and work with LLMs. The Field Guide is the educational backbone of Aspen Grove — it helps users understand not just *how* to use the tool, but *why* it works the way it does.

### Contents

- **Conceptual articles** — explaining looms, latent space, multiverse thinking
- **Prompting guides** — how to engage models effectively
- **Tool documentation** — how to use Aspen Grove's features
- **External resources** — links to valuable research and reading

### MVP Scope

The Field Guide *container* is MVP. The *content* will expand over time.

### Future Content

The Field Guide may later include:
- Interviews with LLM researchers
- Personal observation notebook for documenting findings
- Community-contributed guides
- Model-specific tips and considerations

### Technical Implementation

Field Guide content is **fetched from a headless CMS** (Sanity). This means:
- Content is not bundled in the app
- Content is not user-editable
- Content updates don't require app releases
- Offline caching ensures availability

---

## Future Concepts (Not MVP)

These terms are defined for conceptual clarity but are not part of the initial implementation:

### Backroom

A space for multi-model conversations where models talk to each other, optionally observed by the human.

**Characteristics:**
- Multiple model agents in conversation
- Human can observe without participating
- Human can intervene when desired
- Useful for exploring model-to-model dynamics

### Ruminate

A mode where the model continues processing asynchronously when the human is away.

**Characteristics:**
- Model explores branches on its own
- User returns to find new content
- Guided by user-defined goals or questions
- Requires background processing capability

### Activation Memory

A memory system based on storing neural activation patterns rather than text summaries.

**Characteristics:**
- Speculative/research concept
- Would enable more nuanced "remembering"
- Depends on interpretability advances
- Not currently feasible with API-based models

---

## Roadmap Context

These future concepts represent Aspen Grove's longer-term vision:

| Phase | Features |
|-------|----------|
| **MVP** | Field Guide container, core looming |
| **Post-MVP** | Field Guide content expansion, TLS Notary |
| **Future** | Backroom, Ruminate, collaboration features |
| **Research** | Activation Memory, advanced interpretability |

---

## Related Documentation

- [Interaction Modes](./interaction-modes.md) — Current modes (Dialogue, Buffer, Voice)
- [Use Cases: Future Use Cases](../use-cases/future-use-cases.md) — Detailed future scenarios
- [Provenance Overview](../provenance-overview.md) — Future TLS Notary plans