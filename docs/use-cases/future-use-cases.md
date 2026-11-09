# Future Use Cases

> What comes after v1, in the order Aspen Grove plans to take it. None of this is built yet.

---

## LoomDisplay

**Goal**: Let a model draw — ASCII animation frames rendered in the loom.

**Concept**:
- The model emits frames through a `→` loom tool, the first model-ergonomic tool
- The app plays the frames back inline with the node that made them
- Branching works as everywhere else: draw three continuations, watch three animations

**Requirements**:
- The `→` tool parser and execution loop ([Loom Tools](../architecture/specs/loom-tools/README.md))
- A LoomDisplay spec (not written yet)

**Value**: A low-stakes, playful way to see what a model does with a canvas, and the proving ground for tools that feel natural to the model.

---

## Buffer Mode with Base Models

**Goal**: Write with a base model as continuous text rather than turns.

See [Creation & Collaboration 2.1](./creation-collaboration.md#21-buffer-mode-writing) and the [Buffer Mode spec](../architecture/specs/buffer-mode.md).

---

## Backroom Observation

**Goal**: Watch multiple models converse with each other.

**Concept**:
- Multiple model agents in conversation on one tree, alternating turns
- Human observes without participating (or with minimal intervention)
- Can intervene when desired to steer the conversation

**Requirements**:
- Multi-agent orchestration on top of the per-tree agent layer
- Observer mode UI

**Value**: Reveals how models interact, where they agree and disagree, and how they build on each other's ideas. Surfaces behavior not visible in human-model conversation.

---

## Related Documentation

- [Exploration & Study](./exploration-study.md) — Current exploration patterns
- [Creation & Collaboration](./creation-collaboration.md) — Creation patterns, including Buffer Mode
