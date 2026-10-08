import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const actions = source("app/tastings/actions.ts");
const newForm = source("app/tastings/new/TastingForm.tsx");
const editForm = source("app/EditTastingModalClient.tsx");
const edit = actions.split("export async function updateTastingInModal(")[1]
  ?.split("export async function deleteTastingInModal(")[0];

test("changing unrelated tasting fields preserves unchanged legacy place and notes", () => {
  assert.ok(edit);
  assert.match(edit, /formData\.has\("placeChanged"\)/);
  assert.match(edit, /values\.placeChanged \? await resolveTastingPlace/);
  assert.match(edit, /formData\.has\("place"\) \? \{ place: values\.place \|\| null \} : \{\}/);
  assert.match(edit, /\.\.\.placeUpdate,/);
  assert.match(edit, /formData\.has\("notes"\) \? \{ notes: values\.notes \|\| null \} : \{\}/);
});

test("removing notes from new and edit forms never sends a blank note that erases old text", () => {
  assert.doesNotMatch(newForm, /name="notes"/);
  assert.doesNotMatch(editForm, /name="notes"/);
  assert.match(actions, /const notes = String\(formData\.get\("notes"\) \|\| ""\)\.trim\(\)/);
  assert.match(actions, /notes: values\.notes \|\| null/);
});
