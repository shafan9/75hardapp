# Security CI

`Security regression and build` runs on every pull request and on pushes to
`main`. It has no path exclusions. Manual runs are also available. Superseded
runs for the same event/ref are cancelled; unrelated PRs and main do not cancel
each other. One standard Ubuntu 24.04 runner has a 15-minute job limit.

The workflow uses read-only repository permissions, does not retain checkout
credentials, and does not receive production secrets. It does not deploy, call
the production smoke scripts, upload artifacts, or create a dependency cache.
Build configuration uses the reserved `ci.invalid` hostname and a synthetic
publishable key. Next's production build includes its TypeScript check.

CI deliberately uses Node 22.23.4, npm 10.9.9 and the runner's PostgreSQL 16.
Action references use immutable commits. Toolchain changes must be reviewed;
these CI choices do not change Netlify's Node or adapter configuration. The
Linux image tests exercise the installed Linux Sharp binaries. They do not
establish the identity of an already-deployed Netlify artifact.

## Run locally

With Node 22.23.4, npm 10.9.9 and PostgreSQL server/client binaries installed:

```sh
npm ci --no-audit --no-fund
npm run test:security
npm run lint
NEXT_PUBLIC_SUPABASE_URL=https://ci.invalid \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_placeholder \
NEXT_PUBLIC_SITE_URL=https://ci.invalid NEXT_TELEMETRY_DISABLED=1 npm run build
```

Set `SQUAD_TEST_PG_BIN` to an absolute PostgreSQL `bin` directory when it is not
on PATH. The runner creates a private temporary cluster with TCP disabled and
only synthetic records. It ignores caller PostgreSQL connection settings, owns
its socket, and stops/removes the cluster after completion. It never uses
`DATABASE_URL`. A missing binary or any missing, failing, skipped, cancelled or
todo test fails the command. Review the explicit 20-test baseline when changing
tests: 19 auth/image/push/relay regressions plus the database integration test.
SIGINT/SIGTERM also request bounded cleanup. An uncatchable kill or machine
failure can leave a local fixture behind: use the printed fixture path with
`pg_ctl -D <fixture>/data -m immediate -w -t 15 stop`, then remove that fixture
directory only after the server has stopped. GitHub's runner is disposable.

## Merge and release boundaries

After this check has passed on GitHub, a repository administrator can require
the exact check names `Security regression and build` and CodeQL's
`Analyze (javascript-typescript)` (GitHub Actions app ID `15368`) on `main`.
This PR does not change branch protection or review rules.
Owner/admin credentials can still bypass controls they are allowed to change.

Passing CI is not release approval or production assurance. Authentication,
database policy, and provider-cost changes still need independent review and
appropriate application-level positive/negative tests. A release must bind the
tested source and lockfile to its deployment artifact, runtime/adapter/native
libraries, database-policy version and credential-version references. Use a
compatible known-secure rollback artifact; do not restore pre-security code or
policies to make a deployment succeed.

Standard GitHub-hosted runners are free for this public repository. Do not copy
the workflow into a private repository until its quota and spending controls
are verified. No larger runners, paid services or new schedules are configured.
