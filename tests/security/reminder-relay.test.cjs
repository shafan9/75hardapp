const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../netlify/functions/send-reminders.js"), "utf8");

function fixture(env = {}) {
  const calls = [];
  const context = {
    exports: {}, require, Buffer,
    process: { env: { SITE_URL: "https://app.example.invalid/", NOTIFICATION_CRON_SECRET: "synthetic-test-secret", ...env } },
    fetch: async (...args) => {
      calls.push(args);
      return { status: 200, text: async () => '{"ok":true}' };
    },
  };
  vm.runInNewContext(source, context);
  return { handler: context.exports.handler, calls };
}

test("unauthenticated and invalid callers never receive cron authority", async () => {
  for (const event of [
    undefined,
    { httpMethod: "GET" },
    { httpMethod: "POST", headers: {} },
    { httpMethod: "POST", headers: { authorization: "Bearer wrong" } },
    { httpMethod: "POST", headers: { authorization: "Bearer synthetic-test-secreu" } },
    { httpMethod: "POST", headers: { authorization: ["Bearer synthetic-test-secret"] } },
    { httpMethod: "POST", headers: { authorization: "Bearer synthetic-test-secret", Authorization: "Bearer wrong" } },
    { httpMethod: "POST", headers: { "x-netlify-event": "schedule" } },
  ]) {
    const { handler, calls } = fixture();
    const result = await handler(event);
    assert.ok([401, 405].includes(result.statusCode));
    assert.equal(calls.length, 0);
  }
});

test("authenticated POST preserves the configured destination and response", async () => {
  const { handler, calls } = fixture();
  const response = await handler({ httpMethod: "POST", headers: { Authorization: "Bearer synthetic-test-secret" } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body, '{"ok":true}');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://app.example.invalid/api/cron/send-reminders");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].headers.Authorization, "Bearer synthetic-test-secret");
});

test("missing server configuration fails closed", async () => {
  const { handler, calls } = fixture({ NOTIFICATION_CRON_SECRET: "" });
  assert.equal((await handler({ httpMethod: "POST", headers: { authorization: "Bearer " } })).statusCode, 500);
  assert.equal(calls.length, 0);
});
