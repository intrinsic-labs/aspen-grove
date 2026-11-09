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
| Expo account | Intrinsic Labs' own account (never a client's) |

The bundle id and package are permanent once the store records exist. Don't change them.

## Profiles

| Profile | What it makes | Command |
|---|---|---|
| `development` | Dev client for a registered device (ad hoc) | `eas build -p ios --profile development` |
| `development-simulator` | Dev client `.app` for the iOS Simulator | `eas build -p ios --profile development-simulator` |
| `preview` | Release build for registered devices (ad hoc) | `eas build -p ios --profile preview` |
| `production` | App Store build, for TestFlight | `eas build -p ios --profile production` |

Build numbers are kept by EAS (`"appVersionSource": "remote"`) and `production` bumps them
on each build, so never edit `buildNumber` or `versionCode` by hand. The user-facing
version is `expo.version` in [app.json](../app.json): bump it there for a new release.

## Credentials

Nothing secret lives in this repository. EAS holds the iOS distribution certificate and
provisioning profile. Never commit an Expo token, a `.p8` key, a keystore or an
`EXPO_PUBLIC_*` key, and never build a release with `EXPO_PUBLIC_OPENROUTER_API_KEY` set:
it would be inlined into the bundle that ships.

- **Expo:** `eas login` interactively, or set `EXPO_TOKEN` to an access token of the Intrinsic
  Labs account (expo.dev → Account settings → Access tokens) for a non-interactive shell.
- **Apple:** the first iOS build must run interactively once (`eas build -p ios --profile
  production`), signing in with the Apple Developer account so EAS can create the
  certificate and profile. Later builds reuse them and can run with `--non-interactive`.
  To submit without prompts, add an App Store Connect API key with
  `eas credentials -p ios`.

## Ship the next TestFlight build

From a clean checkout of `main` with CI green:

```sh
npm ci
npx eas-cli build -p ios --profile production          # add --non-interactive once credentials exist
npx eas-cli submit -p ios --profile production --latest  # uploads to App Store Connect → TestFlight
```

The first `submit` creates the App Store Connect record. Then put its numeric Apple ID in
[eas.json](../eas.json) as `submit.production.ios.ascAppId`, so later submits never prompt
for it. Processing takes a few minutes before the build shows in TestFlight.

Before you call it shipped, install it from TestFlight and walk the Beta 1 loop once.
