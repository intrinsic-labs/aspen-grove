# Buffer Mode — Open Questions

> This document captures the questions that must be resolved to specify Buffer Mode's structural model. Buffer Mode is conceptually defined in [domain-language.md](../../domain-language.md#buffer-mode) but lacks implementation-level specification.

**Status**: ✅ Resolved — See [buffer-mode.md](./buffer-mode.md)  
**Blocks**: Buffer Mode implementation  
**Related**: [C1 in review-findings.md](../review-findings.md#c1-buffer-mode-has-no-structural-model)

---

## Core Tension

Buffer Mode is described as:

> "A Loom Tree interaction style where there are no message boundaries — just continuous text."

But the current Node model assumes discrete units of content with clear authorship. These two concepts need reconciliation.

---

## Questions to Resolve

### Q1. What constitutes a Node in Buffer Mode?

In Dialogue Mode, a Node = one message. In Buffer Mode, what triggers Node creation?

**Options**:

A. **Generation-based**: Each model completion creates a new Node. Human edits accumulate until next generation.

B. **Checkpoint-based**: User explicitly "commits" content, creating a Node. Between commits, content is mutable draft state.

C. **Character/word-based**: Nodes created at fixed intervals (e.g., every N characters). Unlikely — feels arbitrary.

D. **Semantic-based**: Nodes created at paragraph or section boundaries. Complex to implement.

**✅ RESOLVED**: Option A (Generation-based). The working buffer (uncommitted human text) becomes a node when the user hits Generate. Model responses each become their own node. See [buffer-mode.md — Working Buffer Lifecycle](./buffer-mode.md#working-buffer-lifecycle).

---

### Q2. How is authorship tracked within continuous text?

In Dialogue Mode, `Node.authorAgentId` identifies who wrote the node. In Buffer Mode with interleaved text, how do we know what the human wrote vs the model?

**Options**:

A. **Range-based tracking**: Node stores `textRanges: Array<{start: number, end: number, authorAgentId: string}>` mapping character ranges to authors.

B. **Inline markers**: Content contains invisible markers (like track changes). Fragile, complicates export.

C. **Separate nodes, visual continuity**: Each author's contribution is still a separate Node, but UI renders them as continuous text without message bubbles.

D. **Don't track granularly**: Node-level authorship only. Human text and model text in same node = "collaborative" authorship.

**✅ RESOLVED**: Option C (Separate nodes, visual continuity). Each node has one author. Visual distinction via color: model text is colored (e.g., blue), human text is default. For edited model nodes, character-level diffing shows which parts the human changed (those become human-colored). See [buffer-mode.md — Visual Color Rules](./buffer-mode.md#visual-color-rules).

---

### Q3. How does branching work in Buffer Mode?

User is mid-document and wants to generate 3 alternative continuations. What happens?

**Sub-questions**:

- Where is the "branch point"? Current cursor position? End of document?
- Does branching create 3 complete document copies, or 3 continuation fragments?
- How does the UI represent branches in a continuous document view?

**✅ RESOLVED**: 
- Branch point = end of document (mid-document continuation is post-MVP)
- Branching creates N continuation *fragments* as sibling nodes, NOT complete document copies
- Working buffer is committed first, then N model responses become sibling children
- Switching siblings changes the entire downstream path

Key insight: **Branching** (generate alternatives) is distinct from **Editing** (modify existing content). See [buffer-mode.md — The Two Operations](./buffer-mode.md#the-two-operations).

---

### Q4. How does editing work with immutability?

Nodes are immutable, but Buffer Mode implies fluid editing. How do we reconcile?

**Options**:

A. **Draft state**: Buffer has mutable "working content" that isn't a Node yet. Explicit action creates immutable Node(s).

B. **Edit = new branch**: Any edit after a Node is committed creates a new branch from before the edit point.

C. **Buffer Mode exception**: Buffer Mode Nodes are mutable until the tree is "finalized" or a branch is created.

D. **Operational transform**: Store edits as operations, not content. Content is derived. Complex.

**✅ RESOLVED**: Hybrid of A and a refined version of B using hypergraph semantics.

- **Working buffer** (uncommitted tail of document) is mutable draft state — Option A
- **Editing committed nodes** creates a *version node* with `edited_from` relationship — NOT a traditional branch
- **Hyperedge magic**: Downstream nodes connect via hyperedge that accepts any version as source, so editing node 5 does NOT duplicate nodes 6-18
- Preserves immutability while enabling fluid editing feel

See [buffer-mode.md — Editing (Version Creation)](./buffer-mode.md#1-editing-version-creation) and [Path Resolution Logic](./buffer-mode.md#path-resolution-logic).

---

### Q5. What does the Node.content structure look like for Buffer Mode?

Assuming we need to track authorship ranges (Q2, Option A), the content structure might be:

```
{
  type: 'buffer',
  text: string,
  authorshipRanges: Array<{
    start: number,
    end: number,
    authorAgentId: string
  }>
}
```

Or do we reuse the existing `text` type and add authorship tracking at the Node level?

**✅ RESOLVED**: Reuse existing `text` type. No special Buffer Mode content structure needed.

- Each node has one author (tracked at node level, not range level)
- Buffer Mode adds one optional field: `editedFrom?: string` (NodeId of original if this is a version)
- Character-level authorship visualization is computed by diffing original vs edited content at render time

See [buffer-mode.md — Data Model Additions](./buffer-mode.md#data-model-additions).

---

### Q6. How does provenance work for Buffer Mode?

Content hash computation assumes discrete, immutable content. With mutable drafts and interleaved authorship:

- When is the hash computed? At commit time?
- What about model-generated content mixed with human edits?
- Is `RawApiResponse` stored per-generation or per-committed-Node?

**✅ RESOLVED**:

- Each model generation stores its `RawApiResponse` immediately, linked to created node(s)
- Hash is computed on commit (when node is persisted)
- Hash covers final content only (not edit history)
- Edit history preserved via `editedFrom` chain — original node retains its provenance
- Version nodes have their own content hash (of the edited content)

See [buffer-mode.md — Provenance in Buffer Mode](./buffer-mode.md#provenance-in-buffer-mode).

---

### Q7. How does context assembly work for Buffer Mode continuations?

When requesting a continuation in Buffer Mode:

- Is the entire document sent as context?
- Is there any system prompt or is it raw completion?
- How do we indicate "continue from here" vs "continue from end"?

**✅ RESOLVED**:

- Entire active path is concatenated + working buffer appended
- No system prompt by default (user can configure via Agent settings)
- MVP: continuation always appends at end (mid-document continuation is post-MVP)
- Path resolution determines which versions to use when nodes have been edited

See [buffer-mode.md — Context Assembly for Generation](./buffer-mode.md#context-assembly-for-generation).

---

## Proposed Mental Model — SUPERSEDED

> **Note**: This section has been superseded by the full specification in [buffer-mode.md](./buffer-mode.md). The key refinement from the original proposal: **editing creates version nodes (via `editedFrom` + hyperedge) that preserve downstream, NOT traditional branches that duplicate downstream nodes.**

See [buffer-mode.md — Versions vs Branches diagram](./buffer-mode.md#distinguishing-versions-vs-branches) for the final model.

---

## Next Steps

1. ~~Review this document and decide on answers to Q1-Q7~~ ✅ Done
2. ~~Validate proposed mental model or iterate~~ ✅ Done
3. ~~Create formal [buffer-mode.md](./buffer-mode.md) specification based on decisions~~ ✅ Done
4. Update [core-entities.md](../model/core-entities.md) with `editedFrom` field and hyperedge support
5. Implement Buffer Mode per specification

---

## Discussion Notes

**Key insight from design discussion**: Buffer Mode has TWO fundamentally different operations:

1. **Editing** — "Fix this paragraph in my current document"
   - Creates version node with `editedFrom` relationship
   - Downstream nodes stay attached via hyperedge (no duplication)
   - Path auto-updates to use new version

2. **Branching** — "Explore alternative continuations"  
   - Creates sibling nodes as children
   - Each sibling can have different downstream
   - Switching siblings switches entire downstream path

This distinction (inspired by discussion in the #loom Discord with Egr. antra) is what enables the "feels like a regular document" editing experience while preserving full branching/exploration capabilities.

The hypergraph model allows downstream nodes to connect to *any version* of an upstream node, avoiding the explosion of duplicate nodes that would occur in a traditional tree when editing early nodes.