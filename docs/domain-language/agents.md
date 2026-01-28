# Agents

> The Agent abstraction for entities that participate in Loom Tree interactions.

---

## Agent

The core abstraction for any entity that can participate in or operate on a Loom Tree. **Both humans and models are agents.**

The Loom Tree and its operations treat all Agents uniformly — the tree doesn't care what's behind the agent. This enables:

- **Modularity** — Tree operations accept an Agent, not model-specific parameters
- **Flexibility** — Multiple agents can be backed by the same model with different configurations
- **Consistency** — Humans and models are treated identically at the API level

---

## Human

The backend type for a human agent. One human user may have multiple Agent configurations (e.g., different "modes" of working).

In MVP, there is a single human user with app-wide preferences stored separately from Agent configurations.

---

## Model

The backend type for an LLM agent. Stores only what's needed to call the API (identifier, provider, endpoint, credentials reference).

**Configuration lives at the Agent level, not the Model level** — one model can back multiple differently-configured agents.

### Examples

A single Claude model might back multiple agents:
- "Claude (Balanced)" — temperature 0.7, general use
- "Claude (Creative)" — temperature 1.0, higher variance
- "Claude (Precise)" — temperature 0.3, lower variance

Each is a different Agent with different configurations, all backed by the same Model.

---

## Key Principles

### Uniform Treatment

Tree operations don't distinguish between human and model agents at the interface level:
- Both create Nodes
- Both have authorship tracked
- Both can be Loom-Aware or not
- Both are identified by `authorAgentId` on Nodes

### Configuration Separation

- **Model** = the underlying LLM (Claude, GPT-4, Llama, etc.)
- **Agent** = a configured instance with specific parameters, prompts, and permissions
- One Model → many Agents is the normal pattern

### Authorship & Provenance

Every Node records its `authorAgentId`. The `authorType` field (human or model) is denormalized from the Agent for efficient hash verification in the provenance system.

---

## Related Documentation

- [Architecture: Agents](../architecture/model/agents.md) — Technical specification
- [Interaction Modes](./interaction-modes.md) — Loom-Aware settings
- [Tree Operations](./tree-operations.md) — Generate Continuation and other agent actions
- [Provenance Overview](../provenance-overview.md) — How authorship is verified