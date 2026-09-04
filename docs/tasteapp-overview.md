# TasteApp – architecture overview

Last reviewed: 2026-09-04  
Reference application state: commit `9d994f6` (`Add optional profile names`)

This document is a compact technical map of TasteApp. Its purpose is to make it possible to understand the application quickly in a new development thread without reconstructing architectural decisions from conversation history.

## 1. What TasteApp is

TasteApp is a private multi-user beer tasting journal combined with a shared beer and brewery catalog.

The application has two important data layers:

1. **Shared catalog data**
   - beers
   - breweries
   - beer styles
   - hops
   - countries
   - brewery history and relations

2. **User-specific activity**
   - tastings
   - profiles
   - achievements
   - profile statistics

A tasting belongs to one user. A catalog beer or brewery is shared by all users.

## 2. Technology

Frontend and application framework:

- Next.js App Router
- React 19
- TypeScript
- Server Components
- Client Components where interaction is needed
- Next.js Server Actions

Backend:

- Supabase PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- `@supabase/ssr`

Deployment:

- GitHub repository: `michalnemec86-beep/tasteapp`
- production on Vercel
- production URL: `https://tasteapp-eosin.vercel.app`

Maps and UI:

- Leaflet / React Leaflet
- react-svg-worldmap
- Lucide icons
- Radix UI / shadcn-derived primitives
- Tailwind is installed, but a substantial part of TasteApp styling is custom CSS and inline React styles

## 3. Important repository structure

```text
app/
  page.tsx
  AppNav.tsx
  AuthSessionSync.tsx
  auth/
  beers/
  breweries/
  profiles/
  stats/
  tastings/

lib/
  achievements.ts
  achievement-sync.ts
  packaging.ts
  profileStats.ts
  stats.ts
  timeline-visual.ts
  supabase/

components/
  home/
  stats/
  ui/

database/migrations/
```

## 4. Main routes

### `/`

Main Timeline. It combines tasting events, achievement events, profile identity, Brewery of the Day, selected statistics, create tasting modal, and edit/delete of the current user's tasting.

### `/stats`

Global or user-filtered statistics. Supports filters for user, year, month and ranking sort mode.

### `/beers`

Shared catalog view of **tasted beers only**.

A beer may exist in the shared catalog without ever being tasted, but `/beers` intentionally filters out catalog-only beers. Catalog-only beers are visible under their brewery instead.

### `/breweries`

Shared brewery catalog with brewery list, active/closed state, geographic data, maps, beer assortment, total consumed quantity and per-user brewery statistics.

### `/breweries/[id]`

Brewery detail with metadata, catalog beers, beer style, Plato, ABV, IBU, hops, historical names, historical brewery relations and admin beer-catalog controls.

### `/profiles`

User directory.

### `/profiles/[id]`

Detailed user profile with identity, statistics, activity, beer DNA, breweries, countries, hops, packaging, technical records and achievement journeys.

### `/me`

Resolves to the currently logged-in user's profile.

### `/tastings/new`

Standalone tasting creation page. The main UI normally uses the tasting modal from Timeline.

## 5. Core domain model

```text
profiles
   |
   | user_id
   v
tastings
   |
   | beer_id
   v
beers
   |
   +---- brewery_id ----> breweries
   |
   +---- style_id ------> beer_styles
   |
   +---- beer_hops -----> hops
```

Other important structures:

```text
breweries
   +---- brewery_name_history
   +---- brewery_relations

profiles
   +---- user_achievements

brewery_of_day
   +---- brewery_id ----> breweries
```

## 6. Tastings vs shared catalog data

This distinction is fundamental.

A tasting represents a historical user event. Important tasting fields include:

- `user_id`
- `beer_id`
- `tasted_on`
- `tasted_at`
- `packaging`
- `quantity`
- `plato`
- `abv`
- `ibu`
- `place`
- `notes`

`plato`, `abv` and `ibu` are stored on the tasting itself intentionally. They represent the values recorded for that tasting even if the shared catalog beer is edited later.

Shared entities such as beer, brewery, style and hops are catalog data used by all users.

## 7. Quantity semantics

`quantity` means how many units were consumed during one tasting record.

Example:

```text
one tasting row
quantity = 3
```

means three consumed beers, not three tasting records.

Aggregate consumption statistics generally use:

```text
quantity ?? 1
```

Therefore quantity affects totals and rankings such as beer, brewery, style, country, hop and packaging consumption.

Unique discovery statistics are not multiplied by quantity. Three units of the same beer still mean one unique beer, one unique brewery and one unique style.

## 8. Creating a tasting

The main tasting server logic lives in:

```text
app/tastings/actions.ts
```

Creation flow:

1. authenticate user
2. validate form
3. resolve country
4. resolve or create brewery
5. resolve beer style
6. resolve or create beer
7. resolve hops
8. attach hops to beer
9. create tasting
10. synchronize achievements
11. revalidate affected pages

### Important side effect

Creating a new tasting can currently modify shared catalog data.

When an existing beer is resolved during creation, supplied values may update its brewery, style, Plato, ABV and IBU. An existing brewery may also get its country updated.

This is current behavior and must be considered before changing tasting creation logic.

## 9. Editing a tasting

Editing is intentionally different from creation.

A user may edit only their own tasting. The server action verifies ownership before updating.

During tasting edit:

- an existing catalog beer must be selected
- the tasting row is updated
- the shared beer catalog is not rewritten

This separation was introduced intentionally so a normal user's tasting edit does not unexpectedly change shared catalog data.

## 10. Deleting a tasting

A user may delete only their own tasting.

Deletion verifies ownership before and during the delete query.

Deleting a tasting does not delete the shared catalog beer.

## 11. Shared beer catalog

Beer catalog entities primarily use:

```text
beers
beer_styles
hops
beer_hops
```

A beer belongs to one brewery and may have style, Plato, ABV, IBU and multiple hops.

A beer may exist without tastings. This allows a brewery detail to contain its known assortment before all beers have actually been tasted.

## 12. Catalog beer administration

Dedicated catalog beer create/edit/delete actions are in:

```text
app/breweries/actions.ts
```

These actions are restricted server-side to the catalog administrator.

Current admin user ID:

```text
17be5dc3-a3f9-4fd2-ae90-dee7692034fc
```

Current admin system name:

```text
Nachmelený admin
```

Admin is visually marked with an amber `◆`.

A catalog beer may be deleted only if it has no tasting records. If at least one tasting exists, deletion is rejected.

## 13. Brewery model

The brewery catalog contains fields such as:

- name
- city
- country
- address
- website
- founded year
- closed year
- latitude
- longitude

Database validation protects valid year ranges, year ordering and valid latitude/longitude ranges.

## 14. Brewery statistics

Two labels intentionally mean different things.

### Sortiment

Number of distinct catalog beers belonging to the brewery. It includes catalog beers that have never been tasted.

### Vypito

Sum of tasting quantities for all beers belonging to the brewery.

Example:

```text
beer A: quantity 2
beer B: quantity 3

Sortiment = 2
Vypito = 5
```

Inside the detailed beer list, the displayed `×` value may still represent the number of tasting records for that beer rather than quantity. This distinction is intentional.

## 15. Brewery name history

Table:

```text
brewery_name_history
```

Tracks previous brewery names and their periods. Important fields include brewery ID, previous name, from year and changed year.

The current brewery name remains stored directly on `breweries`.

## 16. Brewery historical relations

Table:

```text
brewery_relations
```

Supported relation types:

```text
continues_as
branches_into
merges_into
related_to
```

Relations may contain source brewery, destination brewery, relation type, relation year and note.

The brewery detail can display these relations in both directions. Editing UI for relations is not currently implemented.

## 17. Brewery of the Day

Table:

```text
brewery_of_day
```

The day is evaluated in timezone `Europe/Prague`.

The homepage attempts to select a brewery not previously used as Brewery of the Day. When all breweries have been used, the candidate pool effectively resets to all breweries.

The selected brewery is stored in the database so all users see the same Brewery of the Day for that date.

Brewery of the Day also participates in achievement progress.

## 18. Profiles

Important profile identity fields:

```text
display_name
real_name
avatar_url
```

### `display_name`

Primary system identity. It is intended to remain the main public nickname.

### `real_name`

Optional secondary personal name. A user may add it, change it or delete it.

Blank input is normalized to `null` and maximum length is 60 characters.

Database permissions were tightened so authenticated users have update permission specifically for `real_name`, while RLS still limits users to their own profile row.

## 19. Administrator identity

The administrator intentionally has the same kind of system nickname as other users:

```text
Nachmelený admin
```

Admin status is shown subtly using an amber `◆`.

Personal name remains secondary, for example:

```text
Nachmelený admin ◆
Michal
```

## 20. Statistics architecture

General ranking calculations live in:

```text
lib/stats.ts
```

Profile statistics live in:

```text
lib/profileStats.ts
```

General rankings are quantity-aware.

Profile statistics calculate total quantity, unique beers, breweries, styles, countries and hops, first/last tasting, monthly/yearly activity, active periods, weighted ABV/IBU/Plato and technical records such as strongest or bitterest beer.

Technical values use tasting values, not current catalog values.

## 21. Achievement system

Core definitions:

```text
lib/achievements.ts
```

Synchronization:

```text
lib/achievement-sync.ts
```

Achievement V2 launch timestamp:

```text
2026-08-20T15:21:00+02:00
```

Achievement categories include first tasting, unique beers, unique breweries, Brewery of the Day, beer styles, hops and countries.

Progressive medal levels include cloth, wood, bronze, silver, gold, diamond and master. Countries use a slightly different sequence and skip diamond.

### Permanent achievement rule

Once a level has been earned, deleting later tastings must not reduce the user's achieved medal level.

Stored achievement history therefore acts as a permanent floor. Older achievement rows are retained so Timeline can preserve achievement-promotion history.

## 22. Authentication architecture

Supabase authentication is used throughout. Server pages normally call:

```text
supabase.auth.getUser()
```

and redirect unauthenticated users to `/auth/login`.

Request/session synchronization uses:

```text
lib/supabase/proxy.ts
```

The proxy propagates Supabase cookies and response headers.

## 23. Long-lived browser session synchronization

Global component:

```text
app/AuthSessionSync.tsx
```

It addresses stale browser tabs and server/client auth desynchronization.

It listens for `TOKEN_REFRESHED` and `SIGNED_OUT` and refreshes Next.js server state.

When a browser tab becomes active after at least 60 seconds of inactivity it requests the current Supabase session and refreshes server-rendered state.

There is intentionally no periodic hard reload.

## 24. Revalidation

Server mutations use `revalidatePath()`.

A tasting mutation normally revalidates routes such as:

```text
/
/stats
/beers
/tastings
/profiles
/profiles/[userId]
```

Catalog mutations additionally revalidate brewery pages and related catalog views.

When adding a new server mutation, consider all views that derive data from the changed entity.

## 25. UI design language

TasteApp uses a dark beer-inspired visual identity.

Important warm palette:

```text
yellow       #f2b63f
orange       #e88835
red          #d65b42
green        #9cad47
deep green   #7f9840
bronze       #b77a36
```

Blue is intentionally avoided.

Reusable building blocks include `PageHero`, `AppIcon`, `taste-card`, `taste-button-primary`, `taste-button-secondary` and `taste-label`.

Major pages use dedicated hero imagery from `public/images/heroes/`.

## 26. Maps

TasteApp currently contains multiple map concepts:

- world maps for country-level beer and brewery statistics
- Czech brewery map using brewery GPS coordinates

Brewery coordinates are stored directly on the brewery record.

## 27. Database migrations currently tracked

Current migration files:

```text
001_brewery_catalog_v2.sql
002_brewery_of_day.sql
003_brewery_name_history_periods.sql
004_brewery_relations.sql
005_profile_real_name.sql
```

Important limitation: these migrations do **not** represent the complete original TasteApp schema.

Core tables such as profiles, tastings, beers, beer_styles, hops, beer_hops, countries and user_achievements were created before the current migration history and their original definitions are not fully reconstructed in Git.

Therefore do not assume that running only `database/migrations/` on an empty PostgreSQL database recreates the entire production database.

## 28. RLS and application authorization

Security is split between:

1. Supabase RLS / PostgreSQL grants
2. explicit server-side checks in actions

Examples:

- profile RLS restricts profile updates to the user's own row
- column-level grant restricts normal authenticated profile updates to `real_name`
- tasting actions explicitly verify ownership
- catalog beer actions explicitly verify the administrator UUID

Do not rely purely on UI visibility for privileged actions.

## 29. Important authorization caveat

Catalog beer administration is admin-only.

However, brewery management is currently less restrictive. Brewery creation/editing and brewery name-history management use authenticated-user checks rather than the catalog-admin UUID. The current database migrations for brewery history and relations also allow broad authenticated management.

This distinction is worth remembering if TasteApp later moves toward stricter administrator roles.

## 30. Important business invariants

Preserve these unless the product decision explicitly changes:

1. A tasting belongs to exactly one user.
2. Users edit and delete only their own tasting records.
3. Shared catalog data is separate from tasting history.
4. Catalog-only beers are allowed.
5. `/beers` shows tasted beers only.
6. Brewery detail may show untasted catalog beers.
7. Historical tasting Plato / ABV / IBU remain on the tasting.
8. Aggregate consumption uses `quantity`.
9. Unique counts do not multiply by `quantity`.
10. Earned achievements are permanent.
11. Normal users may change only their own optional personal name.
12. Admin-only actions must be enforced server-side, not only hidden in UI.
13. A catalog beer with existing tastings must not be deleted.

## 31. Development workflow

Preferred workflow:

1. work on `brewery-catalog-v2`
2. make one small logical change
3. run build when code changed
4. run `git diff --check`
5. inspect diff/status
6. test locally in browser
7. commit only after the change works
8. fast-forward `main`
9. push `main`
10. synchronize `brewery-catalog-v2`
11. test production

Local app:

```text
http://127.0.0.1:3000
```

Production:

```text
https://tasteapp-eosin.vercel.app
```

Local and production currently use the same Supabase database. Therefore a direct database mutation made during local development can immediately affect production data.

## 32. Deployment workflow

Typical deployment sequence:

```bash
git switch main
git pull --ff-only origin main
git merge --ff-only brewery-catalog-v2
git push origin main

git switch brewery-catalog-v2
git merge --ff-only main
git push origin brewery-catalog-v2
```

Vercel deploys production from `main`.

## 33. Current technical debt / cleanup candidates

These are not necessarily bugs.

### README

The root `README.md` is still largely the original Next.js + Supabase starter README and does not describe TasteApp.

### Old starter files

Some original starter/tutorial components and `/protected` routes still remain in the repository. They can eventually be removed after confirming nothing references them.

### Large files

Several files have grown substantially, including:

```text
app/page.tsx
app/breweries/BreweryTableClient.tsx
app/breweries/CatalogBeerCreateModalClient.tsx
app/breweries/CatalogBeerEditModalClient.tsx
app/profiles/[id]/page.tsx
```

They are candidates for later decomposition, but should not be refactored merely for aesthetics while active functionality is stable.

### Repeated normalization logic

Accent-insensitive text normalization exists in several files. A shared utility may eventually reduce duplication.

### Hard-coded admin ID

The catalog administrator UUID is currently hard-coded in several application locations. A future role/permission system would be cleaner, but the current implementation is simple and explicit.

## 34. Paused / planned areas

Known areas intentionally unfinished or postponed:

- brewery relations admin UI
- larger brewery importer experiment
- mobile / PWA as a possible future direction

The larger brewery importer is separate from the already deployed quick JSON form helpers.

## 35. Quick JSON catalog input

The application contains helper UI for fast structured data entry. The beer catalog quick input fills the normal form from JSON and does not automatically save data.

Example concept:

```json
{
  "name": "Kozel 11",
  "style": "Světlý ležák",
  "plato": 11,
  "abv": 4.6,
  "ibu": 25,
  "hops": [
    "Sládek",
    "Žatecký poloraný červeňák"
  ]
}
```

Canonical style names and aliases are resolved against the existing catalog.

## 36. Beer style naming convention

TasteApp uses concise canonical style names. Country or language qualifiers should generally not be added unless they represent a genuinely distinct catalog style.

Examples:

```text
Světlý ležák
Tmavý ležák
Polotmavý ležák
Pilsner
Žitný ležák
```

Aliases may still be stored for matching imports and user input.

## 37. Source of truth hierarchy

When architectural information conflicts, use this order:

1. current production database behavior
2. current `main` code
3. tracked migrations
4. this document
5. conversation history

This document is descriptive, not authoritative over the running application.

## 38. Updating this document

Update `docs/tasteapp-overview.md` when changing any of these:

- major database tables or relationships
- authorization model
- admin model
- tasting/catalog separation
- quantity semantics
- achievement semantics
- major route structure
- deployment workflow
- shared database behavior
- architecture-level feature additions

Small visual tweaks do not require an update.

## 39. Short mental model

```text
TasteApp
│
├── Timeline
│   ├── tastings
│   └── achievements
│
├── Shared catalog
│   ├── beers
│   ├── breweries
│   ├── styles
│   ├── hops
│   └── countries
│
├── Users
│   ├── profiles
│   ├── own tastings
│   └── permanent achievement progress
│
├── Statistics
│   ├── quantity-aware totals
│   └── unique discovery counts
│
└── Supabase
    ├── PostgreSQL
    ├── Auth
    └── RLS
```

The most important conceptual boundary is:

> **A tasting is personal history. A beer and brewery are shared catalog entities.**

Preserve that distinction when adding new features.
