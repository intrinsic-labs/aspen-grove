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
  role). It created and linked the project. Expo's Developer role also covers builds and
  credentials. Submitting isn't listed separately, so the first submit is where a missing
  permission would show up. It can't set the project's dashboard icon. For an interactive
  shell, `eas login` works too.
- **Apple:** an App Store Connect API **team** key with the **Admin** role. A team key has
  an issuer id, and Apple keeps individual keys out of certificates and profiles. An App
  Manager key can do it only with "Access to Certificates, Identifiers & Profiles". EAS
  stores the distribution certificate and provisioning profile it makes with the key.
  [scripts/eas-ios-release.sh](../scripts/eas-ios-release.sh) reads the key from:

  | Variable | Value |
  |---|---|
  | `EXPO_TOKEN` | Expo access token (above) |
  | `ASC_KEY_ID` | API key id |
  | `ASC_ISSUER_ID` | issuer id |
  | `ASC_TEAM_ID` | Apple Developer team id |
  | `ASC_API_KEY_P8` | contents of the `.p8` file |
  | `ASC_TEAM_TYPE` | optional: `COMPANY_OR_ORGANIZATION` (default), `INDIVIDUAL` or `IN_HOUSE` |

  The script writes the key to a private temp file, which a trap deletes, and maps the
  variables to the ones eas-cli reads: `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`,
  `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID` and `EXPO_APPLE_TEAM_TYPE`. It submits with the
  `production-asc-key` submit profile, which is `production` plus the key read from the first
  three. eas.json rejects those fields when they are empty, so plain `production` stays
  usable without them, either with a key stored on EAS or interactively.

## First build

eas-cli (27.x) has two limits that shape this:

- It **won't create** a distribution certificate or provisioning profile with
  `--non-interactive`, even with an API key. The first build runs interactively, but the
  API key does the Apple side, so nobody signs in with an Apple ID.
- It **can't create the App Store Connect app record with an API key.** That path needs an
  Apple ID session, and with `--non-interactive` the submit just stops without `ascAppId`.
  A person creates the record on the website.

In order:

1. **Apple Developer / App Store Connect:** accept any pending agreements (App Store Connect
   → Business, and the Program License Agreement on developer.apple.com). Builds and uploads
   fail until they are accepted.
2. **App Store Connect → Users and Access → Integrations → App Store Connect API → Team
   Keys:** generate a key with the Admin role. Download the `.p8` (only possible once) and
   note the key id, the issuer id and the team id (developer.apple.com → Membership).
3. **First build, from a terminal**, with the variables above set:
   `scripts/eas-ios-release.sh --first-run`. EAS registers the bundle id and creates the
   certificate and profile with the key, then builds. Answer yes if eas-cli asks to
   generate them. This run is the first time the robot token creates credentials.
4. **App Store Connect → Apps → + → New App:** iOS, name "Aspen Grove" (choose another if the
   name is taken; it can differ from the home-screen name), primary language English (U.S.),
   bundle id `com.intrinsiclabs.aspengrove` (registered in step 3), and any unique SKU, such
   as `aspen-grove`. Full access.
5. Copy the app's numeric **Apple ID** (App Information → General Information) into
   [eas.json](../eas.json) as `submit.production.ios.ascAppId` and commit it.
6. `scripts/eas-ios-release.sh --submit-latest` uploads the build from step 3. EAS sets up
   an internal TestFlight group on first submit.
7. **TestFlight:** add internal testers. They must be users on the App Store Connect team.
   For external testers, fill in Test Information (feedback email, beta description) and
   send the build to Beta App Review. That first review takes a day or so.

If you'd rather submit in step 3, do step 4 first, after registering the bundle id by hand
under developer.apple.com → Identifiers.

## Ship the next TestFlight build

From a clean checkout of `main` with CI green, with the variables above set:

```sh
npm ci
scripts/eas-ios-release.sh   # builds the production profile, then submits it, without prompts
```

Processing takes a few minutes before the build shows in TestFlight. Before you call it
shipped, install it from TestFlight and walk the Beta 1 loop once. Check that LM Studio on
the LAN still connects, since only Release builds use the app's own local-network prompt.
