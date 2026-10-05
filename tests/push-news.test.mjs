import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

const root = new URL('../', import.meta.url);
function load(relative, mocks = {}) {
  const filename = new URL(relative, root).pathname, loaded = new Module(filename);
  const realRequire = Module.createRequire(filename);
  loaded.require = name => name in mocks ? mocks[name] : realRequire(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  return loaded.exports;
}
const shared = load('supabase/functions/push-news/shared.ts');
const subscription = { endpoint: 'https://web.push.apple.com/test-endpoint', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } };
const token = '12bb7792-751b-44f4-8b71-a9e1f9133748';

test('push accepts only browser push providers and well-formed encryption keys, never arbitrary URLs', () => {
  for (const host of ['web.push.apple.com', 'fcm.googleapis.com', 'updates.push.services.mozilla.com']) assert.equal(shared.validSubscription({ ...subscription, endpoint: `https://${host}/abc` }), true);
  for (const endpoint of ['http://web.push.apple.com/abc', 'https://web.push.apple.com.evil.example/a', 'https://127.0.0.1/a', 'https://web.push.apple.com:444/a', 'https://user@web.push.apple.com/a', 'https://web.push.apple.com/a#x']) assert.equal(shared.validSubscription({ ...subscription, endpoint }), false, endpoint);
  for (const value of [null, {}, { ...subscription, keys: {} }, { ...subscription, keys: { ...subscription.keys, auth: 'broken' } }]) assert.equal(shared.validSubscription(value), false);
  assert.equal(shared.validDeviceToken(token), true);
  assert.equal(shared.validDeviceToken('forged'), false);
});

function edge({ auth = true, recipients = [], send = async () => {}, failRpc } = {}) {
  let handler;
  const calls = [], sent = [];
  const config = { public_key: 'public', private_key: 'private', dispatch_token: 'job-secret' };
  const code = ts.transpileModule(fs.readFileSync(new URL('supabase/functions/push-news/index.ts', root), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, {
    exports: {}, require: name => name === './shared.ts' ? shared : { sendNotification: async (sub, payload, options) => { sent.push({ sub, payload: JSON.parse(payload), options }); return send(sub); } },
    Deno: { env: { get: key => ({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'public' })[key] }, serve: value => { handler = value; } },
    fetch: async (url, options) => {
      if (url.endsWith('/user')) { calls.push({ auth: options.headers.Authorization }); return auth ? Response.json({ id: 'verified-caller' }) : new Response('', { status: 401 }); }
      const name = url.split('/').at(-1), body = JSON.parse(options.body);
      calls.push({ name, body });
      if (name === failRpc) return new Response('', { status: 503 });
      if (['register_push_news','manage_push_news','finish_push_news'].includes(name)) return new Response(null,{status:204});
      return Response.json(name === 'push_news_configuration' ? config : name === 'claim_push_news' ? recipients : name === 'push_news_status' ? true : null);
    },
    Request, Response, URL, AbortSignal, Date, TextEncoder, Uint8Array, crypto: webcrypto,
    console: { log() {}, error() {} },
  });
  return { calls, sent, request: (body, authorization = 'Bearer session', method = 'POST') => handler(new Request('https://example.org', { method, headers: { Origin: shared.APP_ORIGIN, ...(authorization ? { Authorization: authorization } : {}) }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) })) };
}

test('push preflight is available and missing/invalid login cannot subscribe or read secrets', async () => {
  const e = edge({ auth: false });
  assert.equal((await e.request(null, null, 'OPTIONS')).status, 204);
  assert.equal((await e.request({ action: 'subscribe' }, null)).status, 401);
  assert.equal((await e.request({ action: 'status' })).status, 401);
  assert.ok(e.calls.every(call => !call.name));
});

test('subscription, status and disable use only the verified caller, and return only the public VAPID key', async () => {
  const e = edge();
  assert.equal((await e.request({ action: 'subscribe', subscription, token, userId: 'victim' })).status, 200);
  const register = e.calls.find(call => call.name === 'register_push_news');
  assert.equal(register.body.p_user_id, 'verified-caller');
  assert.equal(register.body.p_token, token);
  const data = await (await e.request({ action: 'status', endpoint: subscription.endpoint })).json();
  assert.deepEqual(data, { ok: true, publicKey: 'public', enabled: true });
  assert.doesNotMatch(JSON.stringify(data), /private|job-secret/);
  await e.request({ action: 'disable', endpoint: subscription.endpoint, userId: 'victim' });
  assert.equal(e.calls.find(call => call.name === 'manage_push_news').body.p_user_id, 'verified-caller');
  assert.equal((await e.request({ action: 'subscribe', subscription: { ...subscription, endpoint: 'https://evil.example/' }, token })).status, 400);
  assert.equal(e.calls.filter(call => call.name === 'register_push_news').length, 1);
  assert.equal((await e.request({ action:'touch',endpoint:subscription.endpoint })).status,200,'204 heartbeat is a successful update');
});

test('scheduler rejects user JWTs and wrong secrets before claiming any deliveries', async () => {
  const e = edge();
  for (const authorization of ['Bearer session', 'Bearer wrong']) assert.equal((await e.request({ action: 'dispatch' }, authorization)).status, 401);
  assert.equal(e.calls.filter(call => call.name === 'claim_push_news').length, 0);
  assert.equal(e.sent.length, 0);
});

test('dispatch sends a generic encrypted message only to claimed devices and expires dead endpoints', async () => {
  const row = { id: 'sub', endpoint: subscription.endpoint, ...subscription.keys, device_token: token, claimed_at: '2026-10-05T08:00:00Z' };
  const e = edge({ recipients: [row] });
  assert.equal((await e.request({ action: 'dispatch' }, 'Bearer job-secret')).status, 200);
  assert.deepEqual(e.sent[0].payload, { title: 'Pivník', body: 'V Pivníku jsou novinky', token });
  assert.equal(e.sent[0].options.TTL, 3600);
  assert.equal(e.calls.find(c => c.name === 'finish_push_news').body.p_claimed_at, row.claimed_at);
  const dead = edge({ recipients: [row], send: async () => { throw { statusCode: 410 }; } });
  assert.equal((await (await dead.request({ action: 'dispatch' }, 'Bearer job-secret')).json()).expired, 1);
  assert.equal(dead.calls.find(c => c.name === 'finish_push_news').body.p_expired, true);
  const failure = edge({ recipients: [row], send: async () => { throw { statusCode: 503 }; } });
  assert.equal((await (await failure.request({ action: 'dispatch' }, 'Bearer job-secret')).json()).failed, 1);
  assert.ok(!failure.calls.some(c => c.name === 'finish_push_news'));
});

function worker() {
  const handlers = new Map(), notifications = [], badges = [], navigated = [];
  let storedToken;
  const indexedDB = { open: () => {
    const request = {};
    queueMicrotask(() => {
      request.result = { close() {}, transaction() {
        const transaction = { objectStore: () => ({ get: () => op(storedToken), put: value => { storedToken = value; return op(); }, delete: () => { storedToken = undefined; return op(); } }) };
        function op(result) { const operation = {}; queueMicrotask(() => { operation.result = result; operation.onsuccess?.(); transaction.oncomplete?.(); }); return operation; }
        return transaction;
      } };
      request.onsuccess();
    });
    return request;
  } };
  const self = { location: { origin: shared.APP_ORIGIN }, navigator: { setAppBadge: async value => { badges.push(value); } }, registration: { showNotification: async (title, options) => { notifications.push({ title, ...options }); } }, addEventListener: (name, fn) => handlers.set(name, fn), clients: { matchAll: async () => [], openWindow: async url => { navigated.push(url); } } };
  vm.runInNewContext(fs.readFileSync(new URL('public/sw.js', root), 'utf8'), { self, indexedDB, URL });
  async function fire(name, extras) { let pending; handlers.get(name)({ ...extras, waitUntil: value => { pending = value; } }); await pending; }
  return { notifications, badges, navigated, fire, setToken: async value => fire('message', { data: { type: 'pivnik-push-token', token: value }, source: { url: shared.APP_ORIGIN + '/' }, ports: [{ postMessage() {} }] }) };
}

test('service worker shows a visible notification and badge for the current opt-in, and opens only our activity page', async () => {
  const w = worker(); await w.setToken(token);
  await w.fire('push', { data: { json: () => ({ token, body: 'untrusted text', url: 'https://evil.example' }) } });
  assert.equal(w.notifications[0].body, 'V Pivníku jsou novinky');
  assert.deepEqual(w.badges, [1]);
  await w.fire('notificationclick', { notification: { close() {} } });
  assert.deepEqual(w.navigated, [shared.APP_ORIGIN + '/activity']);
  await w.setToken(null);
  await w.fire('push', { data: { json: () => ({ token }) } });
  assert.equal(w.notifications.length, 1, 'logout/disable prevents a delayed message restoring the old badge');
});

test('unsupported devices, denied permission and other accounts cannot silently opt in or create network work', async () => {
  const calls = [], storage = new Map(), listeners = [];
  const names = ['window', 'navigator', 'localStorage', 'Notification'];
  const descriptors = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  try {
    Object.defineProperties(globalThis, {
      window: { configurable: true, value: { isSecureContext: true, dispatchEvent: e => listeners.push(e.type) } },
      navigator: { configurable: true, value: { clearAppBadge: async () => calls.push('clear') } },
      localStorage: { configurable: true, value: { getItem: key => storage.get(key) ?? null, removeItem: key => storage.delete(key) } },
      Notification: { configurable: true, value: { permission: 'denied', requestPermission: async () => 'denied' } },
    });
    const client = load('lib/push-news-client.ts', { '@/lib/supabase/client': { createClient: () => { throw new Error('no network expected'); } } });
    assert.equal(client.supportsPush(), false);
    await assert.rejects(client.enablePush('me', 'public'), /nejsou povolená/);
    await client.syncPushNews('me', { userId: 'me', counts: { activity: 1 } });
    assert.equal(calls.length, 0);
    storage.set('pivnik-push-device', JSON.stringify({ userId: 'other', token, endpoint: subscription.endpoint }));
    await client.syncPushNews('me', null);
    assert.equal(storage.size, 0);
    assert.deepEqual(calls, ['clear']);
  } finally { for (const [name, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } }
});

test('home screen badge follows any unread section, clears after all are read, and avoids database work without opt-in', async () => {
  const names = ['window','navigator','localStorage','Notification','document'];
  const original = names.map(name => [name,Object.getOwnPropertyDescriptor(globalThis,name)]);
  const store = new Map(), badges = [], requests = [], closed = [];
  try {
    Object.defineProperties(globalThis, {
      window: { configurable:true, value:{ dispatchEvent(){} } },
      navigator: { configurable:true, value:{ onLine:true, setAppBadge:async n=>badges.push(n), clearAppBadge:async()=>badges.push(0), serviceWorker:{ getRegistration:async()=>({ getNotifications:async()=>[{close:()=>closed.push(true)}] }) } } },
      localStorage: { configurable:true, value:{ getItem:key=>store.get(key)??null, removeItem:key=>store.delete(key) } },
      Notification: { configurable:true, value:{permission:'granted'} },
      document: { configurable:true, value:{visibilityState:'visible'} },
    });
    const client=load('lib/push-news-client.ts', { '@/lib/supabase/client':{createClient:()=>({functions:{invoke:async(name,{body})=>{requests.push({name,body});return {data:{ok:true}};}}})} });
    const news=counts=>({userId:'me',counts});
    await client.syncPushNews('me',news({activity:8,beers:3,breweries:2}));
    assert.equal(requests.length,0); assert.equal(badges.length,0);
    store.set('pivnik-push-device',JSON.stringify({userId:'me',token,endpoint:subscription.endpoint}));
    await client.syncPushNews('me',news({activity:8,beers:3,breweries:2}));
    assert.deepEqual(badges,[1],'overlapping nav counts are not summed into a misleading icon count');
    assert.equal(requests[0].body.action,'touch');
    await client.syncPushNews('me',news({activity:0,beers:0,breweries:1}));
    assert.equal(badges.at(-1),1);
    await client.syncPushNews('me',news({activity:0,beers:0,breweries:0}));
    assert.equal(badges.at(-1),0); assert.equal(closed.length,1);
    assert.equal(requests.length,1,'active heartbeat is limited to once per minute');
  } finally { for(const[name,descriptor]of original){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];} }
});
