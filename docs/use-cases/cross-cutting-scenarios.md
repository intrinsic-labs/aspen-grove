# Cross-Cutting Scenarios

> Workflows that combine patterns from Exploration & Study and Creation & Collaboration.

---

## 4.1 Research Project

**Goal**: Conduct a structured investigation into a model behavior or capability.

**Flow**:
1. User creates several Loom Trees to explore different aspects, tagged with a shared project tag
2. User uses [Branching Exploration](./exploration-study.md#11-branching-exploration) and [Comparative Model Study](./exploration-study.md#12-comparative-model-study) patterns
3. User records findings via [Behavioral Documentation](./exploration-study.md#14-behavioral-documentation): bookmarks, tags, annotations
4. User exports the trees as Open Loom so others can open the evidence in their own loom

**Patterns Combined**:
- Exploration & Study (1.1, 1.2, 1.4, 1.7)

**Value**: Exploration and its evidence stay together, and leave the app as open files.

---

## 4.2 Long-Form Writing Project

**Status**: after v1 (depends on Buffer Mode).

**Goal**: Write a substantial piece (article, story, essay) with model collaboration.

**Flow**:
1. User creates a Loom in Buffer Mode for drafting
2. User uses [Buffer Mode Writing](./creation-collaboration.md#21-buffer-mode-writing) to explore directions
3. User uses [Iterative Refinement](./creation-collaboration.md#23-iterative-refinement) to improve sections
4. User exports the final Path as Markdown

**Patterns Combined**:
- Creation & Collaboration (2.1, 2.3)

**Value**: The messy, non-linear process of writing is preserved and navigable. The final output is clean.

---

## 4.3 Model Onboarding

**Goal**: Get to know a new model's personality and capabilities.

**Flow**:
1. User creates an Agent backed by the new model (through OpenRouter or LM Studio)
2. User runs through a personal "interview" Loom Tree — standard questions they ask every model
3. User generates multiple Continuations to see response variance
4. User compares to other models' interviews ([Comparative Model Study](./exploration-study.md#12-comparative-model-study))
5. User records first impressions ([Behavioral Documentation](./exploration-study.md#14-behavioral-documentation))

**Character voices variant**: with a voice on, each response is read aloud, so the interview can happen on a walk. A relaxed way to get acquainted with a new model.

**Patterns Combined**:
- Exploration & Study (1.1, 1.2, 1.4)

**Value**: Getting to know models the way you would a person, rather than defaulting to whatever's hyped.

---

## Scenario Comparison

| Scenario | Primary Goal | Key Patterns | Output |
|----------|--------------|--------------|--------|
| Research Project | Investigate model behavior | Exploration + bookmarks/tags | Open Loom files |
| Long-Form Writing | Create substantial content | Buffer Mode + Refinement | Markdown |
| Model Onboarding | Learn a new model | Comparison + Documentation | Bookmarked, tagged trees |

---

## Related Documentation

- [Exploration & Study](./exploration-study.md) — Base exploration patterns
- [Creation & Collaboration](./creation-collaboration.md) — Base creation patterns
- [Domain Language: Interaction Modes](../domain-language/interaction-modes.md) — Buffer Mode, character voices
