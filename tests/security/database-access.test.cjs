const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

// Integration test against the disposable, socket-only PostgreSQL owned by
// npm run test:security. A missing prerequisite must fail, never skip.
// DATABASE_URL and production credentials are deliberately never used.
test('real PostgreSQL enforces squad isolation and preserves server workflows', () => {
  const socket = process.env.SQUAD_TEST_PG_SOCKET;
  assert.ok(socket, 'Run npm run test:security to create the disposable PostgreSQL fixture');
  assert.ok(path.isAbsolute(socket) && !socket.includes('://'));
  const port = process.env.SQUAD_TEST_PG_PORT || '65439';
  assert.match(port, /^\d+$/);
  const db = `squad_security_test_${process.pid}`;
  const baseArgs = ['-X', '-h', socket, '-p', port, '-v', 'ON_ERROR_STOP=1', '-At'];
  const admin = execFileSync('psql', [...baseArgs, '-d', 'postgres', '-c', 'show listen_addresses'], { encoding: 'utf8' }).trim();
  assert.equal(admin, '', 'Test server must not listen on TCP');
  execFileSync('createdb', ['-h', socket, '-p', port, db]);
  const run = (sql, expectedCode) => {
    const result = spawnSync('psql', [...baseArgs, '-d', db], {
      input: '\\set VERBOSITY verbose\n' + sql, encoding: 'utf8',
    });
    if (expectedCode) {
      assert.notEqual(result.status, 0, 'Unsafe statement unexpectedly succeeded');
      assert.ok(result.stderr.includes(expectedCode), result.stderr);
    } else {
      assert.equal(result.status, 0, result.stderr);
    }
    return result.stdout.trim();
  };
  const as = (role, uid, sql, code) => run(`begin; set local role ${role}; set local "request.jwt.claim.sub" = '${uid || ''}'; ${sql}; commit;`, code);
  const scalar = (role, uid, sql) => as(role, uid, sql).split('\n').filter(x => !['BEGIN', 'SET', 'COMMIT'].includes(x)).join('\n');
  const root = path.resolve(__dirname, '../..');
  const schema = readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
  // Match the restored policy inventory. The old bootstrap's forward-reference
  // group SELECT policy is absent live and references a not-yet-created table.
  const original = schema.split('-- Policy hardening + recursion-safe helpers')[0]
    .replace(/create policy "Group members can view their groups"[\s\S]*?;\n/, '');
  const migration = readFileSync(path.join(root, 'supabase/migrations/20261023_restrict_squad_data_access.sql'), 'utf8');
  const legacy = readFileSync(path.join(root, 'supabase/migrations/20260212_fix_group_membership_rls.sql'), 'utf8');
  run(`
    do $$ begin
      if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
    end $$;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    create publication supabase_realtime;
    ${original}
    grant all on all tables in schema public to anon, authenticated, service_role;
  `);
  const u = [1, 2, 3, 4].map(i => `00000000-0000-4000-8000-00000000000${i}`);
  const g = [1, 2].map(i => `10000000-0000-4000-8000-00000000000${i}`);
  const c = [1, 2].map(i => `20000000-0000-4000-8000-00000000000${i}`);
  run(`
    insert into auth.users(id) values ${u.map(x => `('${x}')`).join(',')};
    insert into public.groups(id,name,invite_code,created_by) values
      ('${g[0]}','Test A','synthetic-a','${u[0]}'), ('${g[1]}','Test B','synthetic-b','${u[2]}');
    insert into public.group_members(group_id,user_id,role) values
      ('${g[0]}','${u[0]}','admin'), ('${g[0]}','${u[1]}','member'), ('${g[1]}','${u[2]}','admin');
    insert into public.challenge_progress(group_id,user_id) values
      ('${g[0]}','${u[0]}'), ('${g[0]}','${u[1]}'), ('${g[1]}','${u[2]}');
    insert into public.task_completions(id,group_id,user_id,task_key) values
      ('${c[0]}','${g[0]}','${u[0]}','reading'), ('${c[1]}','${g[1]}','${u[2]}','reading');
    insert into public.feed_comments(completion_id,user_id,content) values
      ('${c[0]}','${u[0]}','A'), ('${c[1]}','${u[2]}','B');
    insert into public.feed_reactions(completion_id,user_id) values
      ('${c[0]}','${u[0]}'), ('${c[1]}','${u[2]}');
    insert into public.user_achievements(user_id,achievement_key) values
      ('${u[0]}','first'), ('${u[2]}','first');
  `);
  const tables = ['profiles','groups','group_members','challenge_progress','task_completions','feed_comments','feed_reactions','user_achievements'];
  const fingerprint = () => tables.map(t => run(`select md5(coalesce(string_agg(row_to_json(x)::text, '' order by id), '')) from public.${t} x;`)).join(':');
  const policies = () => run("select md5(string_agg(row_to_json(p)::text, '' order by tablename, policyname)) from pg_policies p where schemaname='public';");
  const beforeRows = fingerprint();
  const beforePolicies = policies();

  assert.equal(scalar('anon', '', 'select count(*) from public.groups'), '2');
  assert.equal(scalar('anon', '', 'select count(*) from public.profiles'), '4');
  // Reproduce the writes without leaving forged membership/progress behind.
  run(`begin; set local role authenticated; set local "request.jwt.claim.sub"='${u[3]}';
    insert into public.group_members(user_id,group_id,role) values('${u[3]}','${g[0]}','admin');
    insert into public.challenge_progress(user_id,group_id) values('${u[3]}','${g[1]}');
    insert into public.task_completions(user_id,group_id,task_key) values('${u[3]}','${g[1]}','forged');
    rollback;`);
  assert.equal(fingerprint(), beforeRows);
  // An error before COMMIT must restore the old policies/grants and all rows.
  run(migration.replace("notify pgrst, 'reload schema';", "select 1/0;"), '22012');
  assert.equal(policies(), beforePolicies);
  assert.equal(fingerprint(), beforeRows);
  assert.equal(run("select to_regnamespace('squad_private') is null;"), 't');
  run(migration);
  assert.equal(fingerprint(), beforeRows, 'Migration must not change application rows');

  for (const table of tables) assert.equal(scalar('anon', '', `select count(*) from public.${table}`), '0', table);
  for (const [table, count] of Object.entries({profiles:2,groups:1,group_members:2,challenge_progress:2,task_completions:1,feed_comments:1,feed_reactions:1,user_achievements:1})) {
    assert.equal(scalar('authenticated', u[0], `select count(*) from public.${table}`), String(count), table);
  }
  assert.equal(scalar('authenticated', u[3], 'select count(*) from public.profiles'), '1');
  for (const table of tables.filter(x => x !== 'profiles')) assert.equal(scalar('authenticated', u[3], `select count(*) from public.${table}`), '0', table);
  for (const sql of [
    `insert into public.groups(name,invite_code,created_by) values('forged','forged','${u[3]}')`,
    `insert into public.group_members(user_id,group_id,role) values('${u[3]}','${g[0]}','admin')`,
    `insert into public.challenge_progress(user_id,group_id) values('${u[3]}','${g[0]}')`,
    `update public.challenge_progress set group_id='${g[1]}' where user_id='${u[0]}'`,
    `insert into public.task_completions(user_id,group_id,task_key) values('${u[3]}','${g[0]}','forged')`,
    `insert into public.feed_comments(user_id,completion_id,content) values('${u[0]}','${c[1]}','forged')`,
    `insert into public.feed_reactions(user_id,completion_id) values('${u[0]}','${c[1]}')`,
    `insert into public.feed_comments(user_id,completion_id,content) values('${u[1]}','${c[0]}','forged identity')`,
  ]) as('authenticated', u[0], sql, '42501');
  assert.equal(scalar('authenticated', u[0], `select squad_private.is_group_member('${g[1]}')`), 'f');
  as('anon', '', `select squad_private.is_group_member('${g[0]}')`, '42501');
  as('authenticated', u[0], `select squad_private.is_group_member('${g[1]}','${u[2]}')`, '42883');

  as('authenticated', u[1], `insert into public.feed_comments(user_id,completion_id,content) values('${u[1]}','${c[0]}','legitimate')`);
  as('authenticated', u[1], `insert into public.feed_reactions(user_id,completion_id,emoji) values('${u[1]}','${c[0]}','first') on conflict(completion_id,user_id) do update set emoji=excluded.emoji`);
  as('authenticated', u[1], `insert into public.feed_reactions(user_id,completion_id,emoji) values('${u[1]}','${c[0]}','second') on conflict(completion_id,user_id) do update set emoji=excluded.emoji`);
  assert.equal(scalar('authenticated', u[1], `select emoji from public.feed_reactions where user_id='${u[1]}'`), 'second');
  as('authenticated', u[1], `update public.feed_reactions set completion_id='${c[1]}' where user_id='${u[1]}'`, '42501');
  as('authenticated', u[1], `update public.feed_reactions set user_id='${u[0]}' where user_id='${u[1]}'`, '42501');
  as('authenticated', u[1], `delete from public.feed_reactions where user_id='${u[1]}'`);
  as('authenticated', u[1], `delete from public.feed_comments where user_id='${u[1]}'`);
  as('authenticated', u[1], `insert into public.profiles(id,display_name) values('${u[1]}','Own profile') on conflict(id) do update set display_name=excluded.display_name`);

  // Existing server clients retain BYPASSRLS + grants for trusted create/join and checklist writes.
  as('service_role', '', `insert into public.group_members(user_id,group_id) values('${u[3]}','${g[0]}');
    insert into public.challenge_progress(user_id,group_id) values('${u[3]}','${g[0]}');
    insert into public.task_completions(user_id,group_id,task_key) values('${u[3]}','${g[0]}','legitimate');
    update public.challenge_progress set current_day=1 where user_id='${u[3]}';
    delete from public.task_completions where user_id='${u[3]}';`);
  assert.equal(scalar('authenticated', u[3], 'select count(*) from public.groups'), '1');

  // Also close legacy callable helpers on an installation that ran February's migration.
  run(legacy);
  run(migration);
  for (const sql of [
    `select public.is_group_member('${g[1]}','${u[2]}')`,
    `select public.can_access_completion('${c[1]}','${u[2]}')`,
    "select * from public.lookup_group_by_invite_code('synthetic-b')",
  ]) as('authenticated', u[0], sql, '42501');
  const stableRows = fingerprint();
  const stablePolicies = policies();
  run(migration);
  assert.equal(fingerprint(), stableRows);
  assert.equal(policies(), stablePolicies);
  run(`insert into public.challenge_progress(user_id,group_id) values('${u[3]}','${g[1]}');`);
  run(migration, 'P0001');
  assert.equal(policies(), stablePolicies, 'Unverified historical state must block cutover');
  console.log(`Validated isolated database ${db}; synthetic records retained for review.`);
});
