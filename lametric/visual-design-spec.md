# LaMetric Motorsport Visual Spec

## Goals

- 1-2 second readability on LaMetric Time.
- High-contrast visuals with minimal scroll.
- Clear differentiation between series and session types.

## Frame Layout

- **Frame 1 (primary):** series/session + countdown or live state
- **Frame 2 (context):** start time OR track cue OR stale cue
- **Frame 3 (optional):** winner/pole/favorite/confidence

`ultra` mode should prefer 1-2 frames only.

## Icon Strategy

- Series icons:
  - `F1`: `i41186`
  - `WEC/IMSA/GT3/LEMANS`: `i34230`
- Session icons (optional via `showSessionIcon=true`):
  - race: `i25731`
  - qualifying: `i41186`
  - practice: `i43558`
- Warning icon:
  - stale/no data: `i43558`

## Visual States

- **Upcoming:** `F1 Q 45M` / `WEC R SAT 00:00`
- **Live:** `LIVE F1 R` + optional `iconAnimation: blink`
- **Finished:** `F1 R DONE` or `WIN: VER`
- **Stale:** `STALE 4M` frame cue

## Color/Animation Guidance

- Use icon contrast over background color for clarity.
- Keep blinking only for live state.
- Avoid multiple simultaneous animations on tiny display.

## Multi-Series Rotation

If user selected multiple series and `rotateSeries=true`:

- one compact frame per selected series
- max 3 frames
- preserve priority ordering
- never include unselected series

## User Visual Toggles

Supported preference fields:

- `displayMode`: `auto|ultra|balanced|detailed`
- `showSeriesLogo`: `true|false`
- `showSessionIcon`: `true|false`
- `liveBlink`: `true|false`
- `rotateSeries`: `true|false`

## Sample Poll Outputs

```json
{ "frames": [{ "text": "LIVE F1 R", "icon": "i41186", "iconAnimation": "blink" }] }
```

```json
{
  "frames": [
    { "text": "F1R 45M", "icon": "i41186" },
    { "text": "WECR 1H 10M", "icon": "i34230" }
  ]
}
```
