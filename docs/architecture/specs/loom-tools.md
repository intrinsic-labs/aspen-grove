# Loom-Aware Tools Specification

> How model agents interact with Loom Trees: tool definitions, execution model, ambient context, and memory management.

**Status**: Draft  
**Related**: [Context Assembly](./context-assembly.md), [Buffer Mode](./buffer-mode.md), [Agents](../model/agents.md), [Core Entities](../model/core-entities.md)

---

## Vision

The loom-aware system enables language models to operate as true collaborators within the loom workspace, with the same agency and capabilities as human users. Rather than being passive responders to prompts, a loom-aware model can navigate the tree structure, inspect branches, create annotations, generate continuations, and manage its own working memory—all through a natural, low-friction interface.

The core principle: **humans and models get access to the same operations.** Humans interact through a graphical interface optimized for touch and vision. Models interact through a minimal command syntax optimized for token efficiency and natural expression. Both are calling the same underlying operations on the same shared workspace.

This is not about making the model an assistant that proposes actions for human approval. It's about genuine collaborative agency, where human and model can work in parallel on different branches, leave annotations for each other, and build on each other's contributions.

---

## Design Goals

**Give models spatial/structural awareness.** Conversations aren't linear, but models typically experience them that way. Loom awareness means understanding that you're at a particular location in a tree, that other branches exist, that you can move around and explore. The tree becomes a navigable space, not just a scrolling history.

**Support genuine collaboration.** In the two-role pattern (subject + collaborator), each participant contributes different capabilities. The subject model generates content. The collaborator model offers reflection, meta-awareness, navigation, and can invoke the subject to create branches and timelines. The loom is the shared workspace where this collaboration unfolds.

**Enable careful observation.** The tree structure creates a record of collaborative cognition—where we branched, what alternatives we explored, how ideas evolved. This supports the broader goal of helping humans understand how models behave and think.

**Reduce the prosthetic feeling of tool use.** Current tool-calling patterns feel clunky—structured JSON, explicit function signatures, stop-start execution. The loom-aware system aims for something closer to peripheral awareness and natural action. Tools should feel like reaching for something, not filing a formal request.

**Manage context efficiently.** The first portion of context tends to be where models perform best. The system should maximize signal by keeping tool calls minimal, summarizing aggressively, and giving models explicit control over what stays in working memory versus what gets stashed or dropped.

---

## Prerequisites

This specification depends on additions to the core data model:

### Node.localId

A tree-unique short identifier for efficient in-context reference. See [Core Entities](../model/core-entities.md#node) for the full specification.

- 6-character prefix of the ULID, extended on collision
- Computed at creation time, stored and indexed
- Used in ambient context and tool calls instead of full ULIDs

### Summary Fields

One-to-two sentence summaries for efficient context scanning:

- `Node.summary` — Generated async after creation with parent context
- `Document.summary` — Regenerated on document close
- `LoomTree.summary` — Regenerated periodically (every N nodes or on close)

See [Summary Generation](#summary-generation) for the generation strategy.

---

## Ambient Context

When loom-aware mode is enabled for an agent, each message includes lightweight metadata about the current position in the tree. This creates peripheral awareness without requiring explicit queries.

### Metadata Format

```
⟨node:a7x2k3 depth:12 siblings:2 annotations:1 links:1⟩
```

This tells the model:
- **node** — Current node localId
- **depth** — Distance from root (12 messages deep)
- **siblings** — Alternative branches at this node (2 exist)
- **annotations** — Annotations attached here (1)
- **links** — Links to documents or other nodes (1)

### Buffer Mode Variant

For buffer mode content:

```
⟨node:a7x2k3 mode:buffer doc:"chapter 3" words:2847⟩
```

### Extended Context (Optional)

When more orientation is needed, ambient context can include:

```
⟨node:a7x2k3 depth:12 siblings:2⟩ ⟨permissions:aware,write,read⟩ ⟨human active in branch:8⟩
```

This adds current permissions and visibility of other active agents.

### Placement

Ambient metadata appears at the start of each turn, before conversation content. It's compact and consistent—the model doesn't have to think about it explicitly but can orient itself when needed.

---

## Tool Syntax

Tool calls use a minimal natural language syntax. Each tool call goes on its own line, prefixed with an arrow character:

```
→ view a7x2
→ annotate a7x2 "this is where the tone shifts"
→ continue from b3k9 n:3
```

The arrow (→) is the delimiter that signals "this line is an action." Everything after it is parsed as a command.

### Natural Language Flexibility

The syntax is deliberately loose and forgiving. These are equivalent:

```
→ view a7x2
→ view node a7x2
→ show a7x2
→ show me node a7x2
```

A lightweight classifier maps natural variations to canonical operations. The model doesn't have to remember exact syntax—it just has to be clear about intent.

### Batching

Multiple tool calls on consecutive lines are batched and executed together:

```
→ view a7x2
→ view b3k9
→ list a7x2 annotations
```

Results are returned together before the model continues generating.

### Tool Calls Are Not Persisted

Tool call lines are parsed and executed, not stored in conversation context. They appear in the action trace (a compressed log of operations) but don't consume context window space after execution.

---

## Tool Categories

### Navigation Tools

Tools for exploring and understanding tree structure.

### Content Tools

Tools for creating nodes, annotations, and links.

### Document Tools

Tools for reading and writing linked documents.

### Memory Tools

Tools for managing what stays in working context.

### Meta Tools

Tools for help, status, and self-reflection.

---

## Navigation Tools

### view

Inspect a node's content and metadata.

**Syntax:**
```
→ view [localId]
→ view [localId] full
→ view [localId] with-annotations
```

**Parameters:**
- `localId` — Required. The node's short identifier.
- `full` — Optional flag. Return complete content instead of summary.
- `with-annotations` — Optional flag. Include annotation content.

**Default Return:**
```
[a7x2] human · 3m ago · depth:7
"Marie's reluctance stems from her childhood, not the immediate conflict."

3 continuations · 1 annotation · 1 link
```

**Full Return:**
```
[a7x2] human · 3m ago · depth:7
The way I see it, Marie's reluctance stems from her childhood—specifically 
the summer her father left. The immediate conflict with Thomas is just 
triggering that old wound. She's not really angry at him; she's angry at 
the pattern repeating.

3 continuations · 1 annotation · 1 link
```

**With Annotations:**
```
[a7x2] human · 3m ago · depth:7
"Marie's reluctance stems from her childhood, not the immediate conflict."

Annotations:
  [ann-1] "Key turning point—character motivation established"
  [ann-2] "Revisit if branch 3 doesn't work out"

3 continuations · 1 link
```

---

### list

See what's connected to a node.

**Syntax:**
```
→ list [localId] continuations
→ list [localId] annotations
→ list [localId] links
```

**Parameters:**
- `localId` — Required. The node to inspect.
- What to list — Required. One of: `continuations`, `annotations`, `links`.

**Return (continuations):**
```
[a7x2] → 3 continuations:
  [b3k9] model · "Building on the childhood trauma theme..."
  [c4m2] model · "Alternative: What if Marie confronts Thomas directly..."
  [d5n7] human · "Actually, let's try a different angle..."
```

**Return (annotations):**
```
[a7x2] annotations:
  [ann-1] collaborator · "Key turning point—character motivation established"
  [ann-2] human · "Revisit if branch 3 doesn't work out"
```

**Return (links):**
```
[a7x2] links:
  → doc:"character notes" §motivation
  → [x9y3] in tree:"earlier draft" (note: "same scene, different approach")
```

---

### tree

Get an overview of tree structure.

**Syntax:**
```
→ tree
→ tree from:[localId] depth:[n]
→ tree summary
```

**Parameters:**
- `from` — Optional. Start from this node instead of root.
- `depth` — Optional. How many levels to show (default: 5).
- `summary` — Optional flag. Show condensed overview.

**Return (default):**
```
Tree: "Marie Character Study" (47 nodes, 6 branches)
Root [r001] → ... → [a7x2]* (you are here)
                    ├→ [b3k9] → [e6p4] → [f7q8] (leaf)
                    ├→ [c4m2] → [g8r2] (leaf)  
                    └→ [d5n7] (leaf)

* = current position
```

**Return (summary):**
```
Tree: "Marie Character Study"
47 nodes · 6 branches · 4 leaves
Main themes: character motivation, childhood trauma, relationship patterns
Last active: 3m ago
```

---

### switch

Move active context to a different node.

**Syntax:**
```
→ switch to [localId]
→ switch to [localId] in tree:[treeId]
```

**Parameters:**
- `localId` — Required. The node to switch to.
- `in tree` — Optional. For cross-tree navigation (requires permission).

**Return:**
```
✓ switched to [b3k9]
  depth:8 · 2 continuations · path: r001 → ... → a7x2 → b3k9
```

**Error (cross-tree without permission):**
```
✗ CROSS_TREE: node [x9y3] is in tree "earlier draft"
  hint: use → switch to x9y3 in tree:"earlier draft" (requires cross-tree permission)
```

---

## Content Tools

### continue

Generate new continuations by invoking the subject model.

**Syntax:**
```
→ continue
→ continue from [localId]
→ continue from [localId] n:[count] tokens:[max]
```

**Parameters:**
- `from` — Optional. Node to continue from (default: current position).
- `n` — Optional. Number of continuations to generate (default: 1, max: 10).
- `tokens` — Optional. Max tokens per continuation.

**Return:**
```
✓ generating 3 continuations from [a7x2]...
  [b3k9] "Taking the trauma angle further, we see Marie..."
  [c4m2] "What if we introduce a foil character who..."
  [d5n7] "Slowing down—let's sit in this moment and..."
```

**Notes:**
- Requires `loom_generate` permission.
- Uses the configured subject model, not the collaborator itself.
- Creates implicit branches when the source node already has continuations.

---

### respond

Add the collaborator's own content as a node.

**Syntax:**
```
→ respond [localId] "[content]"
→ respond [localId] "[content]" as:[edge_type]
```

**Parameters:**
- `localId` — Required. Node to respond to.
- `content` — Required. The content to add (in quotes).
- `as` — Optional. Edge type: `continuation` (default), `context`, `instruction`.

**Return:**
```
✓ created [e6p4] as continuation from [a7x2]
  switched to [e6p4]
```

**Notes:**
- Creates a node with the collaborator as author.
- Implicit branching if source already has continuations.
- Use `→ annotate` for annotation-type content.

---

### annotate

Add an annotation to a node.

**Syntax:**
```
→ annotate [localId] "[content]"
```

**Parameters:**
- `localId` — Required. Node to annotate.
- `content` — Required. The annotation text (in quotes).

**Return:**
```
✓ annotation [ann-3] added to [a7x2]
```

**Notes:**
- Annotations are excluded from subject model context by default.
- Visible to humans and loom-aware collaborators.
- Creates a node with annotation edge.

---

### link

Create a link between a node and another node, tree, or document.

**Syntax:**
```
→ link [localId] to [target]
→ link [localId] to [target] note:"[description]"
```

**Parameters:**
- `localId` — Required. Source node.
- `target` — Required. Target: another `localId`, `doc:"name"`, `tree:"name"`, or `tree:"name" node:[id]`.
- `note` — Optional. Description of the relationship.

**Return:**
```
✓ linked [a7x2] ↔ doc:"character notes"
```

**Notes:**
- Links are bidirectional references.
- Cross-tree links require appropriate permissions.

---

### edit

Create an edited version of a node (for Buffer Mode).

**Syntax:**
```
→ edit [localId] "[new_content]"
```

**Parameters:**
- `localId` — Required. Node to edit.
- `new_content` — Required. The revised content.

**Return:**
```
✓ created version [a7x2'] from [a7x2]
  downstream nodes preserved via hyperedge
```

**Notes:**
- Nodes are immutable; edit creates a version node with `editedFrom` relationship.
- See [Buffer Mode spec](./buffer-mode.md) for version node semantics.
- Downstream nodes are shared, not duplicated.

---

## Document Tools

### read

View a document's contents.

**Syntax:**
```
→ read doc:"[name]"
→ read doc:"[name]" summary
→ read doc:"[name]" lines:[start]-[end]
→ read doc:"[name]" section:[id]
```

**Parameters:**
- `doc` — Required. Document name or ID.
- `summary` — Optional flag. Return summary only.
- `lines` — Optional. Line range to return.
- `section` — Optional. Specific section identifier.

**Return (summary):**
```
doc:"character notes" (1,247 words · updated 2h ago)
"Background notes on Marie and Thomas, covering childhood history, 
relationship dynamics, and key character beats for Act 2."
```

**Return (full or section):**
```
doc:"character notes" §motivation

## Marie's Core Motivation

Her reluctance isn't about Thomas—it's about the pattern. Every significant 
relationship in her life has followed the same arc: trust, dependence, 
abandonment. Thomas represents safety, which is precisely why she's afraid.

Key beats:
- Summer 1987: Father leaves
- College: First serious relationship ends similarly
- Present: Thomas proposes, triggering the pattern
```

---

### write

Edit a document.

**Syntax:**
```
→ write doc:"[name]" append "[content]"
→ write doc:"[name]" at:[location] "[content]"
→ write doc:"[name]" replace:[section] "[content]"
```

**Parameters:**
- `doc` — Required. Document name or ID.
- `append` — Add to end of document.
- `at` — Insert at location (`start`, `end`, line number, or section).
- `replace` — Replace a section.
- `content` — Required. The content to write.

**Return:**
```
✓ appended to doc:"character notes" (now 1,312 words)
```

**Notes:**
- Requires `doc_write` permission.
- Document summary regenerates on next close.

---

## Memory Tools

### pin

Keep content in working memory across turns.

**Syntax:**
```
→ pin [localId]
→ pin doc:"[name]"
→ pin doc:"[name]" section:[id]
```

**Parameters:**
- Reference to pin — A node localId or document reference.

**Return:**
```
✓ pinned [a7x2] to working memory
```

**Notes:**
- Pinned content survives context pruning.
- Appears in operational memory block each turn.
- Use sparingly—pins consume context space.

---

### stash

Save content to medium-term memory, removed from active context.

**Syntax:**
```
→ stash "[label]" "[content]"
→ stash "[label]" content-of:[localId]
→ stash "[label]" summary-of:[range]
```

**Parameters:**
- `label` — Required. Name for later retrieval.
- `content` — The content to stash (literal, from node, or summarized range).

**Return:**
```
✓ stashed "marie insight" (47 tokens)
```

**Notes:**
- Stashed content is not in active context until recalled.
- Survives across turns.
- Useful for preserving insights without consuming context.

---

### recall

Retrieve stashed content back into working context.

**Syntax:**
```
→ recall "[label]"
```

**Parameters:**
- `label` — Required. The stash label.

**Return:**
```
✓ recalled "marie insight":
"Marie's reluctance stems from pattern recognition—she's seen this 
story before and knows how it ends. Her fear isn't of Thomas but 
of her own predictable response to safety."
```

---

### drop

Explicitly remove something from operational memory.

**Syntax:**
```
→ drop pin:[localId]
→ drop stash:"[label]"
```

**Parameters:**
- What to drop — A pinned reference or stash label.

**Return:**
```
✓ dropped pin [a7x2]
```

---

### memory

Review current operational memory state.

**Syntax:**
```
→ memory
→ memory trace
→ memory stashed
```

**Parameters:**
- `trace` — Optional. Show action history.
- `stashed` — Optional. Show stashed items.

**Return (default):**
```
Working Memory:
  pinned: [a7x2], [r001], doc:"character notes" §motivation
  stashed: "marie insight", "theme notes", "act 2 outline"

Context: 12,847 tokens used · 37,153 available
```

**Return (trace):**
```
Action Trace (last 10):
  → view a7x2
  → list a7x2 continuations
  → switch to b3k9
  → view b3k9 full
  → annotate b3k9 "promising direction"
  → pin b3k9
  → continue from b3k9 n:2
  → view c4m2
  → stash "alternative" content-of:c4m2
  → memory
```

---

## Meta Tools

### help

Get information about available tools.

**Syntax:**
```
→ help
→ help [tool_name]
```

**Return (overview):**
```
Available tools (your permissions: loom_aware, loom_write, doc_read):

Navigation: view, list, tree, switch
Content: respond, annotate, link, edit, continue*
Documents: read
Memory: pin, stash, recall, drop, memory
Meta: help, think

* requires loom_generate permission (you don't have this)

→ help [tool] for details on any tool
```

**Return (specific tool):**
```
→ help view

view — Inspect a node's content and metadata

Syntax:
  → view [localId]
  → view [localId] full
  → view [localId] with-annotations

Returns summary by default. Use 'full' for complete content.
```

---

### think

A scratchpad for reasoning, collapsed in UI and excluded from subject model context.

**Syntax:**
```
→ think
[multi-line content]
←
```

**Example:**
```
→ think
I notice the human seems stuck on this scene. The problem might be that 
the motivation for the character's choice isn't clear yet. I could:
1. Suggest exploring a branch where we see an earlier scene
2. Ask directly what they're trying to convey
3. Generate alternatives to see what resonates

Let me try option 3 first.
←
```

**Notes:**
- Everything between `→ think` and `←` is preserved in collaborator memory.
- Collapsed by default in UI (expandable).
- Excluded from subject model context.
- Useful for reasoning, planning, and self-reflection.

---

## Context Assembly for Loom-Aware Agents

This extends the base [Context Assembly spec](./context-assembly.md) for loom-aware agents.

### Assembly Order

```
[System prompt + loom-aware addendum]
[Operational memory block]
[Ambient metadata]
[Conversation context]
[Current turn input]
```

### Loom-Aware Addendum

Added to system prompt when `Agent.loomAware = true`:

```
You are operating in a loom-aware context. This means:

- You are located within a tree structure of branching conversations
- Metadata at the start of each message shows your current position
- You can navigate, inspect, annotate, and branch using tool commands
- Tool commands start with → on their own line
- You share this workspace with human collaborators

Your current permissions: [list permissions]
{{summary of toolset and point to help tool}}
```

### Operational Memory Block

Assembled from:
- Pinned content (nodes, documents, sections)
- Recalled stashes
- Recent action trace (compressed)

Format:
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

Loom awareness is modular. Capabilities are enabled per-agent:

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

When operating in Buffer Mode (creative writing with base models), behavior differs:

### Content Rendering

Buffer content is continuous prose with subtle node boundary markers:

```
The house stood empty at the end of the lane.︱She hadn't visited since her mother's death,︱› and the windows seemed to watch her approach.
```

- `︱` marks node boundaries
- `›` after boundary indicates model-generated content follows

### View Modes

```
→ view branch:b3k9 as:prose    (stitched together, natural reading)
→ view branch:b3k9 as:nodes    (separated with full metadata)
```

### Edit Creates Versions

In Buffer Mode, `→ edit` creates version nodes rather than branches:

```
→ edit a7x2 "revised content here"
✓ created version [a7x2'] from [a7x2]
  downstream nodes preserved via hyperedge
```

See [Buffer Mode spec](./buffer-mode.md) for complete semantics.

---

## Parallel Operation

Multiple agents can work on a loom tree simultaneously:

### Different Branches

Fully parallel. No coordination needed. Agents work independently.

### Same Branch

Turn-based. Only one agent can actively generate on a branch at a time. Others can read but not write until the active agent yields.

### Visibility

Agents can see when others are active:

```
⟨node:a7x2 depth:12 siblings:2⟩ ⟨human active in branch:c4m2⟩
```

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

## Onboarding

When loom-aware mode is first enabled for an agent, the system prompt includes orientation. See addendum earlier in this document.

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

### Tool Definitions for Provider APIs

When using provider tool-calling APIs (Anthropic, OpenAI), loom tools are registered as tool definitions:

```json
{
  "name": "loom_view",
  "description": "Inspect a node's content and metadata in the current loom tree",
  "input_schema": {
    "type": "object",
    "properties": {
      "localId": {
        "type": "string",
        "description": "The node's short identifier (e.g., 'a7x2')"
      },
      "full": {
        "type": "boolean",
        "description": "Return complete content instead of summary"
      },
      "withAnnotations": {
        "type": "boolean", 
        "description": "Include annotation content"
      }
    },
    "required": ["localId"]
  }
}
```

The `→ syntax` is an alternative input method that maps to these same tools. Models can use either the natural syntax or standard tool calls.

---

## Summary

The loom-aware system treats models as genuine collaborators. By giving models the same structural awareness and agency that humans have, we enable richer collaboration and create conditions for humans to observe and understand model behavior more clearly.

The design prioritizes:
- **Minimal friction** — Natural language tools, ambient metadata, embedded in reasoning flow
- **Context efficiency** — Summaries, explicit memory management, aggressive pruning
- **True parity** — Same operations available to humans and models
- **Transparency** — Action traces, visible thinking, clear error handling

This specification defines the MVP. Real-world use will reveal what works and what needs adjustment.
