# Beta 1 audit notes: voices, the chat split, perf seeding

Written during the Beta 1 audit (2026-11-16, branch `owner/ag-beta1-audit`).
Three short plans: character voices, the rest of the chat-area split, and
seeding and measuring a 500+ node tree.

## 1. Character voices

### How Latent Spaces does it (`~/dev/mobile/loom-swift`, read only)

- **TTS:** Apple's on-device `AVSpeechSynthesizer` (`SpeechSynthesizer.swift`).
  No network, no key, no cost.
- **Voices:** three characters in `LoomVoice.swift`. Each is a system voice
  (`com.apple.ttsbundle.{Daniel,Karen,Moira}-compact`) plus a pitch, a rate,
  a color, an SF Symbol and a one-line description. Lily, for example, is
  pitched at 1.075.
- **Audio session:** `.playback`, so speech plays with the silent switch on.
- **Picker:** Settings → Voice Mode → Choose Voice opens a page sheet
  (`LoomVoiceChooser.swift`). It is a paged `TabView` of character cards with
  dots and a Select button, and tapping a portrait plays a demo line.
- **In the tree:**
  - The toolbar menu has a Voice Mode toggle.
  - With voice mode on, a finished generation is read aloud automatically.
  - A double-tap on a node reads it; a tap stops it.
  - The row being read takes the voice's color.
  - Code blocks are replaced with "You can see the code on this loom tree
    branch."

### Expo equivalent (checked against the current Expo docs, SDK 57/58)

- `expo-speech` drives the platform TTS: AVSpeechSynthesizer on iOS and
  TextToSpeech on Android.
  - `speak` takes `voice`, `pitch`, `rate`, `volume` and the start/done/stop
    callbacks.
  - `getAvailableVoicesAsync()` lists the installed voices by identifier,
    language and quality.
  - It needs no config plugin and no permissions.
- iOS speech is silent in silent mode unless the app's audio session is set
  to play anyway. `expo-audio`'s `setAudioModeAsync({ playsInSilentMode: true })`
  does that, together with `useApplicationAudioSession`.

**Status: this is already built (#12) and now verified in the iOS Simulator.**
- The flow is `.maestro/mock/voice-mode.yaml`. It picks Lily in the chooser,
  turns Voice Mode on, gets a reply read aloud with its row drawn in Lily's
  pink, then taps to stop.
- Shots are voice-01..06.
- The audio itself plays through the Mac's speakers, so the screenshots only
  show the visual state.

The existing files fit the layers:
- **Domain:** `domain/value-objects/loom-voice.ts` (the characters) and
  `domain/entities/voice-preferences.ts`.
- **Application:**
  - `application/services/speech/ISpeechSynthesizer.ts`
  - `resolve-system-voice.ts`, which falls back when the named voice isn't
    installed, as on Android or on iOS without the compact voices.
  - `repositories/supporting/IVoicePreferencesRepository.ts`
- **Infrastructure:**
  - `infrastructure/speech/ExpoSpeechSynthesizer.ts`
  - `split-speech-text.ts`, which chunks text and drops code.
  - `WatermelonVoicePreferencesRepository.ts`
- **Interface:**
  - `interface/components/voice/`: the provider, the toggle and the
    appearance.
  - `settings/voice/`: the section, the chooser sheet and the card.
  - `chat/read-aloud/`: auto-read, and the double-tap and tap handling.

### What would cost money or need a key

Nothing does today, because the system voices are free and on-device. Two
caveats:
- **Voice quality:** the compact system voices sound robotic. The
  premium/enhanced Apple voices are free, but the user has to download them in
  iOS Settings. `resolve-system-voice` could prefer them when they are
  installed. That is a small change with no key.
- **Android:** the voices are whatever the device's TTS engine has. Daniel,
  Karen and Moira don't exist there, so the characters map to the nearest
  English voices by language. This has not been checked on Android yet.

Hosted TTS such as ElevenLabs or OpenAI `gpt-4o-mini-tts` would sound much
better, but it costs per character and needs a user key. Under BYO keys that
means a new connection. OpenRouter has no TTS today. It fits as a second
`ISpeechSynthesizer` adapter (`infrastructure/speech/HostedSpeechSynthesizer.ts`)
plus `expo-audio` playback of the returned audio. This is not needed for v1.

## 2. The chat-area split

**Done (778a068).**
- `useLoomTreeChatController.ts` went from about 520 lines to 315.
- Its wiring moved into single-concern modules:
  - `node-actions/useChatNodeInteractions.ts`
  - `parallel/continuation-rail-view.ts`
  - `tree-menu/useBookmarksRefreshKey.ts`
  - `tree-menu/useChatMenus.ts`
  - `header-actions/useTreeAutoTitles.ts`
  - `composer/composer-view.ts` (tested)
  - `useDialogueRouteParams.ts`
- Hook order is unchanged: only contiguous runs of hooks moved.
- Typecheck, lint and all tests pass. The DoD loop passes in the Simulator
  after the split.

**Left in the chat area (over about 300 lines):**
- `ChatMessageList.tsx` (403):
  - Move the rail reveal and centering logic (state, refs, `onLayout` and the
    scroll-to-row effect) into `chat/scroll/useRailReveal.ts`.
  - Move the composer-height and at-bottom follow logic into
    `chat/scroll/useComposerInsetFollow.ts`.
  - The component keeps the FlatList and its row rendering. The Maestro DoD
    loop (rail open, edit, regenerate) covers the behavior.
- `MarkdownText.tsx` (353): move the markdown `rules`, `codeBlockStyles` and
  the code-block scroll props into `chat/markdown/markdown-rules.tsx`. The
  component keeps the memoized style building and render.

Outside the chat area, these are over 300 lines too, for a later pass:
- `ImportLoomTreeUseCase` (494)
- `AppServicesProvider` (442)
- `loom-ui-tokens` (644, data)
- `schema` (402, data)
- `SearchView` (346)
- several Watermelon repositories (341-356)
- `SendDialogueTurnUseCase` (302)

## 3. Perf: seeding and measuring a 500+ node tree

**Seed tool:** `scripts/seed-perf-tree` already exists (#7).
- **Fake mode:** writes `out/perf-tree-1-fake.openloom`, 520 nodes, with no
  network.
- **Real mode:**
  - Generates the same shape with OpenRouter, defaulting to
    `anthropic/claude-haiku-5.5`.
  - The dry run plans 276 calls, about 1.10M input and 71k output tokens.
  - That is about **$0.15** at $0.10/$0.50 per M tokens.
  - It needs `OPENROUTER_API_KEY` and `--yes`. It resumes from its cache.
  - To run it: `node scripts/seed-perf-tree/cli.ts --seed 1 --yes`, once a key exists.

**Measured on the fake tree** (iPhone simulator AEA31DA2, dev build with
Metro):
- Times are Maestro wall clock, so they include Maestro's own overhead. The
  3-node floor shows that overhead.

| step | 520-node tree | 3-node floor |
| --- | --- | --- |
| import | 2149 ms | 2986 ms |
| open tree (cold, warm, warm) | 3033, 2863, 2923 (median 2923) | 2684, 2456, 2695 (median 2684) |
| open rail | not measured (flow issue, below) | 2256 ms |

- Opening a 520-node path costs about 240 ms over the floor. That is not a
  visible stall.
- No fix was made, so there is no before/after pair yet.

**Flow issues to fix before the next measurement:**
- On this iOS, the document picker's file cells aren't in Maestro's view
  hierarchy. `import-tree.yaml`'s `tapOn: '<file>, openloom.*'` can't match
  them.
  - This run tapped the cell by its grid position and then reverted.
  - A durable fix is to seed the file into the app's own container and import
    it from a dev-only deep link. Alternatively, keep the point tap with a
    fixed file order.
  - The picker now opens straight in "On My iPhone", so the `Browse` tap is
    optional (committed).
- `open-rail-timed.yaml`:
  - Maestro takes "Draft a SQL query" as visible while it is still under the
    header's blur at the bottom of a long path. Its tap misses, and the rail
    never opens.
  - Scrolling with `visibilityPercentage` plus an extra swipe, or giving the
    row a testID by node id, would fix it.
  - `switch-branch-timed.yaml` depends on it.
- `perf-floor.yaml`'s switch step: "Make Current Node" on card index 1 closes
  the rail without switching. The second card there is probably the current
  one now. Pick the card by text instead.
- To measure: copy both `.openloom` files into the simulator's
  `group.com.apple.FileProvider.LocalStorage/File Provider Storage`, then run
  `perf-tree.yaml` and `perf-floor.yaml` three times each and take medians.
  Use a Release build for numbers that matter: dev mode with Metro inflates
  everything.
