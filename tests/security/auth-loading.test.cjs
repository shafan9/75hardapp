const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../../src/lib/hooks/use-auth.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
).outputText;

function fixture() {
  const state = [], effects = [], timers = new Map(), reads = [], errors = [];
  let stateIndex = 0, timerId = 0, listener, cleanup, locked = false, unsubscribed = false, hydrate;
  const session = new Promise((resolve) => { hydrate = resolve; });
  const client = {
    auth: {
      getSession: () => session,
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: (callback) => {
        listener = callback;
        return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } };
      },
    },
    from: (table) => {
      assert.equal(table, "profiles");
      let id;
      const query = {
        select: () => query,
        eq: (_column, value) => { id = value; return query; },
        single: () => {
          reads.push({ id, locked });
          // Reproduce the installed SDK's exclusive auth-lock boundary.
          if (locked) return new Promise(() => {});
          return Promise.resolve({ data: { id, display_name: "Synthetic member" }, error: null });
        },
      };
      return query;
    },
  };
  const react = {
    useState: (initial) => {
      const index = stateIndex++;
      state[index] = initial;
      return [initial, (value) => { state[index] = value; }];
    },
    useEffect: (effect) => effects.push(effect),
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
  };
  const context = {
    exports: {},
    require: (id) => {
      if (id === "react") return react;
      if (id === "next/navigation") return { useRouter: () => ({ push() {} }) };
      if (id === "@/lib/supabase/client") return { createClient: () => client };
      if (id === "@/components/ui/toast-provider") return { useToast: () => ({}) };
      throw new Error(`Unexpected import: ${id}`);
    },
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    console: { error: (...args) => errors.push(args), warn: (...args) => errors.push(args) },
  };
  vm.runInNewContext(source, context);
  context.exports.useAuth();
  cleanup = effects[0]();
  return {
    state, reads, timers, errors,
    emit: (user) => {
      locked = true;
      const result = listener(user ? "SIGNED_IN" : "SIGNED_OUT", user ? { user } : null);
      // A Promise here makes Supabase retain the lock while profile reads wait on it.
      assert.equal(result, undefined, "auth event callback must release its lock synchronously");
      locked = false;
    },
    flush: async () => {
      for (const [id, timer] of [...timers]) {
        if (timer.delay === 0) { timers.delete(id); timer.fn(); }
      }
      await new Promise(setImmediate);
    },
    hydrate: () => hydrate({ data: { session: null } }),
    close: () => { cleanup(); assert.equal(unsubscribed, true); },
  };
}

test("auth event releases the lock before loading the profile", async () => {
  const f = fixture();
  f.emit({ id: "synthetic-a" });
  assert.equal(f.reads.length, 0);
  await f.flush();
  assert.deepEqual(f.reads, [{ id: "synthetic-a", locked: false }]);
  assert.equal(f.state[1].id, "synthetic-a");
  assert.equal(f.state[2], false);
  assert.equal([...f.timers.values()].some((timer) => timer.delay === 14000), false);
  assert.equal(f.errors.length, 0);
  f.close();
});

test("sign-out cancels queued profile work", async () => {
  const f = fixture();
  f.emit({ id: "synthetic-a" });
  f.emit(null);
  await f.flush();
  assert.equal(f.reads.length, 0);
  assert.equal(f.state[0], null);
  assert.equal(f.state[1], null);
  assert.equal(f.state[2], false);
  f.close();
});

test("replacement auth event loads only the latest queued identity", async () => {
  const f = fixture();
  f.emit({ id: "synthetic-a" });
  f.emit({ id: "synthetic-b" });
  await f.flush();
  assert.deepEqual(f.reads, [{ id: "synthetic-b", locked: false }]);
  f.close();
});

test("unmount cancels queued profile work and unsubscribes", async () => {
  const f = fixture();
  f.emit({ id: "synthetic-a" });
  f.close();
  await f.flush();
  assert.equal(f.reads.length, 0);
});

test("successful initial hydration clears the fallback warning timer", async () => {
  const f = fixture();
  f.hydrate();
  await f.flush();
  assert.equal(f.state[2], false);
  assert.equal(f.timers.size, 0);
  assert.equal(f.errors.length, 0);
  f.close();
});
