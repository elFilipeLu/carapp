#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
API_TOKEN="${2:-}"
PROFILE_ID="${3:-fan1}"

if [[ -z "$BASE_URL" || -z "$API_TOKEN" ]]; then
  echo "Usage: $0 <base_url> <api_token> [profile_id]"
  echo "Example: $0 https://carapp-yide.onrender.com abc123token fan1"
  exit 1
fi

BASE_URL="${BASE_URL%/}"

check_code() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local code
  code="$(curl -s -o /tmp/smoke.out -w "%{http_code}" "$url")"
  if [[ "$code" != "$expected" ]]; then
    echo "[FAIL] $name -> HTTP $code (expected $expected)"
    echo "URL: $url"
    echo "Body:"
    sed -n '1,10p' /tmp/smoke.out
    exit 1
  fi
  echo "[OK]   $name -> HTTP $code"
}

echo "Running smoke checks on $BASE_URL"

check_code "Root" "${BASE_URL}/"
check_code "Health" "${BASE_URL}/health"
check_code "Privacy" "${BASE_URL}/privacy"
check_code "Providers status (auth)" "${BASE_URL}/providers/status?token=${API_TOKEN}"
check_code "Poll (profile)" "${BASE_URL}/lametric/poll?profile=${PROFILE_ID}&token=${API_TOKEN}"
check_code "Analytics summary (auth)" "${BASE_URL}/analytics/summary?token=${API_TOKEN}"

poll_body="$(curl -s "${BASE_URL}/lametric/poll?profile=${PROFILE_ID}&token=${API_TOKEN}")"
if [[ "$poll_body" != *"\"frames\""* ]]; then
  echo "[FAIL] Poll payload missing frames key"
  echo "$poll_body"
  exit 1
fi

echo "[OK]   Poll payload contains frames"
echo "All smoke checks passed."
