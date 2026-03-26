# LaMetric Store Submission Pack

Use this document to publish the app in the LaMetric Developer Portal.

## 1) App Type

- App type: `Indicator app`
- Communication type: `Poll`
- Poll URL: `https://<your-public-domain>/lametric/poll?profile=fan1`
- Poll frequency: `30s` or `60s`

## 2) Store Listing Copy

- Name: `Motorsport Companion`
- Short description: `Live motorsport awareness for F1, WEC, IMSA, GT3 and Le Mans.`
- Long description:
  `Shows next sessions, live status, countdowns, and recent key outcomes. Supports favorites and multi-series filtering with an optimized glanceable 1-3 frame layout.`

## 3) Categories and Tags

- Category: `Sport`
- Suggested tags: `f1`, `wec`, `imsa`, `gt3`, `lemans`, `motorsport`, `countdown`

## 4) Required Assets (prepare in portal)

- App icon (8x8 pixel art style recommended)
- At least one screenshot of app running on device
- Optional preview GIF for live mode

## 5) Runtime Requirements

- Public HTTPS endpoint required (no localhost)
- Endpoint must answer quickly (<500ms target)
- Endpoint must return JSON in LaMetric poll format:

```json
{
  "frames": [
    { "text": "F1 RACE IN 1H 10M", "icon": "i41186" }
  ]
}
```

## 6) Final Verification

- Validate endpoint:
  - `GET /health`
  - `GET /lametric/poll?profile=fan1`
- Confirm response contains `frames` array only for poll endpoint
- Confirm app updates on device with expected interval
