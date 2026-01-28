# Buffer Mode — Open Questions

> This document captures the questions that must be resolved to specify Buffer Mode's structural model. Buffer Mode is conceptually defined in [domain-language.md](../../domain-language.md#buffer-mode) but lacks implementation-level specification.

**Status**: Needs Resolution  
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

**Leaning toward**: A or B. Need to decide.

---

### Q2. How is authorship tracked within continuous text?

In Dialogue Mode, `Node.authorAgentId` identifies who wrote the node. In Buffer Mode with interleaved text, how do we know what the human wrote vs the model?

**Options**:

A. **Range-based tracking**: Node stores `textRanges: Array<{start: number, end: number, authorAgentId: string}>` mapping character ranges to authors.

B. **Inline markers**: Content contains invisible markers (like track changes). Fragile, complicates export.

C. **Separate nodes, visual continuity**: Each author's contribution is still a separate Node, but UI renders them as continuous text without message bubbles.

D. **Don't track granularly**: Node-level authorship only. Human text and model text in same node = "collaborative" authorship.

**Leaning toward**: A or C. Range-based is more powerful; separate nodes is simpler.

---

### Q3. How does branching work in Buffer Mode?

User is mid-document and wants to generate 3 alternative continuations. What happens?

**Sub-questions**:

- Where is the "branch point"? Current cursor position? End of document?
- Does branching create 3 complete document copies, or 3 continuation fragments?
- How does the UI represent branches in a continuous document view?

**Possible model**:

- Branch point = cursor position
- Content before cursor = shared ancestry (immutable)
- Content after cursor = branch-specific (each branch has its own continuation)
- UI shows branch indicator at branch point, user can switch branches

---

### Q4. How does editing work with immutability?

Nodes are immutable, but Buffer Mode implies fluid editing. How do we reconcile?

**Options**:

A. **Draft state**: Buffer has mutable "working content" that isn't a Node yet. Explicit action creates immutable Node(s).

B. **Edit = new branch**: Any edit after a Node is committed creates a new branch from before the edit point.

C. **Buffer Mode exception**: Buffer Mode Nodes are mutable until the tree is "finalized" or a branch is created.

D. **Operational transform**: Store edits as operations, not content. Content is derived. Complex.

**Leaning toward**: A. Clearest mental model — "draft until commit."

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

---

### Q6. How does provenance work for Buffer Mode?

Content hash computation assumes discrete, immutable content. With mutable drafts and interleaved authorship:

- When is the hash computed? At commit time?
- What about model-generated content mixed with human edits?
- Is `RawApiResponse` stored per-generation or per-committed-Node?

**Possible approach**: 

- Each model generation stores its `RawApiResponse` immediately
- When draft is committed to Node(s), hash is computed over final content
- Hash includes references to all `RawApiResponse` IDs that contributed to the Node

---

### Q7. How does context assembly work for Buffer Mode continuations?

When requesting a continuation in Buffer Mode:

- Is the entire document sent as context?
- Is there any system prompt or is it raw completion?
- How do we indicate "continue from here" vs "continue from end"?

---

## Proposed Mental Model

After considering these questions, here's a candidate mental model:

### Buffer as "Document with Generations"

1. A Buffer Mode Loom Tree has **Nodes representing checkpoints**, not messages
2. Between checkpoints, there's a **mutable working buffer**
3. The working buffer tracks **authorship ranges** (who wrote what)
4. **Generating continuations** from the working buffer:
   - Saves current state as a checkpoint Node (if not already saved)
   - Creates N sibling Nodes representing the continuations
   - Each continuation Node contains only the new text
   - UI stitches checkpoint + continuation for display
5. **Branching** = generating multiple continuations from same checkpoint
6. **Editing past content** = creating a new branch from that point
7. **Provenance** is tracked per-generation, linked to final Nodes at commit

### Visual Metaphor

```
[Root checkpoint]
      |
"Human writes intro paragraph"
      |
[Checkpoint 1] ← includes intro
      |
"Human writes more, requests 3 continuations"
      |
├── [Continuation A]
├── [Continuation B]  
└── [Continuation C]
      |
User picks B, continues writing
      |
[Checkpoint 2] ← includes B + new human text
```

---

## Next Steps

1. Review this document and decide on answers to Q1-Q7
2. Validate proposed mental model or iterate
3. Create formal [buffer-mode.md](./buffer-mode.md) specification based on decisions
4. Update [core-entities.md](../model/core-entities.md) with Buffer Mode content type if needed

---

## Discussion Notes

*(Space for capturing discussion outcomes)*