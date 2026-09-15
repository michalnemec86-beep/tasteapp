# BeerApp canonical beer data protocol

This document is the single source of truth for catalog modelling, historical imports and statistics.

## Canonical hierarchy

BeerApp intentionally models only these business levels:

**brewery -> brand -> beer -> beer version -> tasting**

Ownership groups and parent corporations are out of scope. A company owning several breweries must never replace the real producing brewery in the catalog.

### Brewery

A brewery is the real producing brewery/site for a given beer version and period.

Examples:
- Pivovar Staropramen
- Pivovar Velké Popovice
- Plzeňský Prazdroj
- historical Pivovar Braník
- historical Amstel Brouwerij

The canonical brewery for statistics is stored on `beer_versions.brewery_id`.

`beers.brewery_id` is only a temporary compatibility cache for the current producing brewery. It must not be used for historical brewery statistics.

### Brand

A brand is the stable product/market identity between brewery and individual beer.

Examples:
- Braník
- Staropramen
- Velkopopovický Kozel
- Pilsner Urquell
- Gambrinus
- Heineken
- Amstel

A brand may survive a change of producing brewery. Ownership changes do not create a new brand.

The canonical brand is stored on `beers.brand_id`.

### Beer

A beer is a concrete product under one brand.

Examples:
- Braník 10°
- Braník Ležák 12°
- Kozel 11°
- Kozel Černý 10°
- Heineken Original
- Amstel Lager

### Beer version

A beer version represents the current or historical form of a beer. It contains period-specific properties such as Plato, ABV, IBU, style and, critically, the producing brewery.

A brand and beer can remain the same while the brewery changes between versions.

### Tasting

Every tasting points to exactly one `beer_id` and, once resolved, exactly one `beer_version_id`.

A tasting therefore contributes exactly once to beer, brand and brewery statistics.

## Required statistics paths

- **Beer statistics:** `tasting -> beer_id`
- **Brand statistics:** `tasting -> beer -> brand_id`
- **Brewery statistics:** `tasting -> beer_version -> brewery_id`

Never count brewery statistics through both the current beer brewery and a historical relation. Historical relationships must not duplicate a tasting.

## Approved examples

| Period / case | Brewery | Brand | Beer |
| --- | --- | --- | --- |
| Braník, current production | Pivovar Staropramen | Braník | Braník 10° |
| Braník, historical production | Pivovar Braník | Braník | Braník 10° |
| Staropramen | Pivovar Staropramen | Staropramen | Staropramen 10° |
| Kozel | Pivovar Velké Popovice | Velkopopovický Kozel | Kozel 11° |
| Pilsner Urquell | Plzeňský Prazdroj | Pilsner Urquell | Pilsner Urquell |
| Gambrinus produced in Plzeň | Plzeňský Prazdroj | Gambrinus | concrete Gambrinus product |
| Amstel, current production | verified current producing brewery | Amstel | Amstel Lager |
| Amstel, historical production | Amstel Brouwerij | Amstel | Amstel Lager |
| Heineken | verified producing brewery | Heineken | Heineken Original |

`Plzeňský Prazdroj` must not be used as the brewery for Kozel merely because the company owns the Velké Popovice brewery. Likewise ownership-group structure is not a BeerApp catalog level.

## Historical import rules

1. Preserve the source row exactly enough to reconstruct the original record: source identity, date, quantity, packaging, source Plato, venue and note.
2. Resolve, in order: **producing brewery for the tasting period -> brand -> beer -> beer version**.
3. Current verified catalog properties belong to the current beer/current version. Source historical properties belong to the historical version and tasting.
4. Never guess an ambiguous brewery, brand or product. Leave the source row unresolved for later research.
5. Exact repeated source records are real occurrences unless explicitly proven otherwise. Do not content-deduplicate them.
6. Historical imports use `show_in_timeline = false` unless explicitly requested otherwise.
7. Every imported tasting must have an import-ledger identity that makes reruns idempotent.
8. A historical brewery assignment may only be changed when supported by adequate evidence. A year alone is not evidence.
9. Ownership changes alone do not change the producing brewery or brand.
10. Before a batch is considered complete, verify row count, quantity total, unresolved rows and duplicate occurrences against the source.

## Clean-dataset policy (2026-09-15)

The pre-reset production dataset was archived in database schema `archive_20260915_reset` before the clean rebuild.

The active catalog was then reset to zero beers, breweries, brands and tastings. Static dictionaries and user profiles were retained.

Only records re-approved under this protocol may return to the active BeerApp dataset.

The archived data is reference material only and must never participate in active statistics.
