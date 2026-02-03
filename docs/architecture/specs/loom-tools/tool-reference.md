# Loom Tools Reference

> Complete tool definitions with syntax, parameters, return values, and examples.

**Parent**: [Loom-Aware Tools Specification](./README.md)

---

## Navigation Tools

Tools for exploring and understanding tree structure.

---

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

Tools for creating nodes, annotations, and links.

---

### continue

Generate new continuations by invoking the subject model.

**Syntax:**
```
→ continue
→ continue from [localId]
→ continue from [localId] n:[count] tokens:[max]
→ continue from [localId] using agent:"[agent_name]"
```

**Parameters:**
- `from` — Optional. Node to continue from (default: current position).
- `n` — Optional. Number of continuations to generate (default: 1, max: 10).
- `tokens` — Optional. Max tokens per continuation.
- `using agent` — Optional. Which agent to invoke (default: configured subject agent).

**Return:**
```
✓ generating 3 continuations from [a7x2]...
  [b3k9] "Taking the trauma angle further, we see Marie..."
  [c4m2] "What if we introduce a foil character who..."
  [d5n7] "Slowing down—let's sit in this moment and..."
```

**Return (with agent):**
```
✓ generating 2 continuations from [a7x2] using "GPT-4o"...
  [e6p4] "From GPT-4o's perspective, Marie's reluctance..."
  [f7q8] "An alternative reading suggests that Marie..."
```

**Notes:**
- Requires `loom_generate` permission.
- Defaults to the configured subject agent if `using agent` is not specified.
- Agent name must match a configured agent in the tree.
- Creates implicit branches when the source node already has continuations.
- Useful for comparative model study — generate from same node with different agents.

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

Create an edited version of a node. Behavior differs by tree mode.

**Syntax:**
```
→ edit [localId] "[new_content]"
```

**Parameters:**
- `localId` — Required. Node to edit.
- `new_content` — Required. The revised content.

**Return (Buffer Mode):**
```
✓ created version [a7x2'] from [a7x2]
  downstream nodes preserved via hyperedge
```

**Return (Dialogue Mode):**
```
✓ created branch [a7x2'] from [a7x2]
  conversation continues from edit point
```

**Notes:**
- Nodes are immutable; edit always creates a new node with `editedFrom` set to track lineage.
- **Dialogue Mode**: Edit creates a sibling node (traditional branch). Conversation continues from the edit point with separate downstream.
- **Buffer Mode**: Edit creates a version node. Downstream nodes are shared via hyperedge, not duplicated.
- See [Core Entities: Edit Lineage](../../model/core-entities.md#edit-lineage) for the general model.

---

### bookmark

Mark a node for easy retrieval.

**Syntax:**
```
→ bookmark [localId]
→ bookmark [localId] "[label]"
```

**Parameters:**
- `localId` — Required. Node to bookmark.
- `label` — Optional. Descriptive text for the bookmark.

**Return:**
```
✓ bookmarked [a7x2]
```

**Return (with label):**
```
✓ bookmarked [a7x2] as "key decision point"
```

**Notes:**
- Bookmarks persist across sessions.
- Bookmarked nodes show in per-node metadata.
- Use for marking important decision points, interesting responses, or navigation shortcuts.

---

### unbookmark

Remove a bookmark from a node.

**Syntax:**
```
→ unbookmark [localId]
```

**Parameters:**
- `localId` — Required. Node to unbookmark.

**Return:**
```
✓ unbookmarked [a7x2]
```

---

### prune

Mark a branch as pruned — hidden from default views but not deleted.

**Syntax:**
```
→ prune [localId]
```

**Parameters:**
- `localId` — Required. Node to prune (and all its descendants).

**Return:**
```
✓ pruned [a7x2] and 12 descendants
```

**Notes:**
- Pruned nodes are excluded from context assembly.
- Pruned branches can be restored.
- This is a soft delete — content is preserved.
- Use for hiding dead-end explorations or failed approaches.

---

### restore

Restore a pruned branch.

**Syntax:**
```
→ restore [localId]
```

**Parameters:**
- `localId` — Required. Pruned node to restore (and all its descendants).

**Return:**
```
✓ restored [a7x2] and 12 descendants
```

---

## Document Tools

Tools for reading and writing linked documents.

---

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

Tools for managing what stays in working context.

---

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

Tools for help and private reasoning.

---

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

### search

Search the web for current information.

**Syntax:**
```
→ search "[query]"
→ search "[query]" depth:[basic|deep]
→ search "[query]" topic:[general|news]
→ search "[query]" max:[n]
→ search "[query]" include:[domains] exclude:[domains]
```

**Parameters:**
- `query` — Required. The search query (in quotes).
- `depth` — Optional. `basic` (fast, snippets) or `deep` (full content extraction).
- `topic` — Optional. `general` (default) or `news`.
- `max` — Optional. Number of results (default: 5, max: 10).
- `include` / `exclude` — Optional. Comma-separated domains to prefer or exclude.

**Return:**
```
Search: "Marie character archetype literary analysis"
5 results (234ms)

[1] "Character Archetypes in Modern Fiction" — literarydevices.net
    "The reluctant hero archetype often manifests as characters who..."
    
[2] "Understanding Marie as a Literary Figure" — jstor.org
    "Marie represents the classic 'threshold guardian' archetype..."

[3] ...
```

**Return (deep):**
```
Search: "Marie character archetype literary analysis" (deep)
3 results (1,247ms)

## Result 1: Character Archetypes in Modern Fiction
Source: https://literarydevices.net/archetypes
Published: 2024-08-12

The reluctant hero archetype often manifests as characters who resist 
their calling. This resistance typically stems from...

---

## Result 2: ...
```

**Notes:**
- Requires web search API key (Tavily or Brave) configured in settings.
- `basic` depth returns snippets; `deep` extracts full page content.
- Results are formatted for context efficiency.
- See [Web Search Contract](../../contracts/web-search.md) for full specification.

---

## Tool Summary Table

| Tool | Permission | Purpose |
|------|------------|---------|
| `view` | loom_aware | Inspect node content/metadata |
| `list` | loom_aware | See node connections |
| `tree` | loom_aware | Overview of tree structure |
| `switch` | loom_aware | Move to different node |
| `continue` | loom_generate | Invoke subject model |
| `respond` | loom_write | Add own content as node |
| `annotate` | loom_write | Add annotation to node |
| `link` | loom_write | Create cross-references |
| `edit` | loom_write | Create edited node (version in Buffer, branch in Dialogue) |
| `bookmark` | loom_write | Mark node for easy retrieval |
| `unbookmark` | loom_write | Remove bookmark |
| `prune` | loom_write | Hide branch (soft delete) |
| `restore` | loom_write | Restore pruned branch |
| `read` | doc_read | View document contents |
| `write` | doc_write | Edit document |
| `pin` | loom_aware | Keep in working memory |
| `stash` | loom_aware | Save to medium-term memory |
| `recall` | loom_aware | Retrieve stashed content |
| `drop` | loom_aware | Remove from memory |
| `memory` | loom_aware | Review memory state |
| `help` | loom_aware | Tool documentation |
| `think` | loom_aware | Private reasoning scratchpad |
| `search` | loom_aware | Search the web |