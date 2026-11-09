# Aspen Grove — Build Plan (revised 2026-07-07)

> Milestone record for Beta 1, revised 2026-07-07 against a full audit of the codebase.
> **Scope is set by the project brief, which wins wherever this plan disagrees.** The scope
> sections below (divergences, v1, after v1) were brought in line with it in 2026-11.
>
> Audience: loom nerds, AI researchers, the cyborgism crowd, and newcomers who want a first real
> look at how models think. A loom, not a chat client and not a coding harness.

---

## Status Snapshot (2026-07-07)

What the original phased plan called for vs. what actually exists:

| Original phase | Status |
|---|---|
| 0 Foundation | ✅ Done except media/file-system abstraction (defer until multimodal nodes) |
| 1 Core Data Layer | ✅ Done for dialogue slice (WatermelonDB v7, 9 repo impls). Link/Document/LocalModel/TimestampCertificate interfaces removed as cut |
| 2 LLM Providers | ◐ **Diverged, deliberately**: OpenRouter + LM Studio implemented (streaming + raw capture). Anthropic/OpenAI native adapters skipped — OpenRouter covers them. No retry logic, no OpenRouter model catalog |
| 3 Basic UI | ◐ Tree list, dialogue view, settings exist. No node detail, no agent library UI |
| 4 Generation Flow | ✅ Done for dialogue (context assembly, n>1 continuations, streaming, provenance storage). ❌ No truncation/exclusion filtering |
| 5 Tree Ops | ◐ Edit + path switching + bookmark *toggle* done. No prune UI, no tags, no links, no search, no bookmarks browse, no export |
| 6 Loom-Aware | ❌ Not started |
| 7 Buffer Mode | ❌ Not started (spec complete) |
| 8 Voice | ❌ Not started. Hands-free voice mode cut; Latent Spaces-style character voices (read-aloud) are in v1 |
| 9 Summaries | ❌ Not started (only needed for loom tools, post-v1) |
| 10 Documents | ✂️ Cut (documents editor out of scope) |
| 11 Provenance | ◐ **Over-delivered early (good)**: hash-chain verification implemented, tested, runs live on every model turn. RFC 3161 and other extras cut |
| 12 Polish | ❌ Not started |

Also done, outside the original plan: **agent-centric pivot phases 1–3** (per-tree agents, tree-owned agents, agent-driven provider routing, pinned default agent — see `.dev/agent-centric-dialogue-settings.md`).

Hygiene: typecheck clean, eslint clean, 6 test suites green (core use cases + provenance verification).

---

## Deliberate divergences (now canon)

- **Providers = OpenRouter + LM Studio, only.** OpenRouter is the many-models gateway; LM Studio is the local provider. No native Anthropic or OpenAI adapters.
- **Provenance as it stands**: hash chains plus stored raw responses, verified live on every model turn and shown in the node detail sheet. RFC 3161 timestamps and other provenance extras are cut.
- **A loom, not a harness**: no agent harness or phone actions, no connectors, no web search, no MCP passthrough.
- **Local-first, bring your own keys, open source**: nothing depends on an Intrinsic Labs server. Sync, sharing/publishing platforms and hosted-inference revenue are cut.

---

## Milestone A — Finish the plumbing (before any new features) ✅ (2026-07-07)

**Goal**: everything already started gets finished or removed. No half-built layers under new construction.

### A1. Agent-centric pivot, phases 4–6 (from `.dev/agent-centric-dialogue-settings.md`) — *top priority* ✅
- [x] DialogueSettingsSheet: per-tree agent tweaks from the chat screen (shared-agent fork prompt: "edit shared" vs "customize for this tree") — `chat/dialogue-settings/`, spec in `docs/architecture/specs/dialogue-settings-ui.md`
- [x] Settings → Agents library: real CRUD (create/edit shared agents), replacing the "Agents (placeholder)" section — `settings/agents/` with editor sheet, templates, catalog picker
- [x] Settings → Connections section: OpenRouter key + LM Studio endpoint/token/auto-load **only** (the MCP toggle that shipped here has since been removed) — `settings/connections/` with "Test connection"
- [x] Removed ProviderPickerSection, singleton assistant helpers, and the implicit create-agent-on-settings-save hack
- [x] Wired `CreateSharedAgent`, `UpdateAgentConfiguration`, `ForkAgentForTree`, `UpdateTreeDefaultAgent`
- [x] Tree agent changeable after creation (chat ⚙️ → Switch agent)
- [x] `useSettingsController` split into `useConnectionsController` / `useAppearanceController` / `useAgentsLibraryController`; temperature dual-write gone

### A2. Context assembly hardening ✅
- [x] Exclusion filtering (pruned/excluded) — verified already present; covered by new tests
- [x] Truncation: `truncateMiddle` default + ~4 chars/token estimation + 1024-token response buffer + min 4 recent messages; system context never truncated (`application/services/context/`). `rollingWindow`/`stopAtLimit` are stubbed strategies for later
- [x] Agent `maxTokens`/`stopSequences` verified flowing end-to-end (was already plumbed; now tested). Note: per-model context window comes from `configuration.customParameters.maxContextTokens` when set, else a documented 128k default

### A3. Error handling & reliability ✅
- [x] `onSetUpError` captured via `persistence/watermelon/setup-error.ts` and surfaced through the AppBootstrapGate
- [x] Retry-with-backoff (`services/llm/retry.ts`): retryable errors only, max 2 retries, 500ms/1500ms, honors provider `retryAfterMs`; streaming retries only before the first chunk
- [x] `console.info` remnants stripped (chat controller, collect-completion, ephemeral-tree hook); startup orchestrator routes through `__DEV__`-gated `dev-log`
- [x] `jsi: true` kept intentionally on both platforms — watermelondb 0.28 supports Android JSI and falls back to the async dispatcher if JSI init fails

### A4. Model selection UX (plumbing half of it) ✅
- [x] `OpenRouterModelCatalog`: public catalog fetch, 24h cache in WatermelonDB LocalStorage, stale-on-error fallback
- [x] Unified picker data source (`useModelPickerData`) feeding the agent editor for both OpenRouter (searchable + custom ids) and LM Studio (live discovery)

---

## Milestone B — Loom UX to prototype parity ✅ (2026-07-08)

**Goal**: the dialogue surface earns the "mobile loom" title. Reference: Swift prototype + `docs/architecture/specs/loom-ui-rebuild-implementation-plan.md`. Functionality-first; visual polish only where it *is* the functionality.

- [x] **Inline continuation rail**: renders inside the message scrollview directly under the rail's source node (`ChatMessageList` hosts `ContinuationRail`, pushes content down)
- [x] Node tap affordances: single-tap toggles the rail for that node; inline caption under nodes with `Continuations: N` + bookmark + pruned indicators (`ChatRow` now carries `continuationCount`/`pruned`, batch edge lookup in `loadDialogueRowsForPath`)
- [x] **Node detail sheet** (`chat/node-detail/`): full text, metadata, generation info (provider/model/request id/latency/token usage from `rawApiResponseRepo.findByNodeId`), and a live provenance panel that runs `verifyModelNodeProvenance` per node — works for any model node, not just the latest turn. Replaces the `Alert.alert` Node Info
- [x] Continuation card single-tap = detail sheet (deferred past the double-tap window), double-tap = make current
- [x] Bookmarks browse: `BookmarksSheet` (prototype's BookmarkSheet shape) from a chat-header bookmark button; `nodeRepo.findBookmarked`, tap = rewind, Details = node detail sheet
- [x] Prune/restore in node context menu + detail sheet (`updateMetadata({ pruned })`); pruned rows render dimmed with caption
- [x] Design tokens: `theme.styles` merged into `loomUiTokens` (single source, values marked provisional — auto-extracted and drifted; reconcile against the Swift prototype in the design pass); `colors` prop-drilling removed, hook-only access
- [x] Dark-only for beta made explicit in `useAspenGroveTheme` (dead light palette removed; lives in git history)

**Explicitly deferred styling**: the "unique/out-there" cross-platform visual identity. Keep the current serif+mono dark vibe (it's already 70% of the prototype's feel); do the real design pass after beta feedback.

---

## Milestone C — What loom nerds need on day one ✅ (2026-07-08)

**Goal**: the features the audience needs first: import/export above all.

**Direction locked in during build**: Aspen Grove imports from *any* loom format (adapter registry), but exports *only* Open Loom (+ Markdown path for humans).

- [x] **Import/export** — elevated from a Phase-5 line item to a pillar:
  - [x] **Open Loom v2 spec authored** at `docs/open-loom/spec.md` — versioned, hypergraph-native (flat node map + explicit hyperedge list), multi-root, content-block unions, 3-tier provenance (descriptive/integrity/evidence), namespaced extensions. Informed by a survey of socketteer loom, Loomsidian, MiniLoom, ExoLoom, and the Swift prototype's v1
  - [x] Export tree as Open Loom JSON (full fidelity: nodes, edges, agents, hash chain, raw-response evidence, with privacy toggles) + export active path as Markdown — `application/services/open-loom/`, `ExportLoomTreeUseCase`, `ExportPathMarkdownUseCase`
  - [x] Import adapters: Open Loom v2, Open Loom v1 (Swift prototype), socketteer/loom (incl. bare-node leniency + `model_responses` provenance), Loomsidian (plugin data.json, multi-note). MiniLoom detected but deferred (needs diff-match-patch materialization). `ImportLoomTreeUseCase` re-mints ULIDs, recomputes local hashes, synthesizes roots for multi-root trees, rebuilds the active path
  - [x] Share sheet integration (expo-sharing/file-system/document-picker): export via chat header menu, import via tree-list header button
- [x] Search across trees (`nodeRepo.searchByContent` LIKE query; Search tab replaces the Documents placeholder tab; results grouped by tree, tap → node detail)
- [x] Tag repository impl (`WatermelonTagRepository`, schema v8 `tags`/`tag_assignments`) + minimal tag UI (chat menu → Tags sheet to assign/create; tree list filter chips)

Also shipped in this pass (user-requested):
- [x] Tree list sorted by most-recent message (`loom_trees.last_message_at`, touched by send/continuation use cases — metadata edits no longer reorder the list)
- [x] AI conversation titles: one extra call to the tree's agent model after the first response (`GenerateTreeTitleUseCase`), gated by new `UserPreferences.autoTitleEnabled` toggle (Settings → Behavior), only ever replaces default timestamp titles
- [x] Settings restructured from one flat scroll into a nested stack (Settings home → Agents / Connections / Typography / Behavior with native push/pop)
- [x] Schema v8 migration: `last_message_at`, `auto_title_enabled`, tag tables, index on `nodes.loom_tree_id`

---

## Milestone D — Beta ship (TestFlight + Play)

**Goal**: approvable builds, honest first-run experience.

- [x] Hide or replace the Documents placeholder tab (a visibly dead tab is a review-quality smell) — replaced with the Search tab in Milestone C
- [ ] First-run onboarding-lite: what a loom is (3 screens max), connect OpenRouter or LM Studio, create first tree. A static "what is this" screen is enough (the Field Guide is cut)
- [ ] Empty states (no API key, no trees, LM Studio unreachable) with actionable guidance
- [ ] Error-handling audit: every provider/DB failure has a user-visible, non-technical surface
- [ ] App icons, splash, store listings, screenshots
- [ ] Privacy policy + data disclosure (keys in Keychain/Keystore, all data local, gzip'd raw API responses on device)
- [ ] EAS build profiles, TestFlight + Play internal track submission
- [ ] Performance sanity pass on a large tree (500+ nodes): list virtualization, path-switch latency

**Beta 1 definition of done**: create tree → pick/configure agent → converse with branching → browse siblings inline → edit-as-branch → bookmark → view provenance → export → survives restart. On both platforms, against both OpenRouter and LM Studio.

---

## v1 (per the brief)

v1 is the Beta 1 loop above plus three things:

1. **Several continuations at once, compared side by side.** Today each generate call makes one continuation and siblings are browsed one rail at a time.
2. **Latent Spaces' character voices**: named voices that read nodes aloud, as in the Swift app (`~/dev/mobile/loom-swift`, `LoomVoice` / `SpeechSynthesizer`). Not a hands-free dictation loop.
3. **Latent Spaces' UI and UX brought over exactly** (`docs/architecture/specs/loom-swift-prototype-ui-transfer-audit.md`, `docs/architecture/specs/loom-ui-rebuild-implementation-plan.md`).

v1 ships against a written definition of done; scope arguments lose to it.

---

## After v1 (in order of interest)

1. **LoomDisplay**: the model draws ASCII animation frames; the first `→` model-ergonomic tool (`docs/architecture/specs/loom-tools/`; no LoomDisplay spec yet)
2. **Buffer mode with base models** (`docs/architecture/specs/buffer-mode.md`)
3. **Backrooms**: two agents on one tree, alternating turns, human observes and intervenes. Builds on the per-tree agent layer (agent plan Phase 7: `participatingAgentIds`)

Anything else (summaries, the wider loom-tools set) waits until one of these needs it.

---

## Dependency notes

- A must precede B's settings-adjacent work (B builds on the post-pivot settings/agent structure)
- A2 (truncation) and A3 (retry) are independent — parallelize freely
- C is independent of B except the share-sheet entry point
- D depends on A + B; C's import/export is strongly desired for beta but severable

---

## Standing invariants (from docs, unchanged)

- Nodes immutable; edits create nodes with `editedFrom`; edited nodes are always human-authored
- Raw response bytes hashed before parsing; provenance capture on every model node
- No global active provider — routing is per-agent `modelRef`
- Clean architecture, dependencies inward; boundaries enforced by eslint-plugin-boundaries
- Streamed deltas never hit the DB; persist once on completion/interruption
