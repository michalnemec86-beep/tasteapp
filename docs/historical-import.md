# Historical CSV import

All historical imports must follow [`docs/beer-data-protocol.md`](./beer-data-protocol.md). That document is the canonical source of truth for brewery, brand, beer, beer-version and tasting identity.

## Required resolution order

For every source occurrence resolve:

1. producing **brewery for the tasting period**,
2. **brand**,
3. concrete **beer**,
4. matching historical **beer version**,
5. tasting + import ledger entry.

If any identity is materially ambiguous, leave the source row unresolved. Never guess in order to complete a batch.

## Source preservation

Keep enough raw source data to reconstruct the original record, including source signature + occurrence, date, quantity, packaging, source Plato/style, venue and note.

Current verified catalog values belong to the current beer/current version. Historical source values belong to the historical version and tasting.

Historical imports normally use `show_in_timeline=false` so archive reconstruction affects statistics without flooding the live timeline.

Exact identical source rows are separate occurrences unless there is evidence that the source itself contains an accidental duplicate.

## Statistics contract

- Beer: `tasting -> beer_id`
- Brand: `tasting -> beer -> brand_id`
- Brewery: `tasting -> beer_version -> brewery_id`

A tasting must contribute exactly once to each applicable statistic.

## Clean rebuild

The legacy production dataset was archived on 2026-09-15 in database schema `archive_20260915_reset`. The active beer catalog and tastings were reset. Only records re-approved under the canonical protocol may be inserted into the active dataset.

Do not use the archive tables as a statistics source. They are reference/rollback material only.
