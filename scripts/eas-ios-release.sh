#!/usr/bin/env bash
# Builds Aspen Grove for the App Store on EAS and submits it to TestFlight.
# See docs/shipping.md.
#
#   scripts/eas-ios-release.sh                 build, then submit (non-interactive)
#   scripts/eas-ios-release.sh --first-run     first build and submit; needs a terminal
#   scripts/eas-ios-release.sh --submit-latest submit the latest build (non-interactive)
#
# Apple auth, in order of preference:
#   1. The App Store Connect API key stored on EAS for this project (set up once by
#      --first-run). Then EXPO_TOKEN is the only variable a release needs.
#   2. A team API key from the environment (all of ASC_KEY_ID, ASC_ISSUER_ID,
#      ASC_TEAM_ID and ASC_API_KEY_P8), used through the production-asc-key submit
#      profile and for credential repair.
#
# --first-run exists because eas-cli will not create the distribution certificate and
# provisioning profile with --non-interactive, and only an Apple ID sign-in can create
# the App Store Connect app record. Run without the ASC_* variables, eas-cli asks for an
# Apple ID once, creates the certificate, profile and app record, and offers to generate
# the API key it stores on EAS for later submits.
#
# Environment:
#   EXPO_TOKEN      Expo access token for the account that owns the project
#                   (optional only for --first-run in a shell signed in with `eas login`)
#   ASC_KEY_ID, ASC_ISSUER_ID, ASC_TEAM_ID, ASC_API_KEY_P8   optional, see above
#   ASC_TEAM_TYPE   optional: INDIVIDUAL (default, the team that owns the app),
#                   COMPANY_OR_ORGANIZATION or IN_HOUSE
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

if [[ -z ${EXPO_TOKEN:-} && $mode != first-run ]]; then
  echo "Missing environment variable: EXPO_TOKEN" >&2
  exit 1
fi

asc_vars=(ASC_KEY_ID ASC_ISSUER_ID ASC_TEAM_ID ASC_API_KEY_P8)
asc_set=()
for name in "${asc_vars[@]}"; do
  [[ -n "${!name:-}" ]] && asc_set+=("$name")
done
if ((${#asc_set[@]} && ${#asc_set[@]} < ${#asc_vars[@]})); then
  echo "Set all of ${asc_vars[*]} to use an API key from the environment, or none" >&2
  echo "of them to use the key stored on EAS. Set now: ${asc_set[*]}" >&2
  exit 1
fi

# Submitting without prompts needs the App Store Connect record's numeric Apple ID.
asc_app_id=$(node -p 'require("./eas.json").submit?.production?.ios?.ascAppId ?? ""')
if [[ -z $asc_app_id && $mode != first-run ]]; then
  echo "eas.json has no submit.production.ios.ascAppId. Run --first-run once, then set" >&2
  echo "it (docs/shipping.md, 'First build')." >&2
  exit 1
fi

SUBMIT_PROFILE=production
if ((${#asc_set[@]})); then
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
  export EXPO_APPLE_TEAM_TYPE=${ASC_TEAM_TYPE:-INDIVIDUAL}
fi

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
    # An API key can't create the App Store Connect record, so with one and no
    # ascAppId yet, build only; submit with --submit-latest once the record exists.
    submit=(--auto-submit-with-profile "$SUBMIT_PROFILE")
    if ((${#asc_set[@]})) && [[ -z $asc_app_id ]]; then
      submit=()
    fi
    "${EAS_CLI[@]}" build -p ios --profile production ${submit[@]+"${submit[@]}"}
    ;;
  submit-latest)
    "${EAS_CLI[@]}" submit -p ios --profile "$SUBMIT_PROFILE" --latest --non-interactive
    ;;
esac
