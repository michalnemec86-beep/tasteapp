# PIVNÍK RADAR · pilot 2026-10-18

Internal, admin-only pilot monitoring Czech breweries. Catalogue is authoritative. Radar has no path that writes to `beers`, `beer_versions`, `tastings`, brewery identities or catalogue events. It only stages findings. Publishing a beer remains the existing catalogue-admin workflow.

## Deployed components
- Database project `nsnvryyocwzfwxiwhqca` migrations: `pivnik_radar_pilot_admin_only`, `pivnik_radar_canonical_matching`, `pivnik_radar_hourly_worker_schedule`.
- Tables: `radar_breweries`, `radar_sources`, `radar_candidates`, `radar_runs`. All have RLS. No ordinary authenticated user may read Radar rows, only the existing catalogue-admin identity.
- Edge Function: `pivnik-radar`. Cron authentication is a 256-bit random Vault secret; admin manual runs verify the current user's JWT. Secrets never go to the browser or repository.
- Hourly cron at minute 7, processing at most two due sources per invocation, with row locks and staggered next due times.
- Per-request safeguards: HTTPS-only sources, same-origin redirects, robots.txt fail-closed, max 1MB HTML, short request timeouts, no automatic image copying; retry backoff.
- The settings link appears only in catalogue admin mode. The route and write actions independently recheck the administrator identity and mode.

## First four requested identities
- Andělský pivovar: brewery ID 75
- Pivovar Bašta: brewery ID 215
- Muflon: brewery ID 241, canonical identity **Pivovar Kunratice** (Muflon is its beer brand, not a second brewery)
- Pivovar Spojovna: brewery ID 696

Pilot is 30 verified Czech brewery IDs and 31 public site URLs. Source adapters vary:
- `headings`, `woocommerce`, `news`: extracts tentative names for administrator review, against canonical product/versions.
- `change_only`: currently records site changes but does **not** pretend it can extract a definitive new beer from a whole website. Product-specific adapters can be added later.

## Runbook
Open `/settings/radar` in catalogue admin mode. Check the source and current catalogue before resolving each finding; `reviewed` merely closes the work item and never creates a beer. `ignored` is retained with audit note rather than deleted. Package volume and multi-packs do not create separate beer IDs. Marking a candidate `new` reopens it. If a website blocks crawling, retain the error/backoff and obtain a permitted alternative feed/source. If the worker affects performance, disable the cron job `pivnik-radar-hourly` without deleting staged data.

## Validation
Live invocation: two sources per run, returned HTTP 200, no catalogue writes. RLS tested using a non-admin authenticated session impersonation (zero visible Radar rows). Baseline catalogue count after initial runs was 2,740 beers and 2,566 tastings, unchanged. Early false-positive menu portions and a Muflon 3PACK were ignored in the staging queue; extraction is deliberately conservative and requires human validation.
