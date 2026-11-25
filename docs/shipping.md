# Shipping a build

How Aspen Grove gets from `main` to TestFlight. Builds run on EAS (Expo Application
Services) from [eas.json](../eas.json). For running the app locally, see
[VERIFY.md](../VERIFY.md).

## Identity

| | Value |
|---|---|
| Display name | Aspen Grove |
| iOS bundle id | `com.intrinsiclabs.aspengrove` |
| Android package | `com.intrinsiclabs.aspengrove` |
| Expo slug | `aspen-grove` |
| Expo project | [`@rocketbro/aspen-grove`](https://expo.dev/accounts/rocketbro/projects/aspen-grove), id `d7b7806b-1d28-4a4b-bd40-a50bd0174781` (`owner` and `extra.eas.projectId` in [app.json](../app.json)) |

The bundle id and package are permanent once the store records exist. Don't change them.

The app config is [app.json](../app.json). [app.config.js](../app.config.js) only adds the
release guard (below) and passes app.json through, so put config in app.json.

## Profiles

| Profile | What it makes | Command |
|---|---|---|
| `development` | Dev client for a registered device (ad hoc) | `eas build -p ios --profile development` |
| `development-simulator` | Dev client `.app` for the iOS Simulator | `eas build -p ios --profile development-simulator` |
| `preview` | Release build for registered devices (ad hoc) | `eas build -p ios --profile preview` |
| `production` | App Store build, for TestFlight | `scripts/eas-ios-release.sh` |

Build numbers are kept by EAS (`"appVersionSource": "remote"`) and `production` bumps them
on each build, so never edit `buildNumber` or `versionCode` by hand. The user-facing
version is `expo.version` in [app.json](../app.json): bump it there for a new release.

## Release safety

- **No developer keys in a release.** `EXPO_PUBLIC_OPENROUTER_API_KEY` and
  `EXPO_PUBLIC_LMSTUDIO_API_TOKEN` are local-dev fallbacks. On EAS, any profile other than
  `development` and `development-simulator` fails while reading the app config if either is
  set, whether it comes from the EAS environment, a profile's `env` in eas.json or a committed
  `.env` ([config/release-env-guard.js](../config/release-env-guard.js)). Today a release
  bundle would not contain them anyway, because
  [provider-key.ts](../src/interface/components/chat/provider-key.ts) reads them
  dynamically. Only dev bundles carry `EXPO_PUBLIC_*` values. Don't rely on that: one static
  `process.env.EXPO_PUBLIC_…` read would inline the key.
- **Export compliance:** `ios.config.usesNonExemptEncryption: false`. The app only hashes
  (SHA-256) and uses HTTPS and the Keychain, so TestFlight doesn't ask about encryption.
  Revisit it if the app ever adds its own encryption.
- **Local network:** `NSLocalNetworkUsageDescription` explains LM Studio. Debug builds also
  get Expo Dev Launcher's string, which is removed in Release, so set it in app.json.

## Credentials

Nothing secret lives in this repository. Never commit an Expo token, a `.p8` key, a
keystore or an `EXPO_PUBLIC_*` key.

- **Expo:** `EXPO_TOKEN` is a robot access token on the `rocketbro` account (Developer
  role). It created and linked the project. Expo's Developer role also covers builds,
  credentials and submits. It can't set the project's dashboard icon. For an interactive
  shell, `eas login` works too. Agents get the token from the project brief's
  `credentials:`.
- **Apple:** the app belongs to the Apple Developer team `8462243PH7` (an Individual
  team). EAS keeps everything Apple needs after the first build: the distribution
  certificate, the provisioning profile and an App Store Connect API key for submits. From
  then on a release needs only `EXPO_TOKEN`.

  For credential repair, or to submit with a key of your own,
  [scripts/eas-ios-release.sh](../scripts/eas-ios-release.sh) also takes an App Store
  Connect API **team** key (Admin role) from the environment. Set all four or none:

  | Variable | Value |
  |---|---|
  | `ASC_KEY_ID` | API key id |
  | `ASC_ISSUER_ID` | issuer id |
  | `ASC_TEAM_ID` | Apple Developer team id (`8462243PH7`) |
  | `ASC_API_KEY_P8` | contents of the `.p8` file |
  | `ASC_TEAM_TYPE` | optional: `INDIVIDUAL` (default), `COMPANY_OR_ORGANIZATION` or `IN_HOUSE` |

  The script writes the key to a private temp file, which a trap deletes, and maps the
  variables to the ones eas-cli reads: `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`,
  `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID` and `EXPO_APPLE_TEAM_TYPE`. It then submits
  with the `production-asc-key` submit profile, which is `production` plus the key read
  from the first three. eas.json rejects those fields when they are empty, which is why
  plain `production` is a separate profile that uses the key stored on EAS.

## First build

eas-cli (27.x) has two limits that shape this:

- It **won't create** a distribution certificate or provisioning profile with
  `--non-interactive`. The first build runs in a terminal.
- **Only an Apple ID session can create the App Store Connect app record.** An API key
  can't, and without `ascAppId` a non-interactive submit stops.

So the first build is one interactive run, signed in with the Apple ID of the team's
account holder:

1. **Accept any pending Apple agreements** (App Store Connect → Business, and the Program
   License Agreement on developer.apple.com). Builds and uploads fail until they are
   accepted.
2. **From a terminal on a checkout of `main`**, signed in to Expo (`EXPO_TOKEN` or
   `eas login`), with no `ASC_*` variables set:

   ```sh
   npm ci
   scripts/eas-ios-release.sh --first-run
   ```

   Answer yes to each prompt: sign in to the Apple account (Apple ID and two-factor code),
   generate the distribution certificate, generate the provisioning profile. EAS registers
   the bundle id and builds in the cloud (about 15 to 25 minutes). It then submits: it
   creates the App Store Connect app ("Aspen Grove", English (U.S.), from eas.json's
   `submit.production`) if it doesn't exist, offers to generate an App Store Connect API
   key (answer yes; EAS stores it for later submits) and uploads the build.
3. **Record the app id.** Copy the app's numeric **Apple ID** (App Store Connect → the app
   → App Information → General Information, or the submit log) into
   [eas.json](../eas.json) as `submit.production.ios.ascAppId` and commit it. Release runs
   need it.
4. **TestFlight:** the first upload lands in an internal group. Internal testers must be
   users on the App Store Connect team; the account holder already is. For external
   testers, fill in Test Information (feedback email, beta description) and send the
   build to Beta App Review, which takes a day or so the first time.

If the app record name "Aspen Grove" is taken, change `submit.production.ios.appName` to
something unique; the home-screen name stays `expo.name`.

## Ship the next TestFlight build

From a clean checkout of `main` with CI green and `EXPO_TOKEN` set:

```sh
npm ci
scripts/eas-ios-release.sh   # builds the production profile, then submits it, without prompts
```

`scripts/eas-ios-release.sh --submit-latest` re-submits the latest build if the upload
step failed. Processing takes a few minutes before the build shows in TestFlight. Before
you call it shipped, install it from TestFlight and walk the Beta 1 loop once. Check that
LM Studio on the LAN still connects, since only Release builds use the app's own
local-network prompt.

When the provisioning profile expires (12 months) or the certificate is revoked, run
`--first-run` again, or set the `ASC_*` key variables so eas-cli can repair them.
