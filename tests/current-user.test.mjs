import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('server components share one auth lookup per render without sharing users across requests', () => {
  const result = spawnSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import Module from 'node:module';
    import path from 'node:path';
    import { PassThrough } from 'node:stream';
    import React from 'react';
    import ts from 'typescript';
    import { renderToPipeableStream } from 'next/dist/compiled/react-server-dom-webpack/server.node.js';
    let calls = 0, account = 'first-account';
    const filename = path.resolve('lib/supabase/current-user.ts');
    const loaded = new Module(filename);
    const require = Module.createRequire(filename);
    loaded.require = name => name === './server' ? {
      createClient: async () => ({ auth: { getUser: async () => {
        calls++;
        return { data: { user: { id: account } } };
      } } }),
    } : require(name);
    loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, filename);
    const { getCurrentUser } = loaded.exports;
    async function Part() {
      const user = await getCurrentUser();
      return React.createElement('span', null, user.id);
    }
    async function render() {
      const destination = new PassThrough();
      let output = '';
      const complete = new Promise((resolve, reject) => {
        destination.on('data', chunk => { output += chunk; });
        destination.on('end', () => resolve(output));
        destination.on('error', reject);
      });
      renderToPipeableStream(React.createElement('main', null,
        ['layout', 'home', 'profile'].map(key => React.createElement(Part, { key }))
      ), {}, { onError: error => destination.destroy(error) }).pipe(destination);
      return complete;
    }
    const first = await render();
    assert.equal(calls, 1);
    assert.ok(first.includes('first-account'));
    account = 'second-account';
    const second = await render();
    assert.equal(calls, 2);
    assert.ok(second.includes('second-account'));
    assert.ok(!second.includes('first-account'));
  `], { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr || String(result.error));
});
