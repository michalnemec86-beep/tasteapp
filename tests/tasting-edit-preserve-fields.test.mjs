import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actionSource = readFileSync(
  new URL("../app/tastings/actions.ts", import.meta.url), "utf8"
);
const editSource = actionSource.split("export async function updateTastingInModal(")[1]
  ?.split("export async function deleteTastingInModal(")[0];

test("tasting edit preserves fields absent from the submitted form", () => {
  assert.ok(editSource, "tasting edit action must exist");
  assert.match(editSource, /formData\.has\("place"\)\s*\?\s*\{ place: values\.place \|\| null \}/);
  assert.match(editSource, /formData\.has\("notes"\)\s*\?\s*\{ notes: values\.notes \|\| null \}/);
  assert.doesNotMatch(editSource, /(?<!\{ )place: values\.place \|\| null,\s*notes: values\.notes \|\| null,/);
});

test("new-tasting creation still writes submitted place and notes", () => {
  const createSource = actionSource.split("async function saveTastingCore(")[1]
    ?.split("export async function updateTastingInModal(")[0];
  assert.ok(createSource);
  assert.match(createSource, /place: values\.place \|\| null,/);
  assert.match(createSource, /notes: values\.notes \|\| null,/);
});
