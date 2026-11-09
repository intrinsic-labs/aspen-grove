# Creation & Collaboration Use Cases

> Working with models to produce meaningful output — writing, thinking, problem-solving.

---

## 2.1 Buffer Mode Writing

**Status**: after v1 (buffer mode with base models).

**Goal**: Write collaboratively with a model in a non-conversational format.

**Flow**:
1. User creates a new Loom Tree in Buffer Mode
2. User writes text (opening paragraph, story fragment, article intro, etc.)
3. User requests Continuation — model completes the text directly, streaming into the document
4. User edits inline, mixing their writing with model completions
5. Color/styling distinguishes human text from model text
6. At key decision points, user generates multiple Continuations (e.g., 3 different directions)
7. User navigates between branches, comparing directions
8. User pulls good ideas from different branches into the active line
9. Eventually, user settles on a final Path
10. User Exports the Path as Markdown

**Value**: Writing becomes exploration rather than commitment. Seamless co-authorship rather than turn-taking. Users can try risky directions knowing they can always backtrack.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware)

> For full Buffer Mode specification, see [Buffer Mode Spec](../architecture/specs/buffer-mode.md).

---

## 2.2 Collaborative Problem-Solving

**Goal**: Work through a complex problem with a model, keeping the alternatives.

**Flow**:
1. User creates a Loom Tree in Dialogue Mode describing the problem
2. Model offers an initial analysis or solution
3. User pushes back, asks clarifying questions, or requests alternatives
4. At key junctures, user generates several Continuations and compares where they lead
5. User Annotates or prunes dead ends
6. User converges on a solution along the successful Path

With character voices on, each response is read aloud in the chosen voice, which suits thinking on a walk.

**Value**: Complex problems rarely have one right answer. Branching lets users explore the solution space instead of getting stuck on the first idea.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware)

---

## 2.3 Iterative Refinement

**Goal**: Progressively improve a piece of content through model feedback.

**Flow**:
1. User creates a Loom with their draft content
2. User asks model for critique or suggestions
3. Model provides feedback
4. User Forks, incorporating some suggestions
5. User generates new critique on the revised version
6. Repeat, with each iteration as a new branch
7. User can Navigate back to compare versions
8. User Exports the final refined version

**Value**: Revision history is preserved and navigable. Users can see how the work evolved and revisit earlier stages.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware)

---

## 2.4 Multi-Model Collaboration

**Goal**: Leverage different models' strengths in a single creative process.

**Flow**:
1. User creates a Loom with multiple configured Agents (different models)
2. User starts with Model A for initial ideation (creative, divergent)
3. User switches to Model B for critique (analytical, precise)
4. User generates alternatives with Model C (different perspective)
5. Each Node is tagged with its generating Agent
6. User synthesizes the best elements by editing a node into a new branch

**Value**: Models have different strengths. Multi-model workflows let users compose those strengths intentionally.

**Agents Involved**: Human (Loom-Aware), Multiple Models (various Loom-Aware settings)

---

## Related Documentation

- [Domain Language: Interaction Modes](../domain-language/interaction-modes.md) — Buffer Mode, character voices
- [Domain Language: Agents](../domain-language/agents.md) — Agent abstraction
- [Buffer Mode Spec](../architecture/specs/buffer-mode.md) — Detailed Buffer Mode specification
- [Exploration & Study](./exploration-study.md) — Related use cases
