import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../lib/pwa.ts', import.meta.url));
const sourceModule = new Module(filename);
sourceModule._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { getPwaPlatform, isInAppBrowser, getInstallUrl } = sourceModule.exports;

test('installation recognizes Android, iPhone and iPad with a desktop user agent', () => {
  assert.equal(getPwaPlatform('Mozilla/5.0 (Linux; Android 15) Chrome/141'), 'android');
  assert.equal(getPwaPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604'), 'ios');
  assert.equal(getPwaPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5), 'ios');
  assert.equal(getPwaPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0), 'desktop');
  assert.equal(getPwaPlatform('Mozilla/5.0 (Windows NT 10.0)'), 'desktop');
  assert.equal(isInAppBrowser('Mozilla Instagram 390'), true);
  assert.equal(isInAppBrowser('Mozilla GSA/320.0'), true);
  assert.equal(isInAppBrowser('Mozilla Safari/604'), false);
  assert.equal(getInstallUrl('https://pivnik.example'), 'https://pivnik.example/install');
});

function worker() {
  const handlers = new Map();
  const stores = new Map();
  const fetched = [];
  let offline = false;
  const getStore = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      addAll: async urls => { for (const url of urls) entries.set(url, new Response(url)); },
      match: async key => entries.get(key)?.clone(),
      put: async (key, response) => entries.set(key, response),
    };
  };
  const self = {
    location: { origin: 'https://pivnik.example' },
    addEventListener: (type, handler) => handlers.set(type, handler),
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self, URL, Response,
    caches: { open: async name => getStore(name), keys: async () => [...stores.keys()], delete: async name => stores.delete(name) },
    fetch: async request => {
      fetched.push(request.url);
      if (offline) throw new TypeError('Offline');
      return new Response('Fresh network response');
    },
  });
  return {
    stores, fetched, setOffline: value => { offline = value; },
    lifecycle: async type => { let pending; handlers.get(type)({ waitUntil: promise => { pending = promise; } }); await pending; },
    request: (path, overrides = {}) => {
      let response;
      handlers.get('fetch')({
        request: { url: new URL(path, self.location.origin).href, method: 'GET', mode: 'cors', ...overrides },
        respondWith: promise => { response = promise; },
      });
      return response;
    },
  };
}

test('installation caches only public offline assets and keeps other application caches', async () => {
  const w = worker();
  w.stores.set('pivnik-shell-old', new Map());
  w.stores.set('another-app', new Map());
  await w.lifecycle('install');
  assert.deepEqual([...w.stores.get('pivnik-shell-v1').keys()], ['/offline.html', '/offline.js', '/pwa-icon/180.png', '/pwa-icon/192.png', '/pwa-icon/512.png']);
  await w.lifecycle('activate');
  assert.equal(w.stores.has('pivnik-shell-old'), false);
  assert.equal(w.stores.has('another-app'), true);
});

test('offline navigation shows the public fallback and reconnecting fetches the current page', async () => {
  const w = worker();
  await w.lifecycle('install');
  w.setOffline(true);
  assert.equal(await (await w.request('/profiles/me', { mode: 'navigate' })).text(), '/offline.html');
  w.setOffline(false);
  assert.equal(await (await w.request('/profiles/me', { mode: 'navigate' })).text(), 'Fresh network response');
  assert.equal(w.stores.get('pivnik-shell-v1').has('/profiles/me'), false);
});

test('authentication, writes, RSC and APIs never enter the offline cache or receive fallback HTML', async () => {
  const w = worker();
  await w.lifecycle('install');
  w.setOffline(true);
  for (const path of ['/api/profiles/me/technical-stats', '/auth/confirm?token=secret', '/?__rsc=123', '/pwa-icon/192.png?token=secret', 'https://database.example/auth/v1/token']) {
    assert.equal(w.request(path), undefined, path);
  }
  assert.equal(w.request('/', { method: 'POST', mode: 'navigate' }), undefined);
  assert.equal(w.fetched.length, 0);
  assert.equal(w.stores.get('pivnik-shell-v1').size, 5);
});

test('public icons remain available offline without caching a document or calling the network', async () => {
  const w = worker();
  await w.lifecycle('install');
  w.setOffline(true);
  assert.equal(await (await w.request('/pwa-icon/192.png')).text(), '/pwa-icon/192.png');
  assert.equal(w.fetched.length, 0);
});
