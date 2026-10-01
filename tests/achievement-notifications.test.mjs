import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
function compile(relative) {
  const filename = root + relative;
  const source = new Module(filename);
  source._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return source.exports;
}
const definitions = compile('lib/achievements.ts');
let user, rows, updates, databaseCalls;
const supabase = {
  auth: { getUser: async () => ({ data: { user } }) },
  from(table) {
    assert.equal(table, 'user_achievements');
    databaseCalls++;
    const filters = [];
    let values;
    const chain = {
      select: () => chain,
      eq: (key, value) => { filters.push([key, value]); return chain; },
      is: (key, value) => { filters.push([key, value]); return chain; },
      order: () => chain,
      update: (value) => { values = value; return chain; },
      then(resolve) {
        const data = rows.filter(row => filters.every(([key, value]) => String(row[key]) === String(value)));
        if (values) {
          updates.push({ values, filters });
          data.forEach(row => Object.assign(row, values));
        }
        resolve({ data, error: null });
      },
    };
    return chain;
  },
};
const original = Module._load;
Module._load = function(request, ...args) {
  if (request === '@/lib/achievements') return definitions;
  if (request === '@/lib/features') return { FEATURES: { achievements: true } };
  if (request === '@/lib/supabase/server') return { createClient: async () => supabase };
  return original.call(this, request, ...args);
};
const { getPendingAchievementNotifications, dismissAchievementNotification } = compile('app/achievements/actions.ts');
Module._load = original;
const row = (id, overrides = {}) => ({ id: String(id), user_id: 'own', achievement_key: 'beers_50',
  show_in_timeline: true, notification_seen_at: null, ...overrides });
function reset() {
  user = { id: 'own' };
  rows = []; updates = []; databaseCalls = 0;
}

test('pending notifications include only own new, visible, known awards', async () => {
  reset();
  rows = [row(1), row(2, { user_id: 'other' }), row(3, { notification_seen_at: '2026-10-01' }),
    row(4, { show_in_timeline: false }), row(5, { achievement_key: 'removed_award' }),
    row(6, { achievement_key: 'first_tasting' })];
  const result = await getPendingAchievementNotifications();
  assert.equal(result.userId, 'own');
  assert.deepEqual(result.notifications.map(item => item.id), ['1', '6']);
  assert.equal(result.notifications[0].achievement.medal, 'bronze');
});

test('closing an award persists only its own acknowledgement and prevents repetition', async () => {
  reset(); rows = [row(1), row(2), row(3, { user_id: 'other' })];
  await dismissAchievementNotification('1');
  assert.ok(rows[0].notification_seen_at);
  assert.equal(rows[1].notification_seen_at, null);
  assert.deepEqual(Object.keys(updates[0].values), ['notification_seen_at']);
  await dismissAchievementNotification('3');
  assert.equal(rows[2].notification_seen_at, null);
  assert.deepEqual((await getPendingAchievementNotifications()).notifications.map(item => item.id), ['2']);
});

test('signed-out users cannot fetch or dismiss notifications; invalid IDs never reach the database', async () => {
  reset(); user = null; rows = [row(1)];
  assert.deepEqual(await getPendingAchievementNotifications(), { userId: null, notifications: [] });
  await dismissAchievementNotification('1');
  assert.equal(databaseCalls, 0);
  user = { id: 'own' };
  for (const id of ['', '-1', '1.5', '1,2', 'anything', '1'.repeat(21)]) {
    await assert.rejects(dismissAchievementNotification(id));
  }
  assert.equal(databaseCalls, 0);
});
