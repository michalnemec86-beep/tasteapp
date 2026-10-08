import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const form = readFileSync(new URL("../app/tastings/new/TastingForm.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/tastings/actions.ts", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../supabase/migrations/20261008051313_add_tasting_submission_id.sql", import.meta.url), "utf8"
);

// Static contract checks; manual end-to-end coverage is documented separately.
test("form shows pending feedback and prevents a rapid second submit", () => {
  assert.match(form, /useFormStatus\(\)/);
  assert.match(form, /disabled=\{pending\}/);
  assert.match(form, /Ukládám ochutnávku/);
  assert.match(form, /submitInFlightRef\.current\) \{/);
  assert.match(form, /event\.preventDefault\(\)/);
});

test("one idempotency key persists throughout retries of the form", () => {
  assert.match(form, /submissionIdRef = useRef<string \| null>\(null\)/);
  assert.match(form, /if \(!submissionIdRef\.current\) submissionIdRef\.current = crypto\.randomUUID\(\)/);
  assert.match(form, /name="submissionId"/);
  assert.match(form, /submitInFlightRef\.current = false/);
});

test("server accepts a successful retry and handles unique-key races", () => {
  assert.match(actions, /\.eq\("user_id", user\.id\)/);
  assert.match(actions, /\.eq\("submission_id", submissionId\)/);
  assert.match(actions, /tastingError\?\.code === "23505"/);
  assert.match(actions, /if \(alreadySaved\) return \{ success: true \}/);
});

test("schema idempotency is per-submission, not content-deduplication", () => {
  assert.match(migration, /add column if not exists submission_id uuid/);
  assert.match(migration, /create unique index if not exists tastings_user_submission_id_uniq/);
  assert.match(migration, /\(user_id, submission_id\)/);
  assert.doesNotMatch(migration, /unique[^\n]*\(user_id, beer_id, tasted_on\)/i);
});
