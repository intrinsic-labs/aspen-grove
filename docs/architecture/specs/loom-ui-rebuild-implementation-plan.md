# Loom UI Rebuild Plan (RN, Prototype-Parity First)

Status: Proposed  
Owner: Interface layer  
Scope: Dialogue mode UI + related settings UI, backed by existing application/domain logic

## Goals
- Recreate the proven Loom prototype interaction model in RN.
- Keep current improved backend/use-case architecture as source of truth.
- Deliver in small, testable slices with frequent device verification.

## Non-Goals
- No reintroduction of legacy Swift traversal internals.
- No buffering/truncation strategy work in this plan.
- No major redesign beyond prototype parity in this phase.

## Guardrails
- Keep files small and concern-focused.
- Put all visual tokens in one shared token layer.
- Use native context menus (already adopted) for long-press actions.
- Keep parity with streaming + partial-persist behavior already implemented.

## Phase 0: Token System Alignment

### Deliverables
- Add a `loomUiTokens` module in RN UI layer for:
  - colors (including `#6CBA78`, warm accent `#C7B686`)
  - spacing/radius constants
  - typography presets and size offsets
- Replace local literals in dialogue components with token references.

### Notes
- Preserve current app theme system, but allow this prototype token pack to be swapped at one boundary.

### Acceptance
- No hard-coded spacing/radius/color values left in dialogue/rail/composer components except one-off edge cases.

## Phase 1: Main Dialogue Surface Parity

### Deliverables
- Main chat stream styling parity:
  - assistant full-width plain text (no bubble)
  - user messages in configurable style (filled/outlined), no author labels
- Message row spacing and sizing aligned to prototype constants.
- Keep streaming UX behavior currently working:
  - immediate user append
  - streaming assistant text row
  - auto-scroll lock while user manually scrolls

### Acceptance
- Visual parity for baseline chat rows and composer in dark mode screenshots.
- No regression in keyboard behavior and streaming behavior on iOS + Android.

## Phase 2: Inline Continuation Rail Parity

### Deliverables
- Continuation rail remains inline inside the same scrollview.
- Rail opens directly below selected node and pushes lower content down.
- Cards show:
  - model label
  - `[N]` count
  - green on-branch indicator
  - preview excerpt
- Gestures:
  - tap to preview/focus card
  - double tap make current
  - long press native menu

### Acceptance
- On device, while rail is open, user can read continuation previews and still browse current path content in the same scroll container.
- Scroll range recomputes correctly when rail opens/closes.

## Phase 3: Node Detail / Continuation Detail Surfaces

### Deliverables
- Add node detail surface matching prototype behavior:
  - full text view
  - metadata header
  - menu actions (copy, rewind/make-current, bookmark, edit where relevant)
- Reuse this for continuation detail where practical.

### Acceptance
- From both main node and continuation card flows, detail surface actions behave identically and update current path UI correctly.

## Phase 4: Settings Surface Parity (High-Impact Controls)

### Deliverables
- Align settings sections to prototype structure:
  - provider/model/default generation controls
  - system prompt in generation defaults
  - UI controls (font, size, message style, corner radius, verbose errors)
- Keep autosave behavior.
- Ensure keyboard toolbar Done behavior works for text fields/editors.

### Acceptance
- Settings values immediately reflect in dialogue UI without restart.
- iOS/Android keyboard interaction is stable for all editable settings fields.

## Phase 5: Code Block Parsing + Highlighting Upgrade

### Deliverables
- Replace fence parsing logic to support optional language tag:
  - ` ```language ... ``` `
  - ` ``` ... ``` `
- Add configurable fallback language with default `plaintext`.
- Keep horizontal scroll and text selection for code blocks.
- Keep non-code text rendering clean in mixed content.

### Acceptance
- Untagged fenced code blocks render in code style.
- Tagged blocks use requested language when supported.
- No dropped text between mixed text/code segments.

## Phase 6: QA + Snapshot Parity Pass

### Deliverables
- Build side-by-side screenshot checklist vs prototype references.
- Validate on iOS and Android:
  - long-press menus
  - rail open/close and interactions
  - edit/regenerate/rewind flows
  - streaming + partial interruption persistence
  - keyboard and scroll edge cases

### Acceptance
- All checklist items pass on device.
- No critical regressions in existing path/provenance flows.

## Proposed Execution Order
1. Phase 0  
2. Phase 1  
3. Phase 2  
4. Phase 3  
5. Phase 5  
6. Phase 4  
7. Phase 6

Rationale:
- Lock visual/interaction core first (chat + rail + node controls).
- Add code block behavior before final settings polish to reduce iteration churn in chat rendering.

## Implementation Notes
- Keep controller hooks focused:
  - one hook for main chat session orchestration
  - one hook for continuation rail state
  - one hook for detail/edit state
- Keep presentational components stateless where possible.
- Prefer one-way data flow:
  - use-case invocation in hooks
  - UI components receive derived DTOs only.

## Current Starting Point
- Native context menus: implemented.
- Edit action plumbing: implemented.
- Continuation rail baseline: implemented.
- Streaming baseline with partial-save policy: implemented.

This plan focuses on bringing these pieces to full prototype-level parity in behavior and visual rhythm.
