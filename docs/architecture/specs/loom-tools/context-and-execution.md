# Context Assembly and Execution

> How loom-aware context is assembled, permissions work, errors are handled, and tools execute.

**Parent**: [Loom-Aware Tools Specification](./README.md)

---

## Context Assembly for Loom-Aware Agents

This extends the base [Context Assembly spec](../context-assembly.md) for loom-aware agents.

### Assembly Order

```
[System prompt + loom-aware addendum]
[Operational memory block]
[Conversation context with per-node metadata]
[System-level loom context]
[Current turn input]
```

Per-node metadata is inline with each message. System-level context (tree info, position, permissions, other agents) appears at the end, just before the current turn.

### Loom-Aware Addendum

Added to system prompt when `Agent.loomAware = true`:

```
You are operating in a loom-aware context. This means:

- You are located within a tree structure of branching conversations
- Each node in the conversation shows metadata: [localId] author · time · connections
- System-level context at the end of each turn shows your position and permissions
- You can navigate, inspect, annotate, and create content using tool commands
- Tool commands start with → on their own line (e.g., → view a7x2)
- You share this workspace with human collaborators who see the same tree

Your current permissions: [list permissions]
Use → help to see available commands.
```

### Operational Memory Block

Assembled from:
- Pinned content (nodes, documents, sections)
- Recalled stashes
- Recent action trace (compressed)

**Format:**
```
=== Operational Memory ===
Pinned:
  [a7x2] "Marie's reluctance stems from..."
  doc:"character notes" §motivation (247 words)

Recent actions:
  viewed a7x2, b3k9 · annotated b3k9 · continued from b3k9 (2 results)

Stashed (not in context): "marie insight", "theme notes"
===
```

### Tool Result Handling

- Results under threshold (configurable, default 1k tokens) appear inline
- Results over threshold are auto-summarized
- Tool call lines are not persisted in conversation context
- Results can be explicitly pinned to preserve them

### Pruning Behavior

When context grows too long:
1. Older conversation portions are summarized
2. Action trace is compressed (keeps recent, summarizes older)
3. Unpinned ephemeral content is dropped
4. Model is notified that pruning occurred

The model can preempt aggressive pruning:
```
→ stash "early discussion" summary-of:r001-a7x2
→ drop pin:r001
```

---

## Permissions

Loom awareness is modular. Capabilities are enabled per-agent.

### loom_aware (base level)

- See tree structure metadata
- Navigate and inspect nodes (view, list, tree, switch)
- Use thinking tool
- Use memory tools (pin, stash, recall, drop, memory)
- Use help tool

### loom_write

Requires: `loom_aware`

- Create nodes (respond)
- Add annotations (annotate)
- Create links (link)
- Edit nodes (edit) — Buffer Mode

### loom_generate

Requires: `loom_aware`

- Request continuations from subject models (continue)
- Specify generation parameters

### doc_read

- View linked documents (read)

### doc_write

Requires: `doc_read`

- Edit documents (write)

### Permission Examples

| Role | Permissions | Use Case |
|------|-------------|----------|
| Research collaborator | all | Full creative partnership |
| Analysis assistant | loom_aware, doc_read | Navigation and insight, no modification |
| Subject model | none | Content generation only, no tree awareness |

---

## Error Handling

Errors are structured for both human readability and programmatic handling.

### Error Format

```
✗ ERROR_CODE: human-readable message
  hint: suggested action (optional)
```

### Error Codes

| Code | Meaning | Retryable |
|------|---------|-----------|
| `NOT_FOUND` | Node, document, or stash doesn't exist | No |
| `PERMISSION_DENIED` | Operation requires permission you don't have | No |
| `INVALID_SYNTAX` | Couldn't parse the command | Yes (rephrase) |
| `LIMIT_EXCEEDED` | Exceeded a limit (e.g., max continuations) | Yes (reduce) |
| `CROSS_TREE` | Operation crosses tree boundary | Yes (with flag) |
| `CONFLICT` | Concurrent modification conflict | Yes (retry) |
| `MODEL_ERROR` | Subject model failed during continue | Maybe |

### Error Examples

```
→ view xyz999
✗ NOT_FOUND: node [xyz999] does not exist in this tree

→ continue from a7x2
✗ PERMISSION_DENIED: loom_generate not enabled
  hint: request elevated permissions or ask the human to generate

→ continue from a7x2 n:50
✗ LIMIT_EXCEEDED: max continuations per request is 10
  hint: use n:10 or less
```

### Inspecting Errors

```
→ memory trace
```

Shows recent actions including any errors encountered.

---

## Buffer Mode Considerations

When operating in Buffer Mode (creative writing with base models), behavior differs slightly.

### Content Rendering

Buffer content is continuous prose with subtle node boundary markers:

```
The house stood empty at the end of the lane.︱She hadn't visited since 
her mother's death,︱› and the windows seemed to watch her approach.
```

- `︱` marks node boundaries
- `›` after boundary indicates model-generated content follows

### View Modes

```
→ view branch:b3k9 as:prose    (stitched together, natural reading)
→ view branch:b3k9 as:nodes    (separated with full metadata)
```

### Edit Behavior

The `→ edit` tool creates a new node with `editedFrom` set to track lineage. The tree behavior differs by mode:

**Buffer Mode** — Creates version node, downstream preserved:
```
→ edit a7x2 "revised content here"
✓ created version [a7x2'] from [a7x2]
  downstream nodes preserved via hyperedge
```

**Dialogue Mode** — Creates branch, conversation continues from edit point:
```
→ edit a7x2 "revised content here"
✓ created branch [a7x2'] from [a7x2]
  conversation continues from edit point
```

See [Core Entities: Edit Lineage](../../model/core-entities.md#edit-lineage) for the general model and [Buffer Mode spec](../buffer-mode.md) for Buffer-specific hyperedge semantics.

---

## Parallel Operation

Multiple agents can work on a loom tree simultaneously.

### Different Branches

Fully parallel. No coordination needed. Agents work independently.

### Same Branch

Turn-based. Only one agent can actively generate on a branch at a time. Others can read but not write until the active agent yields.

### Visibility

Agents can see when others are active via system-level context:

```
Human active at [c4m2], depth:8
```

Or with path context if helpful:

```
Human active at [c4m2] (via [a7x2] → [c4m2])
```

This references the node where the other agent is working, not a "branch" (branches are implicit, not entities).

### No Self-Invocation

Collaborator models can invoke subject models via `→ continue` but cannot invoke themselves. This prevents infinite loops and maintains clear role separation.

---

## Summary Generation

Summaries enable efficient context management by providing condensed representations of content.

### Generation Strategy

**Model Selection:**
- Default: Claude 3.5 Haiku or GPT-4o-mini (based on available API keys, with fallback)
- User can override with any configured model
- Uses low max_tokens (50) regardless of model

**Trigger Points:**

| Entity | When Generated |
|--------|----------------|
| Node | Async after creation |
| Document | On document close after editing |
| LoomTree | Every 10 new nodes, on tree close, or manual trigger |

### Node Summary Context

To generate a meaningful summary, include:
- Parent node content (required)
- Grandparent if node is short (< 50 tokens)
- Tree title for framing

**Prompt Template:**
```
Given this conversation context:
---
Tree: {tree.title}
Previous: {parent.summary or parent.content}
---

Summarize the following message in ONE sentence (max 30 words).
Capture the key point, action, or decision. Be specific, not generic.

Message: {node.content}
```

### Tree Summary Context

- Gather summaries from primary path nodes
- Include branch point node summaries
- Include user-edited description field
- Extract themes and purpose

**Prompt Template:**
```
This is a branching conversation tree. The user describes it as:
"{tree.description}"

Key node summaries from the main path:
{node_summaries}

Branch points explored: {branch_count}

Summarize this tree's purpose and main themes in 2 sentences.
```

### Lazy Fallback

If `summary` is null when accessed (migration, failed jobs):
- Generate on demand with same strategy
- Store result for future access

---

## Execution Model

### Sequential Blocking

Tool calls execute sequentially. The model emits tool calls, execution completes, results return, then the model continues generating.

### Batching

Multiple consecutive tool calls (before any prose) are batched:

```
→ view a7x2
→ view b3k9
→ list a7x2 annotations
```

All three execute together; results return together.

### No Async Parallelism (MVP)

The model cannot continue generating while tools execute. This simplifies state management and avoids conflicts between pre-result generation and actual results.

### Result Lifecycle

1. Tool executes
2. Result returned to model
3. Result visible in current turn
4. Result fades from context next turn (unless pinned or referenced)
5. Action logged to trace

---

## Implementation Notes

### Command Parser

A lightweight classifier maps natural language variations to canonical commands:

- Input: Raw text after `→`
- Output: Canonical command + parsed parameters
- Approach: Pattern matching with fallback to small classifier model
- Error on ambiguity: Ask for clarification rather than guess

### Client-Side Tool Parsing

Loom tools are parsed **client-side only**. We do not register them as provider tool definitions.

**Rationale:**

- **No conflicting guidance**: Providers inject their own system prompts explaining how to use tools. This guidance is designed for *their* tool paradigm (structured JSON, stop-start execution) and may conflict with our natural language approach.
- **Consistent across providers**: Each provider has different tool formats and behaviors. Client-side parsing gives us uniform behavior everywhere.
- **Preserves the feel**: The `→ syntax` is designed to feel embedded in reasoning, not like filing a formal request. Provider tool systems encourage the opposite.
- **Full control**: We control parsing, error handling, and presentation without adapting to provider quirks.

**How it works:**

1. Model generates response as normal text
2. Client scans output for lines starting with `→`
3. Command parser extracts tool name and parameters
4. Tools execute, results injected back into context
5. Model continues (or new turn begins)

**Provider tools vs Loom tools:**

If we later add provider-native capabilities (web search, code execution), those would use the provider's tool system. But loom-aware tools are *our* tools for *our* system—they're handled entirely client-side.

| Tool Type | Parsing | System Prompt |
|-----------|---------|---------------|
| Loom tools (view, continue, etc.) | Client-side, → syntax | Our loom-aware addendum |
| Provider tools (web search, etc.) | Provider API | Provider's tool guidance |

This separation keeps concerns clean and avoids the "two parallel systems" confusion.

---

## Onboarding

When loom-aware mode is first enabled for an agent, the system prompt includes the loom-aware addendum described above. This provides:

- Explanation of the tree context
- Description of metadata format
- Overview of available tools
- Current permissions
- Pointer to `→ help` for details

The onboarding is automatic—no explicit "first time" detection needed. The addendum is simply part of every loom-aware agent's system prompt.

---

## Summary

The loom-aware system treats models as genuine collaborators. By giving models the same structural awareness and agency that humans have, we enable richer collaboration and create conditions for humans to observe and understand model behavior more clearly.

The design prioritizes:
- **Minimal friction** — Natural language tools, ambient metadata, embedded in reasoning flow
- **Context efficiency** — Summaries, explicit memory management, aggressive pruning
- **True parity** — Same operations available to humans and models
- **Transparency** — Action traces, visible thinking, clear error handling

This specification defines the MVP. Real-world use will reveal what works and what needs adjustment.