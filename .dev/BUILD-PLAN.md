# Aspen Grove — Build Plan (revised 2026-07-07)

> Revised against `.dev/aspen-grove-goals.md` and a full audit of the codebase.
> Organizing principle: **ship a dialogue-mode loom I can use daily and put into TestFlight/Play beta**, then layer the differentiators (buffer mode, backrooms, import/export ecosystem, provenance UI) on top.
>
> Audience recalibration from goals doc: loom nerds / AI researchers / cyborgism crowd. Optimize for
> local-model support (LM Studio first-class), provenance as moat, import/export, and multimodal
> hypergraph trees — not for chasing general-consumer chat features.

---

## Status Snapshot (2026-07-07)

What the original phased plan called for vs. what actually exists:

| Original phase | Status |
|---|---|
| 0 Foundation | ✅ Done except media/file-system abstraction (defer until multimodal nodes) |
| 1 Core Data Layer | ✅ Done for dialogue slice (WatermelonDB v7, 9 repo impls). ❌ Tag/Link/Document/LocalModel/TimestampCertificate repos are interface-only |
| 2 LLM Providers | ◐ **Diverged, deliberately**: OpenRouter + LM Studio implemented (streaming + raw capture). Anthropic/OpenAI native adapters skipped — OpenRouter covers them. No retry logic, no OpenRouter model catalog |
| 3 Basic UI | ◐ Tree list, dialogue view, settings exist. No node detail, no agent library UI |
| 4 Generation Flow | ✅ Done for dialogue (context assembly, n>1 continuations, streaming, provenance storage). ❌ No truncation/exclusion filtering |
| 5 Tree Ops | ◐ Edit + path switching + bookmark *toggle* done. No prune UI, no tags, no links, no search, no bookmarks browse, no export |
| 6 Loom-Aware | ❌ Not started |
| 7 Buffer Mode | ❌ Not started (spec complete) |
| 8 Voice | ❌ Not started |
| 9 Summaries | ❌ Not started |
| 10 Documents | ❌ Placeholder tab only |
| 11 Provenance | ◐ **Over-delivered early (good)**: hash-chain verification implemented, tested, runs live on every model turn. ❌ No UI surface, no RFC 3161 |
| 12 Polish | ❌ Not started |

Also done, outside the original plan: **agent-centric pivot phases 1–3** (per-tree agents, tree-owned agents, agent-driven provider routing, pinned default agent — see `.dev/agent-centric-dialogue-settings.md`).

Hygiene: typecheck clean, eslint clean, 6 test suites green (core use cases + provenance verification).

---

## Deliberate divergences (now canon)

- **Providers = OpenRouter + LM Studio** for beta. OpenRouter is the many-models gateway; LM Studio is the first-class local provider (aligned with goals: local/self-hosted emphasis). Native Anthropic/OpenAI adapters are **post-beta, if ever**. Ollama adapter is post-beta (cheap: reuse LM Studio's OpenAI-compat path).
- **Provenance-first** was the right instinct — goals doc names provenance a product moat. Verification service is done; the *visible* part (node detail provenance view) moves into Beta 1.
- **Mobile agent harness / phone-actions**: cut, per goals doc ("I'm not building OpenClaw"). What survives is what already exists: LM Studio's server-side MCP passthrough (`useMcpTools`). No client-side tool execution, no iOS Shortcuts bridge.

---

## Milestone A — Finish the plumbing (before any new features)

**Goal**: everything already started gets finished or removed. No half-built layers under new construction.

### A1. Agent-centric pivot, phases 4–6 (from `.dev/agent-centric-dialogue-settings.md`) — *top priority*
- [ ] DialogueSettingsSheet: per-tree agent tweaks from the chat screen (shared-agent fork prompt: "edit shared" vs "customize for this tree")
- [ ] Settings → Agents library: real CRUD (create/edit shared agents), replacing the "Agents (placeholder)" section
- [ ] Settings → Connections section: OpenRouter key + LM Studio endpoint/token/MCP/auto-load **only** — provider connection config, nothing agent-shaped
- [ ] Remove ProviderPickerSection, `upsertOpenRouterAssistantAgent`/`upsertLMStudioAssistantAgent` singleton helpers, and the implicit create-agent-on-settings-save hack (`useSettingsController.ts` TODO)
- [ ] Wire the already-built use cases: `CreateSharedAgent`, `UpdateAgentConfiguration`, `ForkAgentForTree`, `UpdateTreeDefaultAgent`
- [ ] Tree agent is changeable after creation (agent picker on tree; `LoomTreeListView` TODO)
- [ ] Slim `useSettingsController` (634 lines, ~20 useStates) — split per section; kill the temperature dual-write (agent config vs userPreferences)

### A2. Context assembly hardening
- [ ] Exclusion filtering (pruned/excluded metadata) in `assemble-dialogue-context`
- [ ] Truncation: `truncateMiddle` default + token estimation + response buffer (per `docs/architecture/specs/context-assembly.md`). Unbounded context is a daily-use blocker on long trees
- [ ] Respect agent `maxTokens`/`stopSequences` end-to-end

### A3. Error handling & reliability
- [ ] `onSetUpError` in the Watermelon adapter: surface DB setup failure to the user (currently silent empty handler)
- [ ] Retry-with-backoff for `retryable` provider errors (the flag is plumbed everywhere and used nowhere)
- [ ] Strip/gate `console.info` debug remnants (chat controller, collect-completion, startup orchestrator)
- [ ] Resolve hardcoded `jsi: true` (platform guard is commented out — verify on Android or restore the guard)

### A4. Model selection UX (plumbing half of it)
- [ ] OpenRouter model catalog fetch + 24h cache (`ModelCatalogService` per contract) — free-text model IDs are hostile to beta users
- [ ] LM Studio model list already works; unify both behind one picker data source

---

## Milestone B — Loom UX to prototype parity

**Goal**: the dialogue surface earns the "mobile loom" title. Reference: Swift prototype + `docs/architecture/specs/loom-ui-rebuild-implementation-plan.md`. Functionality-first; visual polish only where it *is* the functionality.

- [ ] **Inline continuation rail**: rail renders inside the message scrollview directly under the tapped node (pushes content down), not as a fixed band above the composer. This is the prototype's defining interaction and the plan's Phase 2 — currently violated
- [ ] Node tap affordances: single-tap opens/clears rail; inline `Continuations: N` caption + bookmark indicator under nodes (currently the wrapping Pressable has no onPress)
- [ ] **Node detail sheet** (replaces `Alert.alert` Node Info): metadata, author/model, editedFrom, **provenance panel** (hash-chain status, request id, token usage — the data is already returned by `SendDialogueTurnUseCase` and dumped to console today)
- [ ] Continuation card single-tap = preview/detail sheet, double-tap = make current (spec gestures; today all paths collapse to `rewindToNode`)
- [ ] Bookmarks browse screen (toggle exists; nowhere to see them — prototype had BookmarkSheet)
- [ ] Prune/restore actions in node menu (schema columns already exist)
- [ ] **Consolidate design tokens**: one source of truth (merge `loomUiTokens` vs `theme.styles` duplicates; reconcile drifted values against the transfer audit doc); one theme-access pattern (hook, not prop-drilling)
- [ ] Decide dark-only vs restoring light mode (`isDark = true` is hardcoded; light palette is authored but dead — for beta, shipping dark-only is fine, just make it explicit)

**Explicitly deferred styling**: the "unique/out-there" cross-platform visual identity. Keep the current serif+mono dark vibe (it's already 70% of the prototype's feel); do the real design pass after beta feedback.

---

## Milestone C — What loom nerds need on day one

**Goal**: the features the goals doc calls "paramount" for the actual audience.

- [ ] **Import/export** — elevated from a Phase-5 line item to a pillar:
  - [ ] Export tree as JSON (full fidelity: nodes, edges, provenance) + export active path as Markdown
  - [ ] Import from common loom formats (research what the community actually uses — old Swift prototype had OpenLoom import/export to crib from at `/Users/asherpope/dev/ai/Loom`)
  - [ ] Share sheet integration
- [ ] Search across trees (full-text over node content; simple LIKE query is fine for v1)
- [ ] Tag repository impl + minimal tag/filter UI (schema + interfaces exist) — *beta-optional, cut first if squeezed*

---

## Milestone D — Beta ship (TestFlight + Play)

**Goal**: approvable builds, honest first-run experience.

- [ ] Hide or replace the Documents placeholder tab (a visibly dead tab is a review-quality smell)
- [ ] First-run onboarding-lite: what a loom is (3 screens max), connect OpenRouter or LM Studio, create first tree. The full Field Guide (Sanity CMS) stays post-beta; a static "what is this" screen is enough
- [ ] Empty states (no API key, no trees, LM Studio unreachable) with actionable guidance
- [ ] Error-handling audit: every provider/DB failure has a user-visible, non-technical surface
- [ ] App icons, splash, store listings, screenshots
- [ ] Privacy policy + data disclosure (keys in Keychain/Keystore, all data local, gzip'd raw API responses on device)
- [ ] EAS build profiles, TestFlight + Play internal track submission
- [ ] Performance sanity pass on a large tree (500+ nodes): list virtualization, path-switch latency

**Beta 1 definition of done**: create tree → pick/configure agent → converse with branching → browse siblings inline → edit-as-branch → bookmark → view provenance → export → survives restart. On both platforms, against both OpenRouter and LM Studio.

---

## Post-beta ladder (rough order)

1. **Buffer Mode** (`docs/architecture/specs/buffer-mode.md`) — spec complete; core of the "notes a base model can continue" pillar. Biggest single chunk remaining
2. **Backrooms / multi-agent trees** — two agents on one tree, alternating turns, human observes/intervenes. Builds directly on the per-tree agent layer (agent plan Phase 7: `participatingAgentIds`). Cheap-ish and highly differentiating — promote into beta 2 if momentum is good
3. **Documents & knowledge layer** (Phase 10) — block editor, node/tree embeds, links. Repo interfaces exist
4. **Summaries** (Phase 9) — needed before loom-aware tools; also improves long-tree context
5. **Loom-aware tools** (Phase 6, `docs/architecture/specs/loom-tools/`) — the two-role collaborator pattern; depends on summaries + tree ops
6. **Provenance completion** — RFC 3161 timestamps + verification UI polish (hash chains already live)
7. **Voice Mode** (Phase 8) — deprioritized: not mentioned in goals doc; revisit after beta feedback
8. **Ollama adapter**; native Anthropic/OpenAI adapters only if users demand them
9. **Sync subscription** (E2EE device sync, Obsidian-style) — the monetization candidate; needs backend decision (deferred per docs review)
10. **Publishing/sharing platform** ("LessWrong for looms", Intrinsic Labs-curated) — separate product; needs market research first
11. **Interp/latent-space mapping experiments** — the long-tail moat features; design after real usage

---

## Dependency notes

- A must precede B's settings-adjacent work (B builds on the post-pivot settings/agent structure)
- A2 (truncation) and A3 (retry) are independent — parallelize freely
- C is independent of B except the share-sheet entry point
- D depends on A + B; C's import/export is strongly desired for beta but severable
- Post-beta items 1, 2, 3 are mutually independent; 5 depends on 4

---

## Standing invariants (from docs, unchanged)

- Nodes immutable; edits create nodes with `editedFrom`; edited nodes are always human-authored
- Raw response bytes hashed before parsing; provenance capture on every model node
- No global active provider — routing is per-agent `modelRef`
- Clean architecture, dependencies inward; boundaries enforced by eslint-plugin-boundaries
- Streamed deltas never hit the DB; persist once on completion/interruption
