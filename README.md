# LaMetric Motorsport Companion API

Backend API scaffold for a "top-tier fan edition" LaMetric motorsport app.

## What is implemented

- Unified event normalization into a canonical schema
- Smart prioritization (`live` > `next` > session priority > major events)
- Countdown and timezone formatting rules
- User personalization via query params (`series`, `sessions`, `favorites`, `tz`)
- Persistent preference profiles (`GET/PUT /preferences/:profileId` + `?profile=...`)
- Display modes: `auto`, `ultra`, `balanced`, `detailed`
- LaMetric-ready frame payload generation (up to 24 frames for multi-series deck)
- In-memory cache (TTL 60s) and failover response
- Real provider pipeline:
  - OpenF1 (primary for F1 sessions + recent pole/winner enrichment)
  - iCal feeds with built-in defaults for WEC, IMSA, GT3, Le Mans
  - Mock fallback when external sources are unavailable
- Provider health diagnostics (`GET /providers/status`)
- Basic notifications worker + dedup (`POST /notifications/run`, `GET /notifications/recent`)
- Optional token auth and in-memory rate limiting
- Basic request metrics (`GET /metrics`)

## Run locally

```bash
npm install
npm run start
```

Server starts on `http://localhost:3000`.

## Deployment Pack

This repo now includes:

- `Dockerfile`
- `.dockerignore`
- `.env.example`
- `render.yaml` (Render blueprint)

### Docker (generic hosting)

```bash
cp .env.example .env
docker build -t lametric-motorsport-api .
docker run --env-file .env -p 3000:3000 lametric-motorsport-api
```

### Render (quickest managed option)

1. Push this repo to GitHub.
2. In Render, create a Blueprint deployment from `render.yaml`.
3. Set secrets/envs in Render dashboard:
   - `API_TOKEN` (admin/API endpoints)
   - `POLL_TOKEN` (recommended for `/lametric/poll`)
   - `REDIS_URL` (recommended for production)
4. Deploy and verify:
   - `https://<your-domain>/health`
   - `https://<your-domain>/lametric/poll?profile=<profile-id>&token=<POLL_TOKEN>`

## Security and limits

- `API_TOKEN` optional bearer token for admin/API routes. If set:
  - use `Authorization: Bearer <token>`
  - or query `?token=<token>`
- `POLL_TOKEN` optional dedicated token for `GET /lametric/poll`:
  - when set, `/lametric/poll` expects `?token=<POLL_TOKEN>`
  - this lets you avoid exposing `API_TOKEN` in LaMetric poll URLs
- `RATE_LIMIT_WINDOW_MS` (default `60000`)
- `RATE_LIMIT_MAX_REQUESTS` (default `120`)
- `REDIS_URL` optional (enables Redis-backed rate limit, prefs cache, notification dedup/recent)

## Provider configuration

### OpenF1 (enabled by default)

- `OPENF1_ENABLED=true|false` (default: `true`)
- `OPENF1_BASE_URL` (default: `https://api.openf1.org/v1`)
- `OPENF1_YEARS` optional CSV override (example: `2025,2026`)
  - default behavior: current year + previous year

### iCal feeds (optional)

- `ICAL_ENABLED=true|false` (default: `true`)
- Built-in feeds are enabled by default:
  - `WEC`
  - `IMSA`
  - `GT3` (GT World Challenge Europe)
  - `LEMANS` (Le Mans-only filter from WEC calendar)
  - `MOTOGP`
  - `WRC`
  - `FORMULAE`
  - `INDYCAR`
  - `NASCAR`
  - `F2`
  - `F3`
- `ICAL_FEEDS` JSON array to override/add feeds:

```json
[
  { "series": "WEC", "url": "https://example.com/wec.ics" },
  { "series": "IMSA", "url": "https://example.com/imsa.ics" },
  { "series": "GT3", "url": "https://example.com/gt3.ics" },
  { "series": "LEMANS", "url": "https://example.com/wec.ics", "keyword": "le mans" }
]
```

### Mock fallback

- `MOCK_FALLBACK_ENABLED=true|false` (default: `true`)
- If both OpenF1 and iCal return no events, mock data is used so the endpoint still responds.

## Persistence and notifications

- `PREFERENCES_FILE` (default `./data/preferences.json`)
- `ENABLE_NOTIFICATIONS=true|false` (default: `true`)
- `NOTIFICATION_POLL_INTERVAL_MS` (default: `60000`)

If `REDIS_URL` is set and reachable, runtime state uses Redis. If Redis is unavailable, services fall back to in-memory/file behavior.

## Endpoints

- `GET /health`
- `GET /lametric`
- `GET /lametric/poll` (strict LaMetric poll contract)
- `GET /providers/status` also reports `active_series` (series currently returning data)
- `GET /metrics`
- `GET /analytics/summary`
- `GET /preferences/:profileId`
- `PUT /preferences/:profileId`
- `POST /notifications/run`
- `GET /notifications/recent`

Example:

```bash
curl "http://localhost:3000/lametric?series=F1,WEC&sessions=race,qualifying&favorites=VER&tz=Europe/Paris"
```

Use a saved profile:

```bash
curl -X PUT http://localhost:3000/preferences/fan1 \
  -H "Content-Type: application/json" \
  -d '{"series":["F1","WEC"],"sessions":["race","qualifying"],"favorites":["VER"],"tz":"Europe/Paris","nextOnly":true,"results":true}'

curl "http://localhost:3000/lametric?profile=fan1"
```

More series examples:

```bash
curl "http://localhost:3000/lametric?series=WEC,IMSA,GT3,LEMANS&sessions=race&tz=Europe/Paris"
curl "http://localhost:3000/lametric?series=LEMANS&sessions=race&tz=Europe/Paris"
```

LaMetric poll payload endpoint:

```bash
curl "http://localhost:3000/lametric/poll?profile=fan1"
```

Multi-series profile deck behavior:

- if multiple championships are selected and `rotateSeries=true`, output is grouped per championship:
  - Frame 1: series
  - Frame 2: session type
  - Frame 3: local start time
  - Frame 4: event name
- only the next event per selected championship is displayed

Display mode override example:

```bash
curl "http://localhost:3000/lametric/poll?profile=fan1&displayMode=ultra"
```

Visual toggles example:

```bash
curl "http://localhost:3000/lametric/poll?profile=fan1&showSeriesLogo=true&showSessionIcon=false&liveBlink=true&rotateSeries=true"
```

## LaMetric Market publishing

- Store submission guide: `lametric/store-submission.md`
- App template metadata: `lametric/app-template.json`
- Visual design blueprint: `lametric/visual-design-spec.md`
- In LaMetric Developer portal, create an `Indicator` + `Poll` app.
- Set poll URL to your public HTTPS deployment:
  - `https://<your-domain>/lametric/poll`
- Add app options so user can choose content without hardcoded URL values:
  - Option ID `profile` (text): examples `fan1`, `f1_only`, `endurance`
  - Option ID `series` (text): examples `F1,WEC` or `WEC,IMSA,GT3`
  - Option ID `sessions` (text): examples `race,qualifying`
  - Option ID `favorites` (text): example `VER,LEC`
  - Option ID `tz` (text): example `Europe/Paris`
  - Option ID `displayMode` (text): `auto|ultra|balanced|detailed`
  - Option ID `rotateSeries` (text): `true|false`
- If you set `POLL_TOKEN`, append it in URL:
  - `https://<your-domain>/lametric/poll?token=<POLL_TOKEN>`

## Suggested next implementation steps

1. Move event cache and provider status store to Redis for multi-instance consistency.
2. Expand integration tests to provider-failure and auth-token scenarios.
3. Add durable notification delivery (webhook/queue/push integration).
4. Add CI pipeline for build/test + container publish.

## CI/CD

- GitHub Actions workflow: `.github/workflows/ci.yml`
- On push/PR:
  - installs deps
  - runs `npm test`
  - validates Docker image build
- On push to `main`:
  - publishes image to GHCR as:
    - `ghcr.io/<owner>/<repo>:latest`
    - `ghcr.io/<owner>/<repo>:sha-...`
