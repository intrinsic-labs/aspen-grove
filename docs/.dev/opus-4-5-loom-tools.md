# Loom Aware System

## Vision

The loom aware system enables language models to operate as true collaborators within the loom workspace, with the same agency and capabilities as human users. Rather than being passive responders to prompts, a loom aware model can navigate the tree structure, inspect branches, create annotations, generate continuations, and manage its own working memory—all through a natural, low-friction interface.

The core principle is simple: **humans and models get access to the same tools.** Humans interact through a graphical interface optimized for touch and vision. Models interact through a minimal command syntax optimized for token efficiency and natural expression. Both are calling the same underlying operations on the same shared workspace.

This is not about making the model an assistant that proposes actions for human approval. It's about genuine collaborative agency, where human and model can work in parallel on different branches, leave annotations for each other, and build on each other's contributions.

---

## Goals

**Give models spatial/structural awareness.** Conversations aren't linear, but models typically experience them that way. Loom awareness means understanding that you're at a particular location in a tree, that other branches exist, that you can move around and explore. The tree becomes a navigable space, not just a scrolling history.

**Support genuine collaboration.** In the three-party creative writing setup (human + base model + instruct collaborator), each participant contributes different capabilities. The human provides creative direction and curation. The base model generates raw possibilities. The instruct model offers reflection, meta-awareness, navigation, and can create its own branches and timelines on the base model. The loom is the shared workspace where this collaboration unfolds.

**Enable careful observation.** The tree structure creates a record of collaborative cognition—where we branched, what alternatives we explored, how ideas evolved. This supports the broader goal of helping humans understand how models behave and think, rather than treating them as magic boxes.

**Reduce the prosthetic feeling of tool use.** Current tool-calling patterns feel clunky—structured JSON, explicit function signatures, stop-start execution. The loom aware system aims for something closer to peripheral awareness and natural action. Tools should feel like reaching for something, not filing a formal request.

**Manage context efficiently.** The first 50k tokens of context tend to be where models perform best. The system should maximize signal in that window by keeping tool calls minimal, summarizing aggressively, and giving models explicit control over what stays in working memory versus what gets stashed or dropped.

---

## Ambient Context

When loom aware mode is enabled for a model-backed agent, each message includes lightweight metadata about the current position in the tree. This creates peripheral awareness without requiring explicit queries.

The metadata appears at the start or end of each turn (test to determine optimal position):

```
⟨node:47 depth:12 siblings:2 annotations:1 links:1⟩
```

This tells the model:
- Current node ID (47)
- Depth in the tree (12 messages from root)
- Sibling branches at this node (2 alternatives exist)
- Annotations attached to this node (1)
- Links to other nodes or documents (1)

The format is compact and consistent. Over time, this becomes background awareness—the model doesn't have to think about it explicitly but can orient itself when needed.

For buffer mode content (creative writing with base models), the metadata might include:

```
⟨node:47 mode:buffer doc:"chapter 3" words:2847⟩
```

This signals that the current context is buffer-style prose rather than dialogue, and provides location within the document.

*Note from rocketbro here: node IDs are ULID - may want to come up with a local tree id that makes more sense to provide in this type of context. maybe something sequential or a combo of the branch number and node number for that branch. idk. open to thoughts here. full ULIDs everywhere seems like a waste of context and room for error.*

---

## Tool Syntax

Tool calls use a minimal natural language syntax. Each tool call goes on its own line, prefixed with an arrow character:

```
→ view 23
→ branch from 47
→ annotate 23 "this is where the tone shifts"
```

The arrow (→) is the delimiter that signals "this line is an action." Everything after it is parsed as a command.

The syntax is deliberately loose and forgiving. These are equivalent:

```
→ view node 23
→ view 23
→ show 23
→ show me node 23
```

A lightweight classifier (running on-device) maps natural variations to canonical operations. The model doesn't have to remember exact syntax—it just has to be clear about intent.

### Core Navigation Tools

**view [node_id] [options]**
Inspect a node's content and metadata.
```
→ view 23
→ view 23 summary
→ view 23 with-annotations
```
Options: `summary` (summary only), `full` (complete content), `with-annotations`, `with-links`

**list [node_id] [what]**
See what exists at a node.
```
→ list 47 continuations
→ list 47 annotations
→ list 23 links
```

**preview [node_id] [depth]**
Peek ahead into a branch without switching to it.
```
→ preview 47 depth:3
```
Shows summary of next N nodes down that branch.
*rocketbro: this doesn't really work because what do you do with continuations at each point in this chain? return summaries for all of them? that's fine but then this isn't branch peeking, it's tree peeking*

**tree [options]**
Get an overview of the current tree structure.
```
→ tree
→ tree from:20 depth:5
→ tree summary
```

### Content Tools

**branch [from_node] [edge_type]**
Create a new branch from a node.
```
→ branch from 47
→ branch from 47 as context
→ branch from 47 as instruction "respond more formally"
```
Edge types: `primary` (default), `context`, `instruction`

**continue [node_id] [options]**
Generate new continuations (invokes subject model if in collaborator role).
```
→ continue from 47
→ continue from 47 n:3 tokens:40
```

**annotate [node_id] [content]**
Add an annotation to a node. Annotations are excluded from subject model context by default.
```
→ annotate 47 "key turning point in the argument"
→ annotate 23 "consider returning here if the other branch dead-ends"
```

**link [source] [target] [note]**
Create a link between nodes, or between a node and a document.
```
→ link 47 to 23
→ link 47 to doc:"character notes"
→ link 47 to doc:"research" note:"supports the theory discussed here"
```

**edit [node_id] [content]**
Create an edited version of a node (nodes are immutable, so this creates a new node with an "edited from" relationship).
```
→ edit 47 "revised content here"
```

**switch [node_id]**
Move active context to a different node/branch.
```
→ switch to 23
→ switch to branch 8.2
```

### Document Tools

**read [doc_id] [options]**
View a document's contents.
```
→ read doc:"character notes"
→ read doc:"research" summary
→ read doc:"chapter 3" lines:1-50
```

**write [doc_id] [options]**
Edit a document (requires doc_write permission).
```
→ write doc:"notes" append "new insight about theme"
→ write doc:"notes" at:end "conclusion paragraph"
```

### Memory Tools

**pin [reference]**
Keep content in working memory across turns.
```
→ pin 47
→ pin doc:"character notes" section:2
```

**stash [label] [content]**
Save something to medium-term memory, removed from active context but retrievable.
```
→ stash "character arc insight" "Marie's reluctance stems from..."
→ stash "key reference" content-of:47
```

**recall [label]**
Retrieve stashed content back into working context.
```
→ recall "character arc insight"
```

**drop [reference]**
Explicitly forget something from operational memory.
```
→ drop lines:3-7
→ drop stash:"old notes"
```

**memory**
Review current operational memory state.
```
→ memory
→ memory trace (show action history)
→ memory stashed (show stashed items)
```

### Thinking Tool

**think [content]**
A scratchpad for reasoning that's collapsed by default in UI and excluded from subject model context.
```
→ think
I notice the human seems stuck on this scene. The problem might be that 
the motivation for the character's choice isn't clear yet. I could suggest 
exploring a branch where we see an earlier scene that establishes the 
motivation. Or I could ask directly what they're trying to convey.
←
```

The think block uses `→ think` to open and `←` to close. Everything inside is preserved in the collaborator's operational memory but doesn't clutter the shared conversation.

---

## Context Assembly

The intermediary layer assembles context for each model call from multiple sources:

### Components

1. **System prompt**
   Base system prompt plus loom-aware addendum (explains the environment, available tools, current permissions).

2. **Operational memory**
   - Action trace (dense log of recent actions)
   - Pinned content (explicitly kept in working memory)
   - Recalled stashes (pulled back from medium-term storage)

3. **Conversation context**
   The actual dialogue/content, pruned and managed for relevance.

4. **Ambient metadata**
   Current position in tree, nearby structure.

### Assembly order

```
[System prompt + loom-aware addendum]
[Operational memory block]
[Ambient metadata]
[Conversation context]
[Current turn input]
```

### Context management rules

**Default behaviors (no model call needed):**
- Tool call lines are parsed and executed, not persisted in conversation context
- Results under N tokens are shown ephemerally (visible this turn, fade next turn unless referenced)
- Results over N tokens are auto-summarized
- Each action appends a one-line entry to the action trace
- Content that the model quotes or explicitly references gets pinned automatically

**Pruning strategy:**
When context grows too long, the system:
1. Summarizes older portions of conversation
2. Compresses action trace (keeps recent, summarizes older)
3. Drops unpinned ephemeral content
4. Notifies model that pruning occurred

The model can preempt aggressive pruning by explicitly managing memory:
```
→ stash "early discussion" summary-of:12-34
→ drop lines:1-20
```

---

## Permissions

Loom awareness is modular. Different levels of capability can be enabled:

**loom_aware** (base level)
- See tree structure metadata
- Navigate and inspect nodes
- Use thinking tool

**loom_write**
- Create branches
- Add annotations  
- Create links
- Edit nodes

**loom_generate**
- Request continuations from subject models // rocketbro: can/should models be able to self-continue?
- Specify generation parameters

**doc_read**
- View linked documents

**doc_write**
- Edit documents

A research collaborator might have full permissions. A more constrained helper might only have loom_aware + doc_read.

---

## Buffer Mode Considerations

When the collaborator is viewing buffer mode content (creative writing with base models), the content is rendered as continuous prose with subtle boundary markers:

```
The house stood empty at the end of the lane. | She hadn't visited since her mother's death, |› and the windows seemed to watch her approach with something like reproach.
```

- `︱` marks node boundaries
- `›` after boundary indicates model-generated content follows
- No marker after boundary indicates human-written content follows

The collaborator can request buffer content in different views:
```
→ view branch:8 as:prose (stitched together, natural reading, as in above example)
→ view branch:8 as:nodes (separated with full metadata)
```

---

## Parallel Operation

Multiple agents can work on a loom tree simultaneously with these constraints:

**Different branches:** Fully parallel. No coordination needed. Agents can work independently, creating content, annotations, links.

**Same branch:** Turn-based. Only one agent can actively generate on a branch at a time. Others can read but not write until the active agent yields.

**Visibility:** Agents can see when another agent is active elsewhere in the tree:
```
⟨node:47 depth:12 siblings:2⟩ ⟨human active in branch:8.2⟩
```

**Merging:** When branches need to come together, either agent can create links or annotations that reference across branches. Actual branch merging is a human editorial decision and post MVP. For MVP, branches may be "merged" by copy-pasting node content as needed. 

---

## Error Handling

Invalid operations return structured but readable errors:

```
→ view 999
✗ node 999 does not exist

→ edit 47 "new content"
✗ permission denied: loom_write not enabled

→ switch to 23
✗ node 23 is in a different tree. use: → jump tree:7 node:23
```

Errors are logged to action trace. The model can inspect its own errors:
```
→ memory errors
```

---

## Onboarding

When loom_aware is first enabled for an agent, the system prompt includes an orientation (example; needs expansion):

```
You are now operating in a loom-aware context. This means:

- You are located within a tree structure of branching conversations/documents
- You can see where you are via metadata at the start of each message
- You can navigate, inspect, annotate, and create branches using tool commands
- Tool commands start with → on their own line
- You share this workspace with human collaborators who have the same capabilities

Your current location: node 47, depth 12, in tree "project-alpha"
Your permissions: loom_aware, loom_write, doc_read

Type → help for available commands.
```

---

## Summary

The loom aware system treats models as genuine collaborators rather than tools to be wielded. By giving models the same structural awareness and agency that humans have, we enable richer forms of collaboration—and create conditions for humans to observe and understand model behavior more clearly.

The design prioritizes:
- **Minimal friction:** Natural language tools, ambient metadata, less JSON ceremony
- **Context efficiency:** Aggressive summarization, explicit memory management, separation of concerns
- **True parity:** Same operations available to humans and models
- **Transparency:** Action traces, visible thinking, clear error handling

This is a starting point. Real-world implementation will reveal what works and what needs adjustment. The goal isn't a perfect spec—it's a coherent vision that can evolve through use.
