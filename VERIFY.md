# Run and verify Aspen Grove

From a fresh checkout to the app running in the iOS Simulator, driven by `testID` and
screenshotted. Where each feature lives and how to reach it: [FEATURE_MAP.md](FEATURE_MAP.md).
How the code is organised: [AGENTS.md](AGENTS.md).

Scope of this guide: iOS Simulator only. Android builds from the same tree
(`npm run android`) but is not covered here yet. Simulator captures are simulator captures:
they don't stand in for feel, performance or anything hardware.

## 1. Prerequisites

| Need | Version and source | Check |
|------|--------------------|-------|
| macOS with Xcode | Xcode with an iOS Simulator runtime installed | `xcodebuild -version` |
| Node | from [.nvmrc](.nvmrc) (`nvm use` / `fnm use`); `engines` in package.json is the floor | `node -v` |
| CocoaPods | Homebrew `cocoapods` | `pod --version` |
| Maestro (to drive and screenshot) | [maestro.mobile.dev](https://maestro.mobile.dev) | `maestro --version` |
| A model | an OpenRouter key of your own, or LM Studio running locally | see step 4 |

If `xcodebuild` says the active developer directory is the Command Line Tools, point this
shell at Xcode without changing the machine: `export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`.

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

A fresh install opens on **Home**: a greeting, a leaf and **New Loom Tree**
(`home-welcome`). There is no account and no sign-in: the app is local-first, and every
install is its own synthetic user.

## 4. Give it a model (your own keys, never committed)

The app has no server. A model agent needs either provider:

- **OpenRouter, with your own key.** Easiest for an agent: start Metro with
  `EXPO_PUBLIC_OPENROUTER_API_KEY=<key>` in its environment (the `expo run:ios` line above),
  and the app falls back to it whenever no key is saved
  ([provider-key.ts](src/interface/components/chat/provider-key.ts)). Or type it into
  Settings → Connections (`connections-openrouter-key-input`), which stores it in the
  Keychain. `EXPO_PUBLIC_*` values are inlined into the JS bundle: use the variable only for
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
create an agent on the LM Studio model `mock-model` (the model `mock-missing` always
answers 404). `--slow` gives time to tap stop mid-stream; `--fail-every 3 --fail-status 422`
fails every third completion outright (a 5xx is retried by the app); `--fail-mode drop` cuts
a stream after a few tokens. Stop it with `kill "$(cat .verify/mock.pid)"`.

Then create an agent (map path **P1**): Settings → Agents → New → a template or a model →
Save. A fresh install has no model agent, so until you do, New Loom Tree shows
"No agents yet…" (`home-error`).

## 5. Drive it and take screenshots

Selectors are React Native `testID`s, which surface on iOS as accessibility identifiers
(Maestro `id:`, Detox `by.id`). The feature map lists each one, the tap path from a cold
start, and the two prerequisite paths (P1 agent, P2 open a tree). Native context-menu items
and system sheets have no testID: pick them by visible title.

Two Maestro flows prove the base:

```sh
SHOTS=.verify/shots/$(git rev-parse --short HEAD); mkdir -p "$SHOTS"
maestro test .maestro/smoke.yaml --test-output-dir "$SHOTS"       # no key needed
maestro test .maestro/first-turn.yaml --test-output-dir "$SHOTS"  # needs step 4
```

- [smoke.yaml](.maestro/smoke.yaml) clears state, then screenshots Home, the drawer, the empty
  tree list, Search, Settings, Connections, the empty Agents library and the agent editor.
- [first-turn.yaml](.maestro/first-turn.yaml) creates an agent from a template, opens a new
  tree, sends one message, waits for the reply and opens its Node Info with the provenance
  check. It spends one short OpenRouter completion and one title call.

A third, [perf/](.maestro/perf/), times a big tree: opening it, opening a continuation
rail, switching branch and searching. Copy the seed tree (`scripts/seed-perf-tree`) and
`.maestro/perf/fixtures/perf-tiny.openloom` into the simulator's Files ("On My iPhone")
first. `perf-tree.yaml` runs on the 520-node tree, `perf-floor.yaml` runs the same steps on
a three-node tree (Maestro's own overhead), and each prints `PERF <name>_ms=<n>` lines into
the run's `maestro.log`. The numbers are Maestro wall clock: compare runs on one machine
and simulator, three runs or more, by median. No key needed.

[needs-agent.yaml](.maestro/needs-agent.yaml) clears state and imports
`perf-tiny.openloom` before any agent exists: the tree opens with its messages and the
"needs an agent" notice, whose button opens Dialogue Settings; once an agent is created,
reopening the tree adopts it. No key needed. The shared steps it and the perf flows use
live in `open-app.yaml`, `create-agent.yaml` and `import-tree.yaml`.

For a one-off screenshot or deep link without Maestro:

```sh
xcrun simctl io booted screenshot "$SHOTS/<name>.png"
xcrun simctl openurl booted "aspengrove://settings/connections"   # expo-router paths; (drawer) groups are dropped
```

Name screenshots by what they show (`13-first-reply.png`), keep them under `.verify/`, and
label them as iOS Simulator captures wherever you report them.

## 6. Checks (what CI runs)

[CI](.github/workflows/ci.yml) runs these on every pull request and push to `main`, on
`ubuntu-latest`:

```sh
npm run typecheck     # tsc --noEmit
npm run lint          # eslint, including the Clean Architecture layer boundaries
npm test              # jest (in a sandbox without watchman: npm test -- --no-watchman)
npm run check:map     # FEATURE_MAP.md: fails on broken entries and unmapped routes; drift warns
npm run check:bundle  # Metro bundles the iOS JS (expo export) into dist/ci-bundle
```

`npm run check:map:strict` is the full strict check, drift included; it passes once the map's
`revision:` is current (see the maintenance rule in FEATURE_MAP.md).

## 7. Stop and clean up

Stop only what you started, by the PID you recorded:

```sh
pid=$(cat .verify/metro.pid)
lsof -nP -t -iTCP:8081 -sTCP:LISTEN       # the listener should be $pid or a descendant of it
kill "$pid"                               # ends expo run:ios and its Metro
xcrun simctl shutdown "<device name>"     # if you booted it
```

Then remove what you created: `rm -rf .verify dist ios` in your checkout, and the app's
build products under `~/Library/Developer/Xcode/DerivedData/` (the folder whose name starts
with the generated Xcode project's name). Disk on the shared Mac is watched. Never `pkill -f`
and never kill a PID you didn't record.

## 8. Known gotchas

- **Command Line Tools selected instead of Xcode:** `xcodebuild` and `simctl` fail; set
  `DEVELOPER_DIR` as in step 1.
- **Sandboxed agent shells can't reach the simulator.** `xcrun simctl` there fails with
  "CoreSimulatorService connection became invalid". That is the sandbox, not the app: the
  build-and-drive steps need a shell with full access to CoreSimulator. CI and every check in
  step 6 run fine in the sandbox.
- **WatermelonDB on iOS** needs the `simdjson` pod; [app.json](app.json) adds it through
  `expo-build-properties`. If a pod install fails on simdjson, check that block survived.
- **Native dependency changed?** A JS reload won't pick it up: rerun `npx expo run:ios`.
  After an `app.json` native change, `npx expo prebuild --clean -p ios` regenerates `ios/`.
- **"No trees" doesn't last.** On a relaunch with a model agent and no trees, startup seeds
  "First Loom Tree". Use `clearState: true` (Maestro) or delete the app for a true cold start.
- **A new tree you leave without sending is deleted** (ephemeral until the first message).
- **There's no Home row in the drawer.** Once you leave Home, relaunch to get back to it.
- **Watchman** may be unavailable in a sandbox; `jest --no-watchman` avoids its crash.
