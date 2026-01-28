# Context & Memory

> How content is assembled and stored for model interactions: Context Window, System Context, Raw API Response, Excluded Content.

---

## Context Window

The content sent to a model when requesting a Continuation. By default, this is the Active Path from Root to the current Node.

### Assembly Process

1. Start from the Root Node
2. Traverse Continuation edges along the Active Path
3. Concatenate content from each Node
4. Prepend System Context (if configured)
5. Apply any exclusions

### Multi-Source Edges

For edges with multiple sources (hyperedges), context may include content from all source nodes according to their roles:

- **Primary** — main content in the conversation flow
- **Context** — supplementary information included for reference
- **Instruction** — directives that shape the response

> For full context assembly specification, see [Architecture: Context Assembly](../architecture/specs/context-assembly.md) (when created).

---

## System Context

Persistent instructions included at the start of every Context Window for a given Loom Tree or Agent. Similar to a system prompt.

### Levels

System Context can be configured at multiple levels:

1. **Agent-level** — applies to all interactions with this Agent (`Agent.systemPrompt`)
2. **Tree-level** — applies to all interactions within this Loom Tree (`LoomTree.systemContext`)

When both exist, they are combined (typically Tree-level after Agent-level).

### Use Cases

- Set persona or behavior guidelines
- Provide background knowledge
- Establish formatting preferences
- Define constraints or boundaries

---

## Raw API Response

The complete, unmodified response object from an API call, stored alongside the Node it generated. Includes headers, timestamps, request IDs, and the full response body.

### Purpose

- **Provenance evidence** — supporting claims about node origin
- **Debugging and research** — inspect exactly what the API returned
- **Future verification** — if API providers add signing, responses are ready

### Storage

- Stored separately from Node content but linked by Node ID
- Compressed (gzip) to minimize storage impact
- Retained for the lifetime of the Node
- Users can access on demand via a "View Provenance" action

### What's Captured

- Full JSON response body
- HTTP headers (including request IDs, timestamps, rate limit state)
- Client-side timing information
- Token usage (if provided by the API)

> For full specification, see [Architecture: Provenance](../architecture/model/provenance.md).

---

## Excluded Content

Nodes or Annotations marked to be excluded from the Context Window. Useful for human-only notes or meta-commentary that shouldn't influence the model.

### How to Exclude

Set the `excluded` metadata field on a Node to `true`. This Node's content will be skipped when assembling context for generation.

### Automatic Exclusions

- **Annotation edges** — content attached via Annotation edges is excluded by default
- **Pruned nodes** — pruned branches are excluded from context (they're also hidden from view)

### Use Cases

- Add human-only notes that models shouldn't see
- Attach meta-commentary about the conversation
- Insert reminders or TODOs without affecting generation
- Document observations mid-conversation

---

## Token Considerations

### Context Window Limits

Models have maximum context window sizes. When the Active Path exceeds this limit:

1. Oldest content may be truncated (strategy TBD in context-assembly spec)
2. System Context is always preserved
3. Recent context is prioritized

### Token Counting

- Token counts vary by model/tokenizer
- Aspen Grove estimates tokens for display purposes
- Actual token usage is recorded in RawApiResponse

---

## Related Documentation

- [Core Concepts](./core-concepts.md) — Node, Edge, Path
- [Tree Operations](./tree-operations.md) — Generate Continuation
- [Provenance Overview](../provenance-overview.md) — Verification and authenticity
- [Architecture: Provenance](../architecture/model/provenance.md) — Technical specification