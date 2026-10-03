import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import Module from 'node:module';
import React from 'react';

const origin = 'https://tasteapp-eosin.vercel.app';
function edge(fetch) {
  let handler;
  const source = fs.readFileSync(new URL('../supabase/functions/complete-initial-password/index.ts', import.meta.url), 'utf8').replace(/^import .*;\n/, '');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    Deno: { env: { get: key => ({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'private' })[key] }, serve: fn => { handler = fn; } },
    Request, Response, fetch, console: { error() {} },
  });
  return (method, token) => handler(new Request('https://example.org', { method, headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }));
}

test('browser preflight succeeds without authentication or backend requests', async () => {
  const response = await edge(() => { throw new Error('must not fetch'); })('OPTIONS');
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.match(response.headers.get('access-control-allow-headers'), /content-type/);
  assert.match(response.headers.get('access-control-allow-methods'), /POST/);
});

test('completion rejects missing and invalid authentication without privileged writes', async () => {
  let calls = 0;
  const handler = edge(async () => { calls++; return new Response('{}', { status: 401 }); });
  for (const token of [undefined, 'invalid']) {
    const response = await handler('POST', token);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
  }
  assert.equal(calls, 1);
});

test('completion updates only verified caller metadata, preserves unrelated fields, and can be repeated', async () => {
  let metadata = { must_change_password: true, registration_method: 'admin_password', other: 'keep' };
  const writes = [];
  const handler = edge(async (url, options) => {
    if (url.endsWith('/user')) return Response.json({ id: 'caller', app_metadata: metadata });
    writes.push({ url, body: JSON.parse(options.body) });
    metadata = writes.at(-1).body.app_metadata;
    return Response.json({});
  });
  assert.deepEqual(await (await handler('POST', 'valid')).json(), { ok: true, changed: true });
  assert.deepEqual(writes, [{ url: 'https://project.supabase.co/auth/v1/admin/users/caller', body: { app_metadata: { must_change_password: false, registration_method: 'admin_password', other: 'keep' } } }]);
  assert.deepEqual(await (await handler('POST', 'valid')).json(), { ok: true, changed: false });
  assert.equal(writes.length, 1);
});

test('backend write failure remains visible to the browser', async () => {
  const response = await edge(async url => url.endsWith('/user')
    ? Response.json({ id: 'caller', app_metadata: { must_change_password: true } })
    : new Response('failure', { status: 500 }))('POST', 'valid');
  assert.equal(response.status, 500);
  assert.equal((await response.json()).ok, false);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});

function formHarness(client) {
  const states = [], require = Module.createRequire(import.meta.url);
  let index = 0;
  const filename = new URL('../components/update-password-form.tsx', import.meta.url).pathname;
  const loaded = new Module(filename);
  loaded.require = name => name === 'react' ? { ...React, useState: initial => {
    const slot = index++;
    if (!(slot in states)) states[slot] = initial;
    return [states[slot], value => { states[slot] = value; }];
  } } : name === '@/lib/supabase/client' ? { createClient: () => client }
    : name === '@/lib/utils' ? { cn: () => '' }
    : name.startsWith('@/components/') ? new Proxy({}, { get: (_, key) => key }) : require(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  function render() { index = 0; return loaded.exports.UpdatePasswordForm({}); }
  const collect = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(collect) : [node, ...collect(node.props?.children)];
  return {
    setPasswords(value) { render(); states[0] = states[1] = value; },
    async submit() { const form = collect(render()).find(node => node.type === 'form'); await form.props.onSubmit({ preventDefault() {} }); },
    states,
  };
}

test('after a saved password, failed completion retries without setting the password again', async () => {
  let saves = 0, attempts = 0, redirects = 0;
  const previousWindow = globalThis.window;
  globalThis.window = { location: { replace: () => { redirects++; } } };
  try {
    const harness = formHarness({ auth: {
      updateUser: async () => { saves++; return { error: null }; },
      refreshSession: async () => ({ data: { session: {}, user: { app_metadata: { must_change_password: false } } }, error: null }),
    }, functions: { invoke: async () => ++attempts === 1 ? { error: new Error('Network') } : { data: { ok: true }, error: null } } });
    harness.setPasswords('new-password');
    await harness.submit();
    assert.equal(redirects, 0);
    assert.match(harness.states[2], /Heslo je uložené/);
    assert.equal(harness.states[0], '');
    await harness.submit();
    assert.equal(saves, 1);
    assert.equal(attempts, 2);
    assert.equal(redirects, 1);
  } finally { globalThis.window = previousWindow; }
});

test('a failed session refresh never redirects and retries completion without a second password write', async () => {
  let saves = 0, refreshes = 0, redirects = 0;
  const previousWindow = globalThis.window;
  globalThis.window = { location: { replace: () => { redirects++; } } };
  try {
    const harness = formHarness({ auth: {
      updateUser: async () => { saves++; return { error: null }; },
      refreshSession: async () => ++refreshes === 1 ? { data: {}, error: new Error('Offline') } : { data: { session: {}, user: { app_metadata: { must_change_password: false } } }, error: null },
    }, functions: { invoke: async () => ({ data: { ok: true }, error: null }) } });
    harness.setPasswords('new-password');
    await harness.submit();
    assert.equal(redirects, 0);
    await harness.submit();
    assert.equal(saves, 1);
    assert.equal(redirects, 1);
  } finally { globalThis.window = previousWindow; }
});
