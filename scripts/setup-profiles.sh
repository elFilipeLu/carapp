#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
API_TOKEN="${2:-}"

if [[ -z "$BASE_URL" || -z "$API_TOKEN" ]]; then
  echo "Usage: $0 <base_url> <api_token>"
  echo "Example: $0 https://carapp-yide.onrender.com abc123token"
  exit 1
fi

BASE_URL="${BASE_URL%/}"

echo "Configuring profiles on: $BASE_URL"

create_profile() {
  local profile_id="$1"
  local payload="$2"

  echo "- Upserting profile: $profile_id"
  curl -sS -X PUT "${BASE_URL}/preferences/${profile_id}?token=${API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload" >/dev/null
}

create_profile "fan1" '{
  "series": ["F1", "WEC"],
  "sessions": ["race", "qualifying"],
  "favorites": ["VER"],
  "tz": "Europe/Paris",
  "nextOnly": true,
  "multipleUpcoming": false,
  "liveAlerts": true,
  "results": true,
  "displayMode": "auto",
  "showSeriesLogo": true,
  "showSessionIcon": false,
  "liveBlink": true,
  "rotateSeries": true
}'

create_profile "f1_only" '{
  "series": ["F1"],
  "sessions": ["race", "qualifying"],
  "favorites": ["VER", "LEC"],
  "tz": "Europe/Paris",
  "nextOnly": true,
  "multipleUpcoming": false,
  "liveAlerts": true,
  "results": true,
  "displayMode": "ultra",
  "showSeriesLogo": true,
  "showSessionIcon": true,
  "liveBlink": true,
  "rotateSeries": false
}'

create_profile "endurance" '{
  "series": ["WEC", "IMSA", "GT3", "LEMANS"],
  "sessions": ["race", "qualifying"],
  "favorites": [],
  "tz": "Europe/Paris",
  "nextOnly": false,
  "multipleUpcoming": true,
  "liveAlerts": true,
  "results": true,
  "displayMode": "balanced",
  "showSeriesLogo": true,
  "showSessionIcon": false,
  "liveBlink": true,
  "rotateSeries": true
}'

echo "Done. Profiles available: fan1, f1_only, endurance"
