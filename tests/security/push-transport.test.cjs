const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const { createECDH, randomBytes } = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const webpush = require('web-push');

const source = readFileSync(path.join(__dirname, '../../src/lib/server/push-transport.ts'), 'utf8');
const ecdh = createECDH('prime256v1');
const subscription = {
  endpoint: 'https://push.example.invalid:8443/send/opaque-token?q=1',
  keys: { p256dh: ecdh.generateKeys().toString('base64url'), auth: randomBytes(16).toString('base64url') },
};
const vapid = webpush.generateVAPIDKeys();
webpush.setVapidDetails('mailto:security-test@example.invalid', vapid.publicKey, vapid.privateKey);

function harness(transform = (text) => text) {
  const timers = new Set();
  const requests = [];
  const exports = {};
  const code = ts.transpileModule(transform(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const request = (options, callback) => {
    const req = new EventEmitter();
    req.options = options;
    req.callback = callback;
    req.destroyed = false;
    req.destroy = () => { req.destroyed = true; req.emit('close'); return req; };
    req.end = (body) => { req.body = body; return req; };
    requests.push(req);
    return req;
  };
  vm.runInNewContext(code, {
    exports, require: (name) => name === 'server-only' ? {} : name === 'node:https' ? { request } : require(name),
    setTimeout: (callback, delay) => { const timer = { callback, delay }; timers.add(timer); return timer; },
    clearTimeout: (timer) => timers.delete(timer),
  });
  function respond(req, statusCode = 201) {
    const response = new EventEmitter();
    response.statusCode = statusCode;
    response.complete = false;
    response.destroyed = false;
    response.destroy = () => { response.destroyed = true; response.emit('close'); return response; };
    req.callback(response);
    return response;
  }
  function complete(response) { response.complete = true; response.emit('end'); response.emit('close'); }
  function expire() { for (const timer of [...timers]) timer.callback(); }
  return { send: exports.sendBoundedPush, requests, timers, respond, complete, expire };
}

test('legitimate encrypted 201/204 delivery preserves method, path, headers and payload', async () => {
  const h = harness();
  for (const status of [201, 204]) {
    const pending = h.send(subscription, '{"title":"Test","body":"Reminder"}');
    const req = h.requests.at(-1);
    assert.equal(req.options.hostname, 'push.example.invalid');
    assert.equal(req.options.port, '8443');
    assert.equal(req.options.path, '/send/opaque-token?q=1');
    assert.equal(req.options.method, 'POST');
    assert.equal(req.options.headers['Content-Encoding'], 'aes128gcm');
    assert.match(req.options.headers.Authorization, /^vapid /);
    assert(Buffer.isBuffer(req.body));
    assert(!req.body.includes(Buffer.from('Reminder')));
    assert.equal(req.options.rejectUnauthorized, undefined);
    const response = h.respond(req, status);
    response.emit('data', Buffer.alloc(16 * 1024));
    h.complete(response);
    await pending;
    assert.equal(req.destroyed, false);
    assert.equal(h.timers.size, 0);
  }
});

test('chunked overflow rejects and destroys both streams regardless of HTTP status', async () => {
  for (const status of [201, 404, 410, 503]) {
    const h = harness();
    const pending = h.send(subscription, 'hello');
    const rejected = assert.rejects(pending, (error) => /byte limit/.test(error.message) && error.statusCode === status);
    const req = h.requests[0];
    const response = h.respond(req, status);
    response.emit('data', Buffer.alloc(16 * 1024));
    assert.equal(req.destroyed, false);
    response.emit('data', Buffer.alloc(1));
    await rejected;
    assert.equal(req.destroyed, true);
    assert.equal(response.destroyed, true);
    assert.equal(h.timers.size, 0);
    // Events queued before destruction must not turn a failure into success or crash.
    response.emit('error', new Error('late response error'));
    req.emit('error', new Error('late request error'));
    h.complete(response);
  }
});

test('one absolute 10-second deadline bounds pre-header stalls and active trickles', async () => {
  for (const withResponse of [false, true]) {
    const h = harness();
    const pending = h.send(subscription, 'hello');
    const rejected = assert.rejects(pending, /deadline/);
    const req = h.requests[0];
    const response = withResponse ? h.respond(req) : null;
    for (let i = 0; i < 100; i++) response?.emit('data', Buffer.from('x'));
    assert.equal(h.timers.size, 1);
    assert.equal([...h.timers][0].delay, 10_000);
    h.expire();
    await rejected;
    assert.equal(req.destroyed, true);
    if (response) assert.equal(response.destroyed, true);
    assert.equal(h.timers.size, 0);
  }
});

test('bounded failures retain 404/410 status and do not follow redirects', async () => {
  for (const status of [301, 404, 410, 503]) {
    const h = harness();
    const pending = h.send(subscription, 'hello');
    const rejected = assert.rejects(pending, (error) => error.statusCode === status);
    const response = h.respond(h.requests[0], status);
    response.headers = { location: 'https://different.example.invalid/' };
    response.emit('data', Buffer.from('provider response'));
    h.complete(response);
    await rejected;
    assert.equal(h.requests.length, 1);
    assert.equal(h.timers.size, 0);
  }
});

test('request and response failures settle, clear timers and permit a subsequent delivery', async () => {
  for (const event of ['request-error', 'request-close', 'error', 'aborted', 'close']) {
    const h = harness();
    const pending = h.send(subscription, 'hello');
    const rejected = assert.rejects(pending);
    const req = h.requests[0];
    if (event === 'request-error') req.emit('error', new Error('network failure'));
    else if (event === 'request-close') req.emit('close');
    else h.respond(req).emit(event, new Error('response failure'));
    await rejected;
    assert.equal(req.destroyed, true);
    assert.equal(h.timers.size, 0);
    const next = h.send(subscription, 'second subscription');
    h.complete(h.respond(h.requests[1], 201));
    await next;
  }
});

test('overflow guard is falsifiable: removing it leaves an oversized success admitted', async () => {
  const h = harness((text) => text.replace('receivedBytes > MAX_RESPONSE_BYTES', 'false'));
  const pending = h.send(subscription, 'hello');
  const response = h.respond(h.requests[0]);
  response.emit('data', Buffer.alloc(16 * 1024 + 1));
  h.complete(response);
  await pending;
  assert.equal(response.destroyed, false);
});
