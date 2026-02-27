# Loom Swift Prototype UI Transfer Audit

## Purpose
This document captures the concrete UI/interaction choices used in the Swift prototype at:

- `/Users/asherpope/dev/ai/Loom`

It is intended as a transfer reference for parity work in React Native.

## Source Files Audited
Primary files reviewed:

- `/Users/asherpope/dev/ai/Loom/Loom/presentation/components/AppColors.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/components/LoomFont.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/components/MessageField.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/loom tree views/MessageInputView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/loom tree views/LoomTreeView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/loom tree views/LoomTreeContentView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/loom tree views/NodeView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/loom tree views/ChildNodesView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/loom tree views/ChildNodeView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/loom tree views/NodeSheetView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/home screen/SampleNodeView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/home screen/LoomSettingsView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/home screen/HomeScreenView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/hightlighting/CodeBlockView.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/presentation/hightlighting/ContentParser.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/data/SwiftData/LoomTree.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/data/SwiftData/Node.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/LoomApp.swift`
- `/Users/asherpope/dev/ai/Loom/Loom/Assets.xcassets/AccentColor.colorset/Contents.json`

## Design Tokens Extracted

### Colors
- Accent green: `#6CBA78` (`AppColors.green`).
- Accent color asset (used by `.accent` / `.tint(.accentColor)`):
  - Display P3 `(r: 0.780, g: 0.714, b: 0.525)` approx `#C7B686`.
- Voice accent colors:
  - Jefferson: `#A1CDFF`
  - Lily: `#FFACD0`
  - Eve: `AppColors.green` (`#6CBA78`)

Dynamic/system colors used heavily:
- Background inversion:
  - `AppColors.oppositePrimary(.dark) -> black`
  - `AppColors.oppositePrimary(.light) -> white`
- Message text:
  - Primary text: `Color.primary.opacity(0.9)`
  - System message text: `Color.primary.opacity(0.6)`
- Surface tints/material:
  - User bubble fill: `.ultraThickMaterial` (filled mode)
  - Composer/input fill: `.thinMaterial`
  - Focus ring: `AppColors.green`
- Rail/child card:
  - Child preview background: `Color.orange.saturation(0.3)`
  - On-branch indicator check: `AppColors.green`

### Typography
Supported families:
- `Calling Code Regular`
- `VT220`
- `Cardo`
- `System`
- Display heading font used in several views: `Neue Montreal Bold`

Default typography behavior (`loadLoomFont`):
- Base size from `UserDefaults[StorageKey.fontSize]`.
- Defaults:
  - `fontSize = 17`
  - `loomFont = Cardo`
- Per-family size adjustments:
  - Calling Code: `size`
  - VT220: `size + 2` (with `.leading(.loose)`)
  - Cardo: `size + 1.2`
  - System: `size`

Concrete sizes used in UI:
- Home list row title: Calling Code `18`
- Date header title: Neue Montreal Bold `46`
- App title: Neue Montreal Bold `50`
- Onboarding title (tree): Neue Montreal Bold `40`
- Onboarding subtitle (tree): Calling Code `22`
- Rail hint text: Calling Code `14`
- Thinking indicator: Calling Code `16`
- API key hero text: Cardo `28`

### Spacing / Radius / Layout Constants
Composer/input:
- Composer container corner radius: `20`
- Text field paddings:
  - Vertical: `12`
  - Leading: `16`
- Send button padding: `10` (vertical + horizontal)
- Outer composer padding: `8`
- Focus stroke width: `1` only when focused

Message rows:
- Horizontal padding for rows: `12`
- User bubble inner padding: `8`
- Right/left spacer for user alignment: fixed width `65`
- Extra bottom padding for current node row: `16`

Continuations rail:
- Rail card width: `275`
- Rail card corner radius: `4`
- Rail card text line limit: `7`
- Rail card spacing: horizontal `22`
- Rail instruction top/horizontal padding
- Rail bottom spacing: `18`
- Divider bottom spacing after rail: `22`

Code blocks:
- Outer block spacing between text/code chunks: `12`
- Block wrapper padding: `8`
- Code snippet internal padding: default `.padding()` (16)
- Code snippet background: rounded rectangle with corner radius from `StorageKey.messageCornerRadius` (default `8`)

Settings/form behaviors:
- `fontSize` picker range: `12...26`
- `messageCornerRadius` picker values: even numbers `0...20`
- Temperature sliders:
  - New-tree defaults: `0...1`, step `0.1`
  - Per-tree model settings: `0...1`, step `0.1`
- Max tokens sliders:
  - New-tree defaults: `1...4096`, step `1`
  - Per-tree model settings: `1...maxModelTokens`, step `1`

## Interaction Model Extracted

### Node row interactions (main dialogue)
From `NodeView`:
- Single tap:
  - Clears continuation rail if this node is active in rail.
  - Stops speaking if TTS is active.
- Double tap:
  - Speaks node text (voice mode/TTS).
- Long press:
  - Opens native context menu with:
    - Regenerate Response
    - Continuations
    - Rewind To Node
    - Copy Text
    - Node Info
    - Bookmark / Remove Bookmark

### Continuation rail behavior
From `NodeView + ChildNodesView + ChildNodeView`:
- Rail appears inline below the tapped node.
- Rail is rendered **inside the same vertical scrollview** as chat content.
- Opening rail inserts layout below the selected node, pushes lower content downward, and causes scroll content size to recompute.
- This allows users to inspect continuation previews while still browsing the current path context above/below.
- Rail source is `node.children` sorted by `createdTime`.
- Each rail card shows:
  - `modelId`
  - On-branch count as `[N]` (continuation depth/count indicator)
  - Optional green check if card is on the current branch
  - Truncated preview (line-limited content).
- Card interactions:
  - Tap: open expanded sheet for full node.
  - Double tap: make that continuation current (`tree.currentNode = child`).
  - Long press: native context menu with:
    - Make Current Node
    - Retrace Branch
    - Copy Text
    - Bookmark

### Branch semantics note (for RN parity work)
- Do not port the prototype's internal branch-memory implementation details.
- Preserve only the UX contract:
  - user can make any continuation current
  - retrace returns the active path through the selected continuation
  - on-branch indicator and `[N]` count are computed from current path state
- In Aspen Grove RN, use the current path/tree model and use cases as the source of truth.

### Regenerate behavior
From `LoomTreeContentView` regeneration closure:
- Regenerate sets current node to selected source node before fetching.
- Reloads visible messages immediately.
- Then appends fresh assistant continuation.
- This is the behavior to match for “clear old sibling immediately”.

### Streaming and partial failure behavior
From `LoomTreeView.handleIncompleteApiCall`:
- If interrupted assistant node has empty text: delete it.
- If interrupted assistant node has any text: keep it.

### Keyboard and scroll behavior
From `LoomTreeContentView` and parent views:
- Main conversation scroll:
  - `.defaultScrollAnchor(.bottom)`
  - `.scrollDismissesKeyboard(.interactively)`
- Input focus:
  - focus ring on message field when keyboard focus active.
- Settings/editor screens:
  - Keyboard toolbar includes Done button (`ToolbarItem(placement: .keyboard)`).

## Code Block / Syntax Highlight Behavior
From `ContentParser` and `CodeBlockView`:
- Current prototype parser limitation:
  - matches fenced code only when a language is explicitly present after opening backticks.
- RN parity requirement:
  - match any fenced block delimited by triple backticks, with language being optional.
  - support both forms:
    - ```` ```language ... ``` ````
    - ```` ``` ... ``` ````
- Splits mixed content into text blocks + code blocks.
- Syntax highlighting library: `Highlightr`.
- Highlight theme: `"codepen-embed"`.
- Default highlight language for untagged fences:
  - `plaintext` (safe default; avoids incorrect token coloring).
  - keep default configurable in one place so we can switch to `markdown` or `typescript` later.
- Code font selection:
  - If selected font is Calling Code or VT220: use `loadLoomFont()`.
  - Else fallback to Calling Code for code sections.
- Code blocks are horizontally scrollable and text-selectable.

## Prototype Defaults / Persistence
From `LoomApp.initializeSettings` and AppStorage usage:
- `fontSize`: `17`
- `loomFont`: `Cardo`
- `isFirstLaunch`: `true`
- `isFirstLoomTree`: `true`
- `loomVoice`: `Lily`
- `filledMessageStyle`: default `true` (via `AppStorage` declaration)
- `messageCornerRadius`: default `8` (via `AppStorage` declaration)
- `verboseErrorAlerts`: default `false` (via `AppStorage` declaration)
- New-tree defaults:
  - provider: OpenRouter
  - temperature: `0`
  - max tokens: `1000`
  - system message: empty

## RN Port Mapping (Recommended)

### Tokens to centralize first
- Colors:
  - `green = #6CBA78`
  - accent warm neutral ≈ `#C7B686`
  - message text opacities (`0.9`, `0.6`)
- Fonts:
  - Keep existing app font stack but preserve per-font size offsets if multi-font setting returns.
- Spacing/radius:
  - `composerRadius = 20`
  - `userBubblePadding = 8`
  - `rowHorizontalPadding = 12`
  - `userSpacerWidth = 65`
  - `railCardWidth = 275`
  - `railCardRadius = 4`
  - `messageCornerRadiusDefault = 8`

### Behavior parity checklist
- Long-press menu on main nodes: native context menu actions above.
- Long-press menu on continuation cards: native context menu actions above.
- Tap continuation card = preview; double tap = make current; long press = menu.
- Regenerate must rewind first, then stream.
- Keep partial streamed assistant response; delete only empty assistant node.
- Conversation scroll anchored to bottom, interactive keyboard dismissal, keyboard toolbar Done.

## Notes / Caveats
- Prototype is forced dark mode at app level (`.preferredColorScheme(.dark)`), so many “dynamic” colors were effectively observed in dark-only runtime.
- Many settings surfaces use native `Form` defaults (iOS grouped list chrome) rather than fully custom components.
- `NodeTreeView` is a separate experimental visualization and not part of the primary production dialogue UX flow.
