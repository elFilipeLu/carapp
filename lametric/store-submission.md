# LaMetric Developer Portal Setup

Guide de configuration du portail LaMetric, aligne sur le code actuel.

## 1) Type d'app et Poll

- App type: `Indicator app`
- Communication type: `Poll`
- Poll URL de base: `https://<your-public-domain>/lametric/poll?token=<POLL_TOKEN>`
- Poll frequency: `30s` (recommande) ou `60s`

Notes securite:
- `POLL_TOKEN` protege `GET /lametric/poll`
- `API_TOKEN` est reserve aux routes admin/API (preferences, metrics, etc.)
- Ne pas exposer `API_TOKEN` dans l'URL du poll

## 2) Options a creer dans LaMetric (version simple)

Objectif: ne montrer que les choix essentiels a l'utilisateur final.

### Options visibles (recommandees)

- `series` - type `Multiple option`
  - Label UI: `Championnats`
  - Valeurs:
    - `F1`, `F2`, `F3`
    - `WEC`, `IMSA`, `GT3`, `LEMANS`
    - `MOTOGP`, `WRC`, `FORMULAE`, `INDYCAR`, `NASCAR`
  - Defaut recommande: `F1`, `WEC`

- `sessions` - type `Multiple option`
  - Label UI: `Types de session`
  - Valeurs:
    - `practice` = Essais libres
    - `qualifying` = Qualifications
    - `race` = Course
  - Defaut recommande: `qualifying`, `race`

- `tz` - type `Single option`
  - Label UI: `Fuseau horaire`
  - Valeurs recommandees:
    - `Europe/Paris`, `Europe/London`, `UTC`, `America/New_York`, `Asia/Tokyo`
  - Defaut recommande: `Europe/Paris`

- `displayMode` - type `Single option`
  - Label UI: `Affichage`
  - Valeurs: `auto`, `balanced`, `ultra`, `detailed`
  - Defaut recommande: `auto`

### Option basique utile (facultative)

- `favorites` - type `Text field`
  - Label UI: `Pilotes favoris (CSV)`
  - Format: `VER,LEC`
  - Defaut recommande: vide

### Option cachee / admin (ne pas exposer en premier)

- `rotateSeries` - type `Switch` (defaut `true`)
- `preset`, `profile`, `nextOnly`, `multipleUpcoming`, `results`, `liveAlerts`, `showSeriesLogo`, `showSessionIcon`, `liveBlink`

## 3) Priorite des options (comment l'API lit la config)

- `preset` pose une base de preferences
- `profile` charge ensuite les preferences stockees si present
- les options envoyees dans l'URL poll (series, sessions, etc.) override ce qui precede

Conseil pratique:
- expose seulement `series`, `sessions`, `tz`, `displayMode` (+ `favorites` si souhaite)
- garde toutes les options avancees pour plus tard

## 4) Exemple d'URL generee par LaMetric

Exemple typique (generee automatiquement avec options):

`https://<your-public-domain>/lametric/poll?token=<POLL_TOKEN>&series=F1,WRC,MOTOGP&sessions=qualifying,race&tz=Europe/Paris&displayMode=auto`

## 5) Verifications avant publication

- Endpoint health:
  - `GET /health`
- Poll JSON:
  - `GET /lametric/poll?token=<POLL_TOKEN>&preset=global_fan&tz=Europe/Paris`
  - Doit retourner `{ "frames": [...] }`
- Disponibilite des series:
  - `GET /providers/status`
  - Verifier `active_series` et `providers.ical.series_counts`

## 6) Store listing (suggestion)

- Name: `Motorsport Companion`
- Short description: `Live motorsport companion for F1, endurance, rally, bikes, and more.`
- Category: `Sport`
- Tags: `f1`, `wec`, `imsa`, `gt3`, `lemans`, `motogp`, `wrc`, `nascar`, `motorsport`
