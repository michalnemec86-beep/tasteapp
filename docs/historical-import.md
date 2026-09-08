# Historical CSV import

TasteApp historical imports use one normalized CSV and one generated transactional SQL file.

## Workflow

1. Convert the source export into the columns from `scripts/history-import-template.csv`.
2. Mark safe rows as `READY`. Any other status is skipped by the generator.
3. Generate SQL:

```bash
npm run import:history -- --file path/to/history.csv --user PROFILE_UUID --out history-import.sql
```

4. Run the generated SQL in Supabase SQL Editor.

The SQL resolves existing breweries and beers first, creates only genuinely missing catalog records, skips exact tasting duplicates, and inserts the remaining tastings. All writes run inside one transaction. A validation failure aborts the whole import.

## Important rules

- `existing_beer_id` may be supplied for a known catalog beer. In that case brewery/beer catalog fields may be blank.
- A new beer must have `brewery_name`, `beer_name`, and a valid `style_id`.
- A genuinely new brewery must also have `brewery_country`.
- Supported packaging values are `draft`, `bottle`, `can`, `pet`, `other`, or blank.
- Historical imports normally use `show_in_timeline=false` so old records affect statistics without flooding the current timeline.
- Do not commit real user tasting CSV files to the repository. Keep only the empty template in Git.
