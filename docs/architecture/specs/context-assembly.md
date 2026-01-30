# Context Assembly — Specification

> How context is assembled for LLM completion requests: system context combination, message ordering, exclusion filtering, and truncation.

**Status**: Draft  
**Related**: [Context & Memory](../../domain-language/context-memory.md), [LLM Provider](../contracts/llm-provider.md), [Core Entities](../model/core-entities.md)

---

## Overview

Context assembly transforms a path through a Loom Tree into a completion request. The process differs between Dialogue Mode (messages array) and Buffer Mode (concatenated document), but both share core concepts.

---

## System Context Combination

System context can be configured at two levels:

- **Agent-level**: `Agent.configuration.systemPrompt` — applies to all interactions with this agent
- **Tree-level**: `LoomTree.systemContext` — applies to all interactions within this tree

When both exist, Agent-level comes first, then Tree-level. This puts more specific (tree-level) instructions closer to the actual conversation.

### Provider Handling

Providers with native system prompt support receive combined context in the dedicated field. Providers without support receive it as the first message or injected per provider conventions.

---

## Multi-Source Edge Handling

Most edges have a single source with role `primary`. Multi-source edges support complex generation scenarios like multimodal prompts.

### Edge Source Roles

| Role | Purpose | Assembly Behavior |
|------|---------|-------------------|
| **Primary** | Main content in conversation flow | Becomes the main message content |
| **Context** | Supplementary reference (e.g., an image) | Included before primary as reference |
| **Instruction** | Per-generation directives | Appended to system context |

When an edge has multiple sources, they are processed in order: Instruction → Context → Primary.

**MVP Note**: Multi-source edges with mixed roles are an advanced feature. Most edges will be single-source with role `primary`.

---

## Exclusion Filtering

Nodes are excluded from context if any of the following are true:

- `node.metadata.excluded` is true (explicitly excluded)
- `node.metadata.pruned` is true (soft-deleted)
- Node is reached via an `annotation` edge (unless explicitly included)

---

## Dialogue Mode Assembly

1. Traverse the active path from root to current position
2. Filter out excluded nodes
3. Combine system context (Agent + Tree + any Instruction sources)
4. Convert each node to a message based on `authorType`: human → `user`, model → `assistant`
5. Merge consecutive same-author nodes into single messages
6. Estimate tokens and apply truncation if needed

---

## Buffer Mode Assembly

Buffer Mode differs from Dialogue Mode in key ways:

| Aspect | Dialogue Mode | Buffer Mode |
|--------|---------------|-------------|
| Output format | Messages array | Single document string |
| Role distinctions | user/assistant | None (continuous text) |
| System context | Included by default | **Excluded by default** |

To enable system context in Buffer Mode, set `LoomTree.bufferModeSystemContext` to true.

### Assembly Steps

1. Traverse the active path (with version resolution per [Buffer Mode spec](./buffer-mode.md))
2. Filter out excluded nodes
3. Concatenate all node content as continuous text
4. Append working buffer (uncommitted text)
5. Estimate tokens and apply truncation if needed

---

## Truncation Strategies

When context exceeds the model's limit, one of three user-configurable strategies applies.

### `truncateMiddle` (Default)

Preserves the beginning and end, removes from the middle. System context and the most recent nodes (configurable, default 4) are always kept. A truncation marker indicates where content was removed.

**Best for**: Long conversations where early setup and recent context both matter.

### `rollingWindow`

Keeps only the most recent content that fits. Oldest content is discarded entirely.

**Best for**: Chat-like interactions where only recent context matters.

### `stopAtLimit`

Refuses to truncate — returns an error if context exceeds the limit. User must manually reduce context by excluding nodes or switching models.

**Best for**: Research use cases where every node matters; provenance-critical conversations.

### Guarantees

Regardless of strategy:
- System context is never truncated (error if it alone exceeds limit)
- At least one message is always included
- Truncation is transparent via output flags

---

## Token Estimation

Tokens are estimated using a conservative heuristic (~4 characters per token for English). A configurable buffer (default 1024 tokens) is reserved for the model's response.

Actual token usage varies by model and is recorded in the RawApiResponse after generation.

---

## User Preferences

| Setting | Default | Description |
|---------|---------|-------------|
| `truncationStrategy` | `truncateMiddle` | Which strategy to use |
| `minimumRecentNodes` | 4 | Always preserve at least this many recent nodes |
| `tokenBuffer` | 1024 | Reserve tokens for model response |

These can be configured at app level or overridden per tree.

---

## Loom-Aware Extensions

For loom-aware agents, additional context is assembled beyond the base process described above. See [Loom Tools: Context Assembly](./loom-tools/context-and-execution.md#context-assembly-for-loom-aware-agents) for:

- Per-node metadata (localId, author, timestamps, connections) inline with each message
- System-level loom context (tree info, position, permissions) at end of context
- Operational memory block (pinned content, recalled stashes, action trace)
- Loom-aware addendum to system prompt

---

## Related Documentation

- [Context & Memory](../../domain-language/context-memory.md) — Domain concepts
- [Core Entities: Edge](../model/core-entities.md#edge) — Edge source roles
- [Buffer Mode](./buffer-mode.md) — Buffer Mode specifics
- [LLM Provider](../contracts/llm-provider.md) — Completion request format
- [Loom Tools](./loom-tools/README.md) — Loom-aware agent tools and context