#!/usr/bin/env bash
# Builds Aspen Grove for the App Store on EAS and submits it to TestFlight. Apple auth
# is an App Store Connect API key (a team key), so there is no Apple ID or 2FA prompt.
# See docs/shipping.md.
#
#   scripts/eas-ios-release.sh                 build, then submit (non-interactive)
#   scripts/eas-ios-release.sh --first-run     first build only; needs a terminal
#   scripts/eas-ios-release.sh --submit-latest submit the latest build (non-interactive)
#
# --first-run exists because eas-cli will not create the distribution certificate and
# provisioning profile with --non-interactive. Run interactively, it creates them with
# the API key (and registers the bundle id). It also submits if ascAppId is set.
#
# Environment:
#   EXPO_TOKEN      Expo access token for the account that owns the project
#   ASC_KEY_ID      App Store Connect API key id
#   ASC_ISSUER_ID   its issuer id
#   ASC_TEAM_ID     Apple Developer team id
#   ASC_API_KEY_P8  the .p8 file's contents
#   ASC_TEAM_TYPE   optional: COMPANY_OR_ORGANIZATION (default), INDIVIDUAL or IN_HOUSE
set -euo pipefail

EAS_CLI=(npx --yes eas-cli@27.11.0)

cd "$(dirname "$0")/.."

mode=release
case "${1:-}" in
  '') ;;
  --first-run) mode=first-run ;;
  --submit-latest) mode=submit-latest ;;
  *) echo "usage: $0 [--first-run | --submit-latest]" >&2; exit 2 ;;
esac

missing=()
for name in EXPO_TOKEN ASC_KEY_ID ASC_ISSUER_ID ASC_TEAM_ID ASC_API_KEY_P8; do
  [[ -n "${!name:-}" ]] || missing+=("$name")
done
if ((${#missing[@]})); then
  echo "Missing environment variables: ${missing[*]}" >&2
  exit 1
fi

# Submitting without prompts needs the App Store Connect record's numeric Apple ID.
# eas-cli can only create that record with an Apple ID sign-in, never an API key.
asc_app_id=$(node -p 'require("./eas.json").submit?.production?.ios?.ascAppId ?? ""')
if [[ -z $asc_app_id && $mode != first-run ]]; then
  echo "eas.json has no submit.production.ios.ascAppId. Create the app in App Store" >&2
  echo "Connect first, then set it (docs/shipping.md, 'First build')." >&2
  exit 1
fi

# The key goes to a private temp file that is removed however the script ends.
key_file=$(mktemp "${TMPDIR:-/tmp}/asc-api-key.XXXXXX")
cleanup() { rm -f "$key_file"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
chmod 600 "$key_file"
p8=$ASC_API_KEY_P8
# Tolerate a key stored on one line with literal \n escapes.
if [[ $p8 != *$'\n'* && $p8 == *'\n'* ]]; then
  p8=${p8//\\n/$'\n'}
fi
printf '%s\n' "$p8" >"$key_file"
unset p8 ASC_API_KEY_P8
if ! grep -q -- '-----BEGIN PRIVATE KEY-----' "$key_file"; then
  echo "ASC_API_KEY_P8 does not look like a .p8 private key." >&2
  exit 1
fi

# eas-cli reads these for Apple auth when building, and eas.json's submit profile
# production-asc-key (production plus the key) reads the first three for the upload.
SUBMIT_PROFILE=production-asc-key
export EXPO_ASC_API_KEY_PATH=$key_file
export EXPO_ASC_KEY_ID=$ASC_KEY_ID
export EXPO_ASC_ISSUER_ID=$ASC_ISSUER_ID
export EXPO_APPLE_TEAM_ID=$ASC_TEAM_ID
export EXPO_APPLE_TEAM_TYPE=${ASC_TEAM_TYPE:-COMPANY_OR_ORGANIZATION}

case $mode in
  release)
    "${EAS_CLI[@]}" build -p ios --profile production --non-interactive \
      --auto-submit-with-profile "$SUBMIT_PROFILE"
    ;;
  first-run)
    if [[ ! -t 0 ]]; then
      echo "--first-run needs a terminal: eas-cli asks before creating credentials." >&2
      exit 1
    fi
    submit=()
    [[ -n $asc_app_id ]] && submit=(--auto-submit-with-profile "$SUBMIT_PROFILE")
    "${EAS_CLI[@]}" build -p ios --profile production ${submit[@]+"${submit[@]}"}
    ;;
  submit-latest)
    "${EAS_CLI[@]}" submit -p ios --profile "$SUBMIT_PROFILE" --latest --non-interactive
    ;;
esac
