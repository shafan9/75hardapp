const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const { appendFileSync, existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

// Own the cluster rather than accepting a database URL or a caller's socket.
// /tmp also avoids PostgreSQL's short Unix-socket path limit on macOS.
const root = path.resolve(__dirname, '..');
const temporary = mkdtempSync('/tmp/75-security-');
const data = path.join(temporary, 'data');
const socket = path.join(temporary, 'socket');
const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL']
  .filter((key) => process.env[key]).map((key) => [key, process.env[key]]));
if (process.env.SQUAD_TEST_PG_BIN) {
  env.PATH = `${process.env.SQUAD_TEST_PG_BIN}${path.delimiter}${env.PATH}`;
}
env.PGUSER = 'squad_security_test';
env.PGCONNECT_TIMEOUT = '5';
env.PGPASSFILE = path.join(temporary, 'pgpass');
env.NEXT_TELEMETRY_DISABLED = '1';
env.SQUAD_TEST_PG_SOCKET = socket;
env.SQUAD_TEST_PG_PORT = '65439';

const run = (command, args) => execFileSync(command, args, {
  cwd: root, env, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'],
});
let activeChild;
function stopTests(signal) {
  if (!activeChild) return;
  try { process.kill(-activeChild.pid, signal); } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}
function cleanup() {
  let stillRunning = existsSync(path.join(data, 'postmaster.pid'));
  if (stillRunning) {
    try {
      run('pg_ctl', ['-D', data, '-m', 'immediate', '-w', '-t', '15', 'stop']);
      stillRunning = false;
    } catch (error) {
      console.error(`Could not stop the disposable test cluster: ${error.message}`);
      process.exitCode = 1;
    }
  }
  // Never remove a cluster that might still be running.
  if (!stillRunning) rmSync(temporary, { recursive: true, force: true });
  else console.error(`Disposable cluster requires cleanup: ${temporary}`);
  return !stillRunning;
}
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.once(signal, () => {
    process.exitCode = code;
    if (activeChild) stopTests('SIGTERM');
    else { cleanup(); process.exit(code); }
  });
}
async function main() {
  let failed = false;
  try {
    if (process.env.SQUAD_TEST_PG_BIN) {
      assert.ok(path.isAbsolute(process.env.SQUAD_TEST_PG_BIN), 'SQUAD_TEST_PG_BIN must be absolute');
    }
    for (const command of ['initdb', 'pg_ctl', 'psql', 'createdb']) {
      if (process.env.SQUAD_TEST_PG_BIN) {
        assert.ok(existsSync(path.join(process.env.SQUAD_TEST_PG_BIN, command)), `Missing PostgreSQL binary: ${command}`);
      }
      run(command, ['--version']);
    }
    writeFileSync(env.PGPASSFILE, '', { mode: 0o600 });
    mkdirSync(socket, { mode: 0o700 });
    run('initdb', ['-D', data, '--no-locale', '--encoding=UTF8', '--username=squad_security_test', '--auth-local=trust', '--auth-host=reject']);
    appendFileSync(path.join(data, 'postgresql.conf'), [
      "listen_addresses = ''",
      `unix_socket_directories = '${socket}'`,
      'unix_socket_permissions = 0700',
      'port = 65439',
      "wal_level = 'logical'",
      'max_connections = 20',
      '',
    ].join('\n'));
    console.log(`Disposable PostgreSQL fixture: ${temporary}`);
    run('pg_ctl', ['-D', data, '-l', path.join(temporary, 'postgres.log'), '-w', '-t', '15', 'start']);
    const files = readdirSync(path.join(root, 'tests/security'))
      .filter((file) => file.endsWith('.test.cjs')).sort()
      .map((file) => path.join('tests/security', file));
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, ['--test', '--test-reporter=tap', ...files], {
        cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      });
      activeChild = child;
      let stdout = '', stderr = '', error;
      const timeout = setTimeout(() => {
        error = new Error('Security tests exceeded the 120-second limit');
        stopTests('SIGKILL');
      }, 120000);
      const collect = (stream) => (chunk) => {
        if (stream === 'stdout') stdout += chunk;
        else stderr += chunk;
        if (stdout.length + stderr.length > 10 * 1024 * 1024) {
          error = new Error('Security test output exceeded the 10 MiB limit');
          stopTests('SIGKILL');
        }
      };
      child.stdout.setEncoding('utf8').on('data', collect('stdout'));
      child.stderr.setEncoding('utf8').on('data', collect('stderr'));
      child.once('error', (cause) => { error = cause; });
      child.once('close', (status, signal) => {
        clearTimeout(timeout);
        activeChild = undefined;
        resolve({ stdout, stderr, status, signal, error });
      });
    });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Security test process failed (${result.signal || result.status})`);
    const summary = (name) => {
      const matches = [...result.stdout.matchAll(new RegExp(`^# ${name} (\\d+)$`, 'gm'))];
      assert.equal(matches.length, 1, `Missing or ambiguous test summary: ${name}`);
      return Number(matches[0][1]);
    };
    // Baseline: 19 auth/image/push/relay regressions + one real SQL integration test.
    // Review this count when adding/removing tests; missing or skipped checks fail.
    assert.equal(summary('tests'), 20, 'Expected all 20 security tests');
    assert.equal(summary('pass'), 20, 'Every security test must pass');
    for (const name of ['fail', 'cancelled', 'skipped', 'todo']) assert.equal(summary(name), 0, name);
  } catch (error) {
    failed = true;
    console.error(error.message);
    process.exitCode ||= 1;
  } finally {
    if (cleanup() && !failed) console.log('All 20 security tests passed; disposable database removed.');
  }
}
main();
