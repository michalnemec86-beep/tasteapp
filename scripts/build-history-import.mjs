#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const hasArg = (name) => args.includes(name);

if (hasArg('--help') || !getArg('--file') || !getArg('--user')) {
  console.log(`Usage:\n  node scripts/build-history-import.mjs --file <normalized.csv> --user <profile-uuid> [--out <import.sql>]\n\nThe CSV must contain a header. Rows with status other than READY are skipped.\nThe generated SQL is transactional: validation failure aborts the whole import.`);
  process.exit(hasArg('--help') ? 0 : 1);
}

const inputPath = path.resolve(getArg('--file'));
const outputPath = path.resolve(getArg('--out') ?? `${inputPath}.sql`);
const targetUserId = getArg('--user');

const REQUIRED_COLUMNS = [
  'source_row', 'status', 'existing_beer_id', 'brewery_name', 'brewery_country',
  'brewery_city', 'beer_name', 'style_id', 'beer_plato', 'beer_abv', 'beer_ibu',
  'tasted_on', 'tasted_at', 'packaging', 'quantity', 'tasting_plato', 'tasting_abv',
  'tasting_ibu', 'place', 'notes', 'show_in_timeline',
];

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }

  if (field.length > 0 || row.length > 0) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  if (quoted) throw new Error('CSV ends inside a quoted field.');
  if (rows.length < 2) throw new Error('CSV has no data rows.');

  const header = rows[0].map((v) => v.trim());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(', ')}`);

  return rows.slice(1).filter((r) => r.some((v) => v.trim() !== '')).map((values, index) => {
    const obj = {};
    header.forEach((key, i) => { obj[key] = values[i] ?? ''; });
    obj.__line = index + 2;
    return obj;
  });
}

function sqlText(value) {
  if (value == null || String(value).trim() === '') return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}
function sqlInt(value, label, line, nullable = true) {
  if (String(value ?? '').trim() === '') {
    if (nullable) return 'NULL';
    throw new Error(`Line ${line}: ${label} is required.`);
  }
  if (!/^-?\d+$/.test(String(value).trim())) throw new Error(`Line ${line}: ${label} must be an integer.`);
  return String(Number.parseInt(String(value).trim(), 10));
}
function sqlNum(value, label, line) {
  if (String(value ?? '').trim() === '') return 'NULL';
  const normalized = String(value).trim().replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) throw new Error(`Line ${line}: ${label} must be numeric.`);
  return normalized;
}
function sqlBool(value, label, line) {
  const v = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'ano'].includes(v)) return 'TRUE';
  if (['false', '0', 'no', 'ne', ''].includes(v)) return 'FALSE';
  throw new Error(`Line ${line}: ${label} must be true/false.`);
}
function validateDate(value, label, line, dateTime = false) {
  const v = String(value ?? '').trim();
  if (!v) throw new Error(`Line ${line}: ${label} is required.`);
  if (dateTime) {
    if (Number.isNaN(Date.parse(v))) throw new Error(`Line ${line}: ${label} is not a valid timestamp.`);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new Error(`Line ${line}: ${label} must be YYYY-MM-DD.`);
  }
  return sqlText(v);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const allRows = parseCsv(raw);
const readyRows = allRows.filter((r) => String(r.status).trim().toUpperCase() === 'READY');
const skippedRows = allRows.length - readyRows.length;
if (!readyRows.length) throw new Error('No READY rows found.');

const seenSourceRows = new Set();
const valueLines = readyRows.map((r) => {
  const line = r.__line;
  const sourceRow = sqlInt(r.source_row, 'source_row', line, false);
  if (seenSourceRows.has(sourceRow)) throw new Error(`Line ${line}: duplicate source_row ${sourceRow}.`);
  seenSourceRows.add(sourceRow);

  const existingBeerId = sqlInt(r.existing_beer_id, 'existing_beer_id', line, true);
  const breweryName = sqlText(r.brewery_name);
  const beerName = sqlText(r.beer_name);
  if (existingBeerId === 'NULL' && (breweryName === 'NULL' || beerName === 'NULL')) {
    throw new Error(`Line ${line}: brewery_name and beer_name are required when existing_beer_id is empty.`);
  }

  const packaging = String(r.packaging ?? '').trim().toLowerCase();
  if (packaging && !['draft', 'bottle', 'can', 'pet', 'other'].includes(packaging)) {
    throw new Error(`Line ${line}: unsupported packaging '${r.packaging}'.`);
  }

  const quantity = sqlInt(r.quantity || '1', 'quantity', line, false);
  if (Number(quantity) < 1) throw new Error(`Line ${line}: quantity must be >= 1.`);

  return `(${[
    sourceRow, existingBeerId, breweryName, sqlText(r.brewery_country), sqlText(r.brewery_city), beerName,
    sqlInt(r.style_id, 'style_id', line, true), sqlNum(r.beer_plato, 'beer_plato', line),
    sqlNum(r.beer_abv, 'beer_abv', line), sqlNum(r.beer_ibu, 'beer_ibu', line),
    validateDate(r.tasted_on, 'tasted_on', line), validateDate(r.tasted_at, 'tasted_at', line, true),
    sqlText(packaging || null), quantity, sqlNum(r.tasting_plato, 'tasting_plato', line),
    sqlNum(r.tasting_abv, 'tasting_abv', line), sqlNum(r.tasting_ibu, 'tasting_ibu', line),
    sqlText(r.place), sqlText(r.notes), sqlBool(r.show_in_timeline, 'show_in_timeline', line),
  ].join(', ')})`;
});

const targetSql = sqlText(targetUserId);
const sql = `-- Generated by scripts/build-history-import.mjs
-- Source: ${path.basename(inputPath)}
-- READY rows: ${readyRows.length}; skipped non-READY rows: ${skippedRows}
-- All writes are atomic. Any validation error rolls back the entire import.

BEGIN;

CREATE TEMP TABLE _history_import_rows (
  source_row integer PRIMARY KEY,
  existing_beer_id bigint,
  brewery_name text,
  brewery_country text,
  brewery_city text,
  beer_name text,
  style_id bigint,
  beer_plato numeric,
  beer_abv numeric,
  beer_ibu numeric,
  tasted_on date NOT NULL,
  tasted_at timestamptz NOT NULL,
  packaging text,
  quantity integer NOT NULL,
  tasting_plato numeric,
  tasting_abv numeric,
  tasting_ibu numeric,
  place text,
  notes text,
  show_in_timeline boolean NOT NULL,
  brewery_id bigint,
  beer_id bigint,
  tasting_exists boolean NOT NULL DEFAULT false
);

INSERT INTO _history_import_rows (
  source_row, existing_beer_id, brewery_name, brewery_country, brewery_city,
  beer_name, style_id, beer_plato, beer_abv, beer_ibu,
  tasted_on, tasted_at, packaging, quantity, tasting_plato, tasting_abv, tasting_ibu,
  place, notes, show_in_timeline
) VALUES
${valueLines.join(',\n')};

DO $$
DECLARE
  v_user uuid;
BEGIN
  BEGIN
    v_user := ${targetSql}::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Target user id is not a valid UUID';
  END;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user) THEN
    RAISE EXCEPTION 'Target user UUID does not exist in public.profiles';
  END IF;

  IF EXISTS (SELECT 1 FROM _history_import_rows WHERE quantity < 1) THEN
    RAISE EXCEPTION 'Import contains quantity < 1';
  END IF;

  IF EXISTS (
    SELECT 1 FROM _history_import_rows
    WHERE packaging IS NOT NULL AND packaging NOT IN ('draft','bottle','can','pet','other')
  ) THEN
    RAISE EXCEPTION 'Import contains unsupported packaging';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _history_import_rows r
    LEFT JOIN public.beer_styles s ON s.id = r.style_id
    WHERE r.existing_beer_id IS NULL AND (r.style_id IS NULL OR s.id IS NULL)
  ) THEN
    RAISE EXCEPTION 'At least one new beer has a missing or invalid style_id';
  END IF;

  IF EXISTS (
    SELECT existing_beer_id
    FROM _history_import_rows
    WHERE existing_beer_id IS NOT NULL
    GROUP BY existing_beer_id
    HAVING NOT EXISTS (SELECT 1 FROM public.beers b WHERE b.id = existing_beer_id)
  ) THEN
    RAISE EXCEPTION 'At least one existing_beer_id does not exist';
  END IF;
END $$;

UPDATE _history_import_rows r
SET beer_id = r.existing_beer_id, brewery_id = b.brewery_id
FROM public.beers b
WHERE r.existing_beer_id = b.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM _history_import_rows r
    WHERE r.beer_id IS NULL AND (
      SELECT count(*) FROM public.breweries b
      WHERE lower(regexp_replace(btrim(b.name), '\\s+', ' ', 'g')) =
            lower(regexp_replace(btrim(r.brewery_name), '\\s+', ' ', 'g'))
    ) > 1
  ) THEN
    RAISE EXCEPTION 'Ambiguous brewery name match in live database';
  END IF;
END $$;

UPDATE _history_import_rows r
SET brewery_id = (
  SELECT b.id FROM public.breweries b
  WHERE lower(regexp_replace(btrim(b.name), '\\s+', ' ', 'g')) =
        lower(regexp_replace(btrim(r.brewery_name), '\\s+', ' ', 'g'))
  LIMIT 1
)
WHERE r.beer_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM _history_import_rows
    WHERE beer_id IS NULL AND brewery_id IS NULL
      AND (brewery_country IS NULL OR btrim(brewery_country) = '')
  ) THEN
    RAISE EXCEPTION 'At least one new brewery has no brewery_country';
  END IF;

  IF EXISTS (
    SELECT lower(regexp_replace(btrim(brewery_name), '\\s+', ' ', 'g'))
    FROM _history_import_rows
    WHERE beer_id IS NULL AND brewery_id IS NULL
    GROUP BY 1
    HAVING count(DISTINCT coalesce(brewery_country,'')) > 1
        OR count(DISTINCT coalesce(brewery_city,'')) > 1
  ) THEN
    RAISE EXCEPTION 'Conflicting metadata for the same new brewery';
  END IF;
END $$;

INSERT INTO public.breweries (name, country, city)
SELECT min(brewery_name), min(brewery_country), nullif(min(coalesce(brewery_city,'')), '')
FROM _history_import_rows
WHERE beer_id IS NULL AND brewery_id IS NULL
GROUP BY lower(regexp_replace(btrim(brewery_name), '\\s+', ' ', 'g'));

UPDATE _history_import_rows r
SET brewery_id = (
  SELECT b.id FROM public.breweries b
  WHERE lower(regexp_replace(btrim(b.name), '\\s+', ' ', 'g')) =
        lower(regexp_replace(btrim(r.brewery_name), '\\s+', ' ', 'g'))
  LIMIT 1
)
WHERE r.beer_id IS NULL AND r.brewery_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM _history_import_rows WHERE brewery_id IS NULL) THEN
    RAISE EXCEPTION 'Unable to resolve a brewery_id after brewery creation';
  END IF;

  IF EXISTS (
    SELECT brewery_id, lower(regexp_replace(btrim(beer_name), '\\s+', ' ', 'g'))
    FROM _history_import_rows
    WHERE beer_id IS NULL
    GROUP BY 1,2
    HAVING count(DISTINCT coalesce(style_id::text,'')) > 1
        OR count(DISTINCT coalesce(beer_plato::text,'')) > 1
        OR count(DISTINCT coalesce(beer_abv::text,'')) > 1
        OR count(DISTINCT coalesce(beer_ibu::text,'')) > 1
  ) THEN
    RAISE EXCEPTION 'Conflicting catalog metadata for the same new beer';
  END IF;

  IF EXISTS (
    SELECT 1 FROM _history_import_rows r
    WHERE r.beer_id IS NULL AND (
      SELECT count(*) FROM public.beers b
      WHERE b.brewery_id = r.brewery_id
        AND lower(regexp_replace(btrim(b.name), '\\s+', ' ', 'g')) =
            lower(regexp_replace(btrim(r.beer_name), '\\s+', ' ', 'g'))
    ) > 1
  ) THEN
    RAISE EXCEPTION 'Ambiguous beer name match in live database';
  END IF;
END $$;

UPDATE _history_import_rows r
SET beer_id = (
  SELECT b.id FROM public.beers b
  WHERE b.brewery_id = r.brewery_id
    AND lower(regexp_replace(btrim(b.name), '\\s+', ' ', 'g')) =
        lower(regexp_replace(btrim(r.beer_name), '\\s+', ' ', 'g'))
  LIMIT 1
)
WHERE r.beer_id IS NULL;

CREATE TEMP TABLE _history_missing_beers AS
SELECT brewery_id, min(beer_name) AS beer_name, min(style_id) AS style_id,
       min(beer_plato) AS plato, min(beer_abv) AS abv, min(beer_ibu) AS ibu
FROM _history_import_rows
WHERE beer_id IS NULL
GROUP BY brewery_id, lower(regexp_replace(btrim(beer_name), '\\s+', ' ', 'g'));

INSERT INTO public.beers (name, brewery_id, style_id, plato, abv, ibu)
SELECT beer_name, brewery_id, style_id, plato, abv, ibu
FROM _history_missing_beers
ORDER BY brewery_id, beer_name;

UPDATE _history_import_rows r
SET beer_id = (
  SELECT b.id FROM public.beers b
  WHERE b.brewery_id = r.brewery_id
    AND lower(regexp_replace(btrim(b.name), '\\s+', ' ', 'g')) =
        lower(regexp_replace(btrim(r.beer_name), '\\s+', ' ', 'g'))
  LIMIT 1
)
WHERE r.beer_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM _history_import_rows WHERE beer_id IS NULL) THEN
    RAISE EXCEPTION 'Unable to resolve a beer_id after beer creation';
  END IF;
END $$;

UPDATE _history_import_rows r
SET tasting_exists = EXISTS (
  SELECT 1 FROM public.tastings t
  WHERE t.user_id = ${targetSql}::uuid
    AND t.beer_id = r.beer_id
    AND t.tasted_on = r.tasted_on
    AND t.tasted_at = r.tasted_at
    AND t.packaging IS NOT DISTINCT FROM r.packaging
    AND t.quantity = r.quantity
    AND t.plato IS NOT DISTINCT FROM r.tasting_plato
    AND t.abv IS NOT DISTINCT FROM r.tasting_abv
    AND t.ibu IS NOT DISTINCT FROM r.tasting_ibu
    AND t.place IS NOT DISTINCT FROM r.place
    AND t.notes IS NOT DISTINCT FROM r.notes
    AND t.show_in_timeline = r.show_in_timeline
);

CREATE TEMP TABLE _history_import_stats AS
SELECT
  (SELECT count(*) FROM _history_import_rows) AS ready_rows,
  (SELECT count(*) FROM _history_missing_beers) AS new_beers,
  (SELECT count(DISTINCT brewery_id) FROM _history_import_rows) AS touched_breweries,
  (SELECT count(*) FROM _history_import_rows WHERE tasting_exists) AS skipped_existing_tastings,
  (SELECT count(*) FROM _history_import_rows WHERE NOT tasting_exists) AS new_tastings;

INSERT INTO public.tastings (
  user_id, beer_id, tasted_on, tasted_at, packaging, quantity,
  plato, abv, ibu, place, notes, show_in_timeline
)
SELECT
  ${targetSql}::uuid, beer_id, tasted_on, tasted_at, packaging, quantity,
  tasting_plato, tasting_abv, tasting_ibu, place, notes, show_in_timeline
FROM _history_import_rows
WHERE NOT tasting_exists
ORDER BY tasted_at, source_row;

COMMIT;

SELECT json_build_object(
  'ready_rows', ready_rows,
  'skipped_non_ready_rows', ${skippedRows},
  'new_beers', new_beers,
  'touched_breweries', touched_breweries,
  'skipped_existing_tastings', skipped_existing_tastings,
  'inserted_tastings', new_tastings
) AS import_result
FROM _history_import_stats;
`;

fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`Generated ${outputPath}`);
console.log(`READY rows: ${readyRows.length}; skipped non-READY rows: ${skippedRows}`);
