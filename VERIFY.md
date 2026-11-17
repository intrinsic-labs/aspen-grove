# Run and verify Aspen Grove

From a fresh checkout to the app running in the iOS Simulator or an Android emulator, driven
by `testID` and screenshotted. Where each feature lives and how to reach it: [FEATURE_MAP.md](FEATURE_MAP.md).
How the code is organised: [AGENTS.md](AGENTS.md).

Steps 1 to 8 cover the iOS Simulator; [section 9](#9-android-emulator) covers the Android
emulator, from the same tree and with the same Maestro flows. Simulator and emulator captures
are just that: they don't stand in for feel, performance or anything hardware.

## 1. Prerequisites

| Need | Version and source | Check |
|------|--------------------|-------|
| macOS with Xcode | Xcode 26.4 or later (Expo SDK 57's floor; built and verified with Xcode 27) with an iOS Simulator runtime installed | `xcodebuild -version` |
| Node | from [.nvmrc](.nvmrc) (`nvm use` / `fnm use`); `engines` in package.json is the floor | `node -v` |
| CocoaPods | Homebrew `cocoapods` | `pod --version` |
| Maestro (to drive and screenshot) | [maestro.mobile.dev](https://maestro.mobile.dev) | `maestro --version` |
| Java runtime (Maestro needs one) | `brew install openjdk`, or the Homebrew keg if it is installed but unlinked (see the env block) | `java -version` |
| A model | an OpenRouter key of your own, or LM Studio running locally | see step 4 |

**Environment, in every shell** (pod, xcodebuild, simctl, Maestro, Metro). Paste this first;
it points the shell at Xcode without changing the machine, finds an unlinked Homebrew Java for
Maestro, and silences CocoaPods' UTF-8 error:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
export JAVA_HOME=/opt/homebrew/opt/openjdk; export PATH="$JAVA_HOME/bin:$PATH"   # skip if `java -version` already works
export LANG=en_US.UTF-8
```

Maestro needs `DEVELOPER_DIR` too: without it in the same shell, `maestro --device <UDID>`
reports "Device … was requested, but it is not connected" even though the simulator is booted.

Install dependencies from the lockfile: `npm ci`. Never symlink `node_modules` from another
checkout: `npm ci` follows the link and empties the original.

## 2. Pick and boot a simulator

```sh
xcrun simctl list devices available | grep -E 'iPhone'
xcrun simctl boot "<device name or UDID>"   # "Unable to boot in current state: Booted" is fine
```

A build for a runtime that isn't installed fails late, so pick a device from that list.

## 3. Build, install and launch

Expo Go can't run this app (WatermelonDB's JSI adapter and other native modules), so it is a
development build. There are no committed `ios/` or `android/` folders: `expo run:ios`
generates `ios/` (gitignored) from [app.json](app.json) on first run. Change native config in
`app.json` and config plugins, never in the generated folder.

Metro defaults to port 8081, which another session may already be using. Check first and
pick a free port if it's taken; don't stop a server you didn't start.

**Which path?** Expo's `expo run:ios` needs a separate Simulator.app, which Xcode 27 no longer
ships. Check: `ls "$DEVELOPER_DIR/Applications/Simulator.app" /Applications/Simulator.app 2>&1`
If both are missing (Xcode 27+), use **Path B**; otherwise Path A.

**Path A: `expo run:ios`** (Simulator.app present)

```sh
lsof -nP -iTCP:8081 -sTCP:LISTEN          # anything here? then use --port 8082 (or another free port)
mkdir -p .verify
npx expo run:ios --device "<device name>" --port 8081 > .verify/metro.log 2>&1 &
echo $! > .verify/metro.pid
```

The first build compiles every pod and takes several minutes; later builds are incremental.
When it's done the app opens on the simulator and `.verify/metro.log` shows the bundle
loading. `expo run:ios` stays running as the Metro server; leave it up while you drive the
app. (`.verify/` is gitignored.)

**Path B: three steps** (no Simulator.app; `expo run:ios` fails with "Can't determine id of
Simulator app"). Generate `ios/` and pods first if `ios/` is missing
(`npx expo prebuild -p ios`, which since SDK 57 clears and regenerates `ios/` by default; the
failed `expo run:ios` also leaves them), then build, install and serve, keeping every build
product inside `.verify/` so nothing global is created:

```sh
UDID=<booted device UDID>
mkdir -p .verify
xcodebuild -workspace ios/AspenGrove.xcworkspace -scheme AspenGrove -configuration Debug \
  -sdk iphonesimulator -destination "id=$UDID" -derivedDataPath .verify/DerivedData \
  build > .verify/xcodebuild.log 2>&1
xcrun simctl install "$UDID" .verify/DerivedData/Build/Products/Debug-iphonesimulator/AspenGrove.app
lsof -nP -iTCP:8081 -sTCP:LISTEN          # free? else pick another port
npx expo start --dev-client --port 8081 > .verify/metro.log 2>&1 &
echo $! > .verify/metro.pid
xcrun simctl launch "$UDID" com.intrinsiclabs.aspengrove   # or let .maestro/open-app.yaml launch it
```

The build includes `expo-dev-client`, so launching the app opens Expo's development launcher
first: tap the Metro server it lists (by `localhost` or by the Mac's network address,
`http://192.168.…:8081`). On a cleared install the dev menu then shows a
one-time intro (**Continue**) and stays open (close it with ✕). Since SDK 57 the dev menu
also floats a **Tools** button (a gear) at the top right, over onboarding's Skip; turn it off
under the dev menu's Tools → **Tools button** (tap the switch, not the label). A cleared
install turns it back on. The launcher only lists Metro on its default ports; on another
port, use **Enter URL manually** with `http://localhost:<port>`. The Maestro flows handle all
of this in [open-app.yaml](.maestro/open-app.yaml) (its launcher steps live in
[connect-metro.yaml](.maestro/connect-metro.yaml), shared with `relaunch-app.yaml`), on both platforms: it taps the listed
server on Metro's port, whatever its host, and types the URL only when none is listed. Pass
`-e METRO_PORT=<port>` (or `-e METRO_URL=http://localhost:<port>`) when Metro isn't on 8081.
The dev-menu steps differ by platform and live in
[ios-dev-menu.yaml](.maestro/ios-dev-menu.yaml) and
[android-dev-menu.yaml](.maestro/android-dev-menu.yaml).

A fresh install opens on **Home** (`home-welcome`) and, over it, **onboarding**
(`onboarding-screen`): Latent Spaces' six intro pages (`onboarding-next`), then a page that
connects a model, and Begin Weaving (`onboarding-begin`) lands in a first tree, which shows
its Getting Started sheet until its Begin (`tree-onboarding-begin`) is tapped. Skip onboarding by
swiping the sheet down ([skip-onboarding.yaml](.maestro/skip-onboarding.yaml)); Home then shows a setup hint (`home-setup-action`) above its tree
list until a model agent exists. Home is the one top-level screen, as in Latent Spaces: the
`···` menu (`home-menu-button`: import, Search, tag filter) at the top left, Settings
(`home-settings-button`) at the top right, and a composer at the bottom whose first message
starts a new tree. Every other screen is pushed from it and returns with the back button. There is no account and no sign-in: the app
is local-first, and every install is its own synthetic user.

## 4. Give it a model (your own keys, never committed)

The app has no server. A model agent needs either provider:

- **OpenRouter, with your own key.** Easiest for an agent: start Metro with
  `EXPO_PUBLIC_OPENROUTER_API_KEY=<key>` in its environment (the `expo run:ios` line above),
  and the app falls back to it whenever no key is saved
  ([provider-key.ts](src/interface/components/chat/provider-key.ts)). Or type it into
  Settings → Connections: tap `connections-openrouter-edit`, type it into
  `connections-openrouter-key-input` in the sheet and tap `connections-openrouter-key-save`.
  It is stored with `expo-secure-store` (the Keychain on iOS, the Android Keystore on Android). `EXPO_PUBLIC_*` values are inlined into the JS bundle: use the variable only for
  local dev builds, never for an export or release build, and never write it into a
  committed file (`.env*.local` is gitignored if you want a file).
- **LM Studio, local.** Load a model in LM Studio and start its server (default
  `http://localhost:1234`). The iOS Simulator shares the Mac's `localhost`, so the default
  endpoint in Settings → Connections works as is; tap `connections-lmstudio-test` to check.
  (The Android Emulator would need `http://10.0.2.2:1234`.)

### No key? Use the mock server

[scripts/mock-llm-server](scripts/mock-llm-server/README.md) answers the LM Studio calls the
app makes with deterministic streamed text, at a pace you set, with optional failure
injection. It needs nothing but Node:

```sh
lsof -nP -iTCP:1235 -sTCP:LISTEN          # free? (1234 is LM Studio's own port)
node scripts/mock-llm-server/cli.ts --port 1235 --pace 20 > .verify/mock.log 2>&1 &
echo $! > .verify/mock.pid
```

Use the mock server through Settings → Connections → LM Studio at `http://localhost:1235`:
type that into `connections-lmstudio-endpoint-input`, tap `connections-lmstudio-test`, then
create an agent on the LM Studio model `mock-model` (the model `mock-missing`, listed but not loaded, always
answers 404). `--slow` gives time to tap stop mid-stream, and you need it to screenshot
streaming states: at `--pace 20` a parallel-continuation card finishes in about 3 s; `--fail-every 3 --fail-status 422`
fails every third completion outright (a 5xx is retried by the app); `--fail-mode drop` cuts
a stream after a few tokens; `--fail-in-burst 2` fails the second of a set of parallel cards. Stop it with `kill "$(cat .verify/mock.pid)"`.
[.maestro/mock/setup.yaml](.maestro/mock/setup.yaml) does all of that in one run: it clears
state and goes through onboarding the way a new user does: the six pages, then LM Studio
on the mock at 1235, the model `mock-model` and Begin Weaving, which creates the agent
(named `mock-model`) and opens a first tree. If
another session already holds 1235, run the mock on a free port and pass it to Maestro:
`-e MOCK_URL=http://localhost:<port>` (setup.yaml defaults to 1235).
[.maestro/mock/first-turn.yaml](.maestro/mock/first-turn.yaml) is the no-key path to a working
conversation: that setup, then a tree started from Home's composer with one message, the
reply streamed to the end, and a screenshot (run it with the mock server and Metro up).
[.maestro/mock/home-trees.yaml](.maestro/mock/home-trees.yaml) goes on from there: two
trees on Home, the menu, a rename and a delete by swipe. Auto-Title stays on: the mock
recognises the titling call and answers "Mock title #n" (n is the request number), so each
tree's row ends up with that title in place of its first message's words.
[.maestro/mock/tree-model.yaml](.maestro/mock/tree-model.yaml) opens a tree's Model Settings,
turns on "Always use maximum allowed", writes a system message and sends; the mock's log
line for that send shows `max_tokens=8192` and the system message.
[.maestro/mock/tree-model-browser.yaml](.maestro/mock/tree-model-browser.yaml) switches that
tree to OpenRouter and chooses a model through the model browser and a model's page (the
catalog is public, so no key, but it needs the network), and checks the footer's context
line. [.maestro/mock/agent-max-tokens.yaml](.maestro/mock/agent-max-tokens.yaml) edits the
`mock-model` agent: OpenRouter's default model with Max Tokens 32768, then back to LM
Studio's `mock-model`, and Max Tokens drops to its 8192 limit.
[.maestro/mock/long-press-menus.yaml](.maestro/mock/long-press-menus.yaml) long-presses every
context menu in a tree (the human bubble, the reply, a continuation card), screenshots each
lifted preview with its menu, dismisses one and uses another (Bookmark, Regenerate, Copy
Text), then leaves, starts a second tree and reopens the first, so the menus are checked
again on recycled native views.
[.maestro/mock/menu-sections.yaml](.maestro/mock/menu-sections.yaml) screenshots every kind
of native menu (the tree menu, Voice Mode checked, a message's long-press menu, the Bookmarks
submenu, a node sheet's menu, the Provider and LM Studio model pickers) for their dividers
and the check on the selected item; run it on both platforms and compare.
[.maestro/mock/parallel-continuations.yaml](.maestro/mock/parallel-continuations.yaml) draws
several continuations at once: a turn, its rail, N picked (4, then 3), Generate 3, the cards
streaming side by side while one fails on its own and the other two finish, one expanded (its
provenance verified) and made current from its menu, then a relaunch ([relaunch-app.yaml](.maestro/relaunch-app.yaml), which
keeps the app's data) showing the choice and both saved siblings. Start the mock for it with
`--pace 3 --fail-in-burst 2 --fail-status 422`: the second stream of each overlapping burst
fails, and its log shows the three requests open together (`burst=1..3`).
[.maestro/mock/header-scroll.yaml](.maestro/mock/header-scroll.yaml) goes on from first-turn:
two more turns, the list pulled down so messages pass under the tree's transparent header
(the title must stay legible), then Home's header.
[.maestro/mock/beta1-loop.yaml](.maestro/mock/beta1-loop.yaml) is the Beta 1 definition of
done end to end: create a tree, configure its agent, branch, browse siblings inline, edit as a
branch, bookmark, provenance, export, and a relaunch.
[.maestro/mock/beta1-empty-states.yaml](.maestro/mock/beta1-empty-states.yaml) walks the
empty states from a cleared install (no agent, LM Studio unreachable in setup, no trees, no
OpenRouter key); then stop the mock and run
[.maestro/mock/beta1-lmstudio-down.yaml](.maestro/mock/beta1-lmstudio-down.yaml) for the
chat's "LM Studio isn't answering" and its Open Connections action.
[.maestro/mock/parallel-lmstudio-down.yaml](.maestro/mock/parallel-lmstudio-down.yaml) goes on
from parallel-continuations, also with the mock stopped: Generate fails every card, and each
names the saved address on a line of its own.
[.maestro/mock/voice-mode.yaml](.maestro/mock/voice-mode.yaml) picks Lily, turns Voice Mode
on and has a reply read aloud (through the Mac's speakers), then stops it. If 1235 is taken, run the mock on
another port and pass `-e MOCK_URL=http://localhost:<port>` to these flows.

Then create an agent (map path **P1**): Settings → Agents → New → a template or a model →
Save. A fresh install has no model agent, so until you do, sending from Home's composer
opens onboarding instead.

## 5. Drive it and take screenshots

Selectors are React Native `testID`s, which surface on iOS as accessibility identifiers
(Maestro `id:`, Detox `by.id`). The feature map lists each one, the tap path from a cold
start, and the two prerequisite paths (P1 agent, P2 open a tree). Native context-menu items
and system sheets have no testID: pick them by visible title.

**The minimum a verifier runs, with no key** (Metro and the mock server up, step 4): `smoke`,
`mock/first-turn`, `mock/beta1-loop` and `mock/beta1-empty-states`. Then add the flows for
each area the change touched:

| Area touched | Add |
|--------------|-----|
| Home, the tree list | `mock/home-trees` |
| Onboarding, setup, no-agent and error states | `mock/beta1-lmstudio-down` (mock stopped), `needs-agent` |
| Tree screen: menus, sheets, header | `mock/tree-menu`, `mock/long-press-menus`, `mock/menu-sections`, `mock/sheet-swipe`, `mock/header-scroll` |
| Continuation rail, parallel cards | `mock/parallel-continuations`, then `mock/parallel-lmstudio-down` (mock stopped) |
| Models and agents | `mock/tree-model`, `mock/agent-max-tokens`, `mock/tree-model-browser`, `model-browser` (the last three need the network) |
| Settings: Connections, errors, voices | `mock/lmstudio-connection`, `mock/verbose-error-details`, `mock/voice-mode` |
| Markdown, import | `markdown`, `needs-agent` |
| Performance | `perf/` (below) |

`first-turn.yaml` (no `mock/`) is the same first turn on a real OpenRouter key.

```sh
SHOTS=.verify/shots/$(git rev-parse --short HEAD)
for f in smoke mock/first-turn mock/beta1-loop mock/beta1-empty-states; do
  maestro --device "$UDID" test ".maestro/$f.yaml" --test-output-dir "$SHOTS/${f//\//-}"
done
# Metro or the mock off their defaults (8081, 1235)? Add, for example:
#   -e METRO_URL=http://localhost:8084 -e MOCK_URL=http://localhost:1236
```

Give each flow its own output dir, as above. Maestro 2.7 nests inside it:
`<dir>/<timestamp>/<flow>/takeScreenshot/<name>.png` (plus `maestro.log` and, on a failure,
the failing screen), so `find "$SHOTS" -name '*.png'` lists a run's screenshots.

`--device` is required whenever more than one simulator or emulator is running, and harmless
otherwise. Every flow starts with [open-app.yaml](.maestro/open-app.yaml) (cold launch through
the dev launcher to Home). From Home, [open-settings.yaml](.maestro/open-settings.yaml) and
[open-home-menu.yaml](.maestro/open-home-menu.yaml) open Settings and the `···` menu,
[go-back.yaml](.maestro/go-back.yaml) goes back one screen (the header's `BackButton` on iOS,
the back key on Android), and [go-home.yaml](.maestro/go-home.yaml) comes back from any
pushed screen; each retries a tap that lands mid-transition. [start-tree.yaml](.maestro/start-tree.yaml) starts a tree from
Home's composer.

- [smoke.yaml](.maestro/smoke.yaml) clears state, then screenshots Home, its menu, Search,
  Settings, Connections, the empty Agents library and the agent editor.
- [model-browser.yaml](.maestro/model-browser.yaml) opens the agent editor, pushes the
  OpenRouter model browser from Model, opens a Claude model's page, uses it and creates the
  agent. No key; it fetches OpenRouter's public catalog.
- [first-turn.yaml](.maestro/first-turn.yaml) creates an agent from a template, starts a tree
  from Home's composer, waits for the reply and opens its Node Info with the provenance
  check. It spends one short OpenRouter completion and one title call.

A third, [perf/](.maestro/perf/), times a big tree: importing it, opening it, opening a
continuation rail, switching branch and searching. Generate the seed tree
(`node scripts/seed-perf-tree/cli.ts --fake`), then copy it and
`.maestro/perf/fixtures/perf-tiny.openloom` into the simulator's Files ("On My iPhone"):
the `File Provider Storage` folder of the app group whose
`.com.apple.mobile_container_manager.metadata.plist` names
`group.com.apple.FileProvider.LocalStorage`, under
`~/Library/Developer/CoreSimulator/Devices/$UDID/data/Containers/Shared/AppGroup/`.
`perf-tree.yaml` runs on the 520-node tree, `perf-floor.yaml` runs the same steps on
a three-node tree (Maestro's own overhead), and each prints `PERF <name>_ms=<n>` lines into
the run's `maestro.log` (`grep -o 'JsConsole: PERF .*'`). Measure a Release build (Path B
with `-configuration Release`, no Metro) and pass `-e RELEASE_BUILD=1`, which skips the dev
launcher. The numbers are Maestro wall clock, and Maestro's cost grows with what is on
screen (a long tree's hierarchy snapshot takes about twice the floor's): compare runs on one
machine and simulator, three runs or more, by median, and confirm a gap with in-app timing
before calling it a stall. No key needed. Last results: [.dev/voices-plan.md](.dev/voices-plan.md) section 3.

[markdown.yaml](.maestro/markdown.yaml) imports `.maestro/fixtures/markdown-sample.openloom`
(copy it into Files as for the perf flows) and screenshots a reply's markdown: a numbered list
under a bullet, a bullet under a number, and a code block between paragraphs. No key needed.

[needs-agent.yaml](.maestro/needs-agent.yaml) clears state and imports
`perf-tiny.openloom` before any agent exists: the tree opens with its messages and the
"needs an agent" notice, whose button opens the tree's Model Settings; once an agent is created,
reopening the tree adopts it. No key needed. The shared steps it and the perf flows use
live in `open-app.yaml`, `skip-onboarding.yaml` (a cleared install opens onboarding; flows
that set up through Settings or an import swipe it away), `walk-onboarding.yaml` (Next
through the six intro pages), `dismiss-tree-onboarding.yaml` (the first tree's Getting
Started sheet), `create-agent.yaml` and
`import-tree.yaml`.

For a one-off screenshot or deep link without Maestro:

```sh
xcrun simctl io booted screenshot "$SHOTS/<name>.png"
xcrun simctl openurl booted "aspengrove://settings/connections"   # expo-router paths
```

In a development build, `openurl` raises a system "Open in Aspen Grove?" alert that stays up
until answered and blocks every tap behind it; Maestro flows navigate by taps instead.

Name screenshots by what they show (`13-first-reply.png`), keep them under `.verify/`, and
label them as iOS Simulator captures wherever you report them.

## 6. Checks (what CI runs)

[CI](.github/workflows/ci.yml) runs these on every pull request and push to `main`, on
`ubuntu-latest`:

```sh
npm run typecheck     # tsc --noEmit
npm run lint          # eslint, including the Clean Architecture layer boundaries
npm test              # jest (in a sandbox without watchman: npm test -- --no-watchman)
npm run check:map     # FEATURE_MAP.md: fails on broken entries, unmapped routes and drift from code already on main; this change's own drift warns
npm run check:bundle  # Metro bundles the iOS JS (expo export) into dist/ci-bundle
```

`npm run check:map:strict` is the full strict check, drift included; it passes once the map's
`revision:` is current (see the maintenance rule in FEATURE_MAP.md).

## 7. Stop and clean up

Stop only what you started, by the PID you recorded:

```sh
pid=$(cat .verify/metro.pid)
lsof -nP -t -iTCP:8081 -sTCP:LISTEN       # the listener is $pid or its child
kill "$pid"                               # stops Metro
kill "$(cat .verify/mock.pid)"            # if you started the mock server
xcrun simctl uninstall "$UDID" com.intrinsiclabs.aspengrove   # the app and its data
xcrun simctl shutdown "<device name>"     # if you booted it
```

With `npx expo start` the recorded PID is the npm wrapper and the port listener is its child;
killing the recorded PID stops both. Confirm with `lsof` that the ports are free.

Then remove only build outputs: `rm -rf .verify/DerivedData dist ios node_modules` (`ios/` is
generated; `npm ci` restores `node_modules`). Leave `.verify/shots` in
place until you have reported the screenshots. Always build with
`-derivedDataPath .verify/DerivedData` so nothing global is created. If you used
`expo run:ios`, it writes to `~/Library/Developer/Xcode/DerivedData/AspenGrove-*`, which other
sessions on this Mac may share: delete only a folder you created (check its timestamp), never
the others. Disk on the shared Mac is watched. Never `pkill -f` and never kill a PID you
didn't record.

## 8. Known gotchas

- **Command Line Tools selected instead of Xcode:** `xcodebuild` and `simctl` fail; use the
  env block in step 1.
- **Sandboxed agent shells can't reach the simulator.** `xcrun simctl` there fails with
  "CoreSimulatorService connection became invalid". That is the sandbox, not the app: the
  build-and-drive steps need a shell with full access to CoreSimulator. CI and every check in
  step 6 run fine in the sandbox.
- **Maestro's `back` does nothing on iOS** (it's Android's back key), and Android's header back
  button has no `BackButton` id. Use [go-back.yaml](.maestro/go-back.yaml), which does the
  right one per platform.
- **A tap right after a screen transition can be dropped**, the first one after the dev menu
  closes most of all. Wait for the animation and retry until the target screen shows
  (`repeat` … `while: notVisible`), as the flows do, rather than asserting straight away.
- **WatermelonDB on iOS** needs the `simdjson` pod; [app.json](app.json) adds it through
  `expo-build-properties`. If a pod install fails on simdjson, check that block survived.
- **iOS 27 kills apps without the scene lifecycle** at launch (`EXC_BREAKPOINT` in
  `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`) when they're built with the
  iOS 27 SDK. `ios.enableSceneSupport` in [app.json](app.json) turns it on (SDK 57; see
  AGENTS.md). After a prebuild, check it took:
  `/usr/libexec/PlistBuddy -c "Print :UIApplicationSceneManifest" ios/AspenGrove/Info.plist`
  should name `EXExpoAppSceneDelegate`, and
  `grep -nE 'UIWindow\(|makeKeyAndVisible|startReactNative' ios/AspenGrove/AppDelegate.swift`
  should print nothing (the template's `var window: UIWindow?` declaration is expected).
  Only an iOS 27 runtime or device proves the launch: an older runtime launches the app either
  way.
- **A blue "Refreshing..." banner** over the first screen is React Native's hot-update notice
  from Metro, not the app. The flows wait for it to go (end of `connect-metro.yaml`); a one-off
  `simctl` screenshot taken straight after launch can still catch it.
- **Native dependency changed?** A JS reload won't pick it up: rerun `npx expo run:ios`.
  After an `app.json` native change, `npx expo prebuild --clean -p ios` regenerates `ios/`.
- **Startup does not seed a tree.** `AppServicesProvider` passes
  `ensureDialogueSmokeTreeIfEmpty: false`, so "no trees" stays until you create one. Use
  `clearState: true` (Maestro) or delete the app for a true cold start.
- **A new tree you leave without sending is deleted** (ephemeral until the first message).
- **Home's composer focuses itself** once per launch, as Latent Spaces' does, so the keyboard
  is up on Home after a cold start. Tap the greeting to dismiss it if it covers a row.
- **Swipe actions:** Maestro's `swipe` on a `home-trees-row-<treeId>` (`direction: RIGHT` for
  Edit Name, `LEFT` for Delete) opens them; tap the action by its testID.
- **Watchman** may be unavailable in a sandbox; `jest --no-watchman` avoids its crash.

## 9. Android emulator

The same tree and the same Maestro flows run on an Android emulator. Verified with smoke,
mock/first-turn, mock/header-scroll and mock/voice-mode on a Pixel 10 AVD (API 37, arm64).

**Prerequisites.** Android Studio with the SDK at `~/Library/Android/sdk` and the project's AVD,
`Pixel_10` (API 37.1, arm64; other AVDs belong to other work). Missing from `emulator
-list-avds`? Create it in Android Studio's Device Manager (Pixel 10, the API 37.1 Google Play
16 KB arm64 image, named `Pixel_10`), or with the SDK command-line tools:
`avdmanager create avd -n Pixel_10 -d pixel_10 -k "system-images;android-37.1;google_apis_playstore_ps16k;arm64-v8a"`. Gradle needs **JDK 21, Android Studio's bundled one**, not Homebrew's
openjdk (a newer major version); Maestro keeps using Homebrew's. In the shell that builds:

```sh
export ANDROID_HOME=$HOME/Library/Android/sdk; export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"   # adb, emulator
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"; export PATH="$JAVA_HOME/bin:$PATH"
java -version    # 21.x
```

**Boot, build, install.** If a physical phone is on adb, leave it alone: address the emulator
by its serial (`emulator-5554`) in every `adb` and Maestro command.

```sh
emulator -avd Pixel_10 -no-snapshot-save -no-boot-anim -no-audio > .verify/emulator.log 2>&1 &
adb -s emulator-5554 wait-for-device   # returns before boot ends; installing now fails with "Can't find service: package"
until [ "$(adb -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do sleep 2; done
npx expo prebuild -p android                       # generates android/ (gitignored)
(cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain) > .verify/gradle.log 2>&1
adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Building only the emulator's ABI keeps the first build to a few minutes. Start Metro and the
mock server as in steps 3 and 4. The emulator's `localhost` is the emulator itself, so
forward the ports the app uses to the Mac:

```sh
adb -s emulator-5554 reverse tcp:8081 tcp:8081     # Metro (the launcher can also reach it by network address)
adb -s emulator-5554 reverse tcp:1235 tcp:1235     # the mock server, so http://localhost:1235 works as on iOS
```

(Without the reverse, LM Studio on the Mac is `http://10.0.2.2:1234` from the emulator.)

**Drive it.** The flows are the iOS ones; Maestro's Java stays Homebrew's:

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk; export PATH="$JAVA_HOME/bin:$PATH"
maestro --device emulator-5554 test .maestro/smoke.yaml --test-output-dir "$SHOTS/android-smoke"
maestro --device emulator-5554 test .maestro/mock/first-turn.yaml --test-output-dir "$SHOTS/android-mock-first-turn"
adb -s emulator-5554 exec-out screencap -p > "$SHOTS/<name>.png"   # a one-off screenshot
```

What differs on Android, and how the shared flows handle it:

- The dev launcher lists Metro by the Mac's network address and the flow taps it by port.
  When its discovery finds nothing, the flow types `http://localhost:<port>` into the
  launcher's URL field instead, which needs the `adb reverse` above.
  A cleared install opens the dev menu as a bottom sheet (no intro page), closed with its
  **Close** button; the floating **Tools** button is switched off by tapping its whole
  "Tools button" row ([android-dev-menu.yaml](.maestro/android-dev-menu.yaml)).
- Onboarding and other modals are full screen, not page sheets: they close with the back key,
  not a swipe ([skip-onboarding.yaml](.maestro/skip-onboarding.yaml)).
- The window stays put when the keyboard opens: `softwareKeyboardLayoutMode` is `resize`
  in [app.json](app.json), and react-native-keyboard-controller draws edge to edge and moves
  the composers and scroll views itself. Don't set it to `pan`: Android then also pans the
  whole window, pushing Home's header and greeting under the status bar.
- Back is the back key ([go-back.yaml](.maestro/go-back.yaml)). Maestro's `hideKeyboard` is
  also the back key, so on a pushed screen it can leave the screen instead; put the keyboard
  away by scrolling, as [header-scroll.yaml](.maestro/mock/header-scroll.yaml) does.
- iOS-only selectors (`keyboard.toolbar.done`, the iOS "Select All" menu) mean
  mock/lmstudio-connection and the end of mock/tree-model (from its System Message step) are
  iOS-only for now; mock/setup passes (its "Select All" step is
  optional).

**Stop and clean up.** `adb -s emulator-5554 reverse --remove-all`,
`adb -s emulator-5554 uninstall com.intrinsiclabs.aspengrove`, then
`adb -s emulator-5554 emu kill`, stop Metro and the mock by PID, and
`(cd android && ./gradlew --stop)`. Remove the build outputs: `rm -rf android node_modules`
(`android/` is generated).

