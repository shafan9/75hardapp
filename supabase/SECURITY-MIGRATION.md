# Squad database access cutover

Apply `migrations/20261023_restrict_squad_data_access.sql` as the database owner
to an existing installation. `schema.sql` is a historical bootstrap snapshot,
not a substitute for applying later migrations. Do not run it over live data.

The migration changes policies, grants and helper functions, plus two non-unique
membership indexes. It does not insert, update or delete application rows.
Anonymous callers cannot enumerate profiles, squads, progress, completions,
comments, reactions or achievements. Signed-in browser callers see their own
profile and squad data, and can add their own comments/reactions within a squad.
Membership, progress and completion writes remain in the existing verified
server API routes. The helper functions always use `auth.uid()` and live in a
schema that should not be added to the Data API's exposed schemas.

Before applying:

1. Save the current policies and grants and record aggregate row counts.
2. Verify that row-level security is enabled and no progress records lack a
   matching membership. The migration checks these conditions itself and aborts
   atomically if they fail. Short lock/statement timeouts also abort safely.
3. Review the existing membership roster with the squad owner. The old policies
   allowed arbitrary self-enrollment. This patch blocks future enrollment
   bypasses but deliberately preserves existing memberships; it cannot establish
   whether any were forged before the cutover. A zero orphan-progress count is
   **not** proof of legitimate membership or absence of past compromise. Do not
   delete or bulk revoke existing members without that review.

After applying, repeat anonymous REST checks and aggregate counts. Check the
signed-in feed and checklist with an existing authorized account. Do not create
production test accounts, send notification tests or expose live invitation
codes for verification. Keep the previous application deployment available for
rollback. Reverting database policies would reopen the old exposure and needs
separate incident judgment.

Local validation uses the actual PostgreSQL policy engine with synthetic users,
two squads and a service role. It covers the old trigger, denied membership and
progress writes, co-member reads, feed insert/upsert/delete, wrong identities,
cross-squad reassignment, legacy helper revocation, transactional failure,
idempotency, retained rows and the orphan-progress deployment guard:

```sh
SQUAD_TEST_PG_SOCKET=/private/tmp SQUAD_TEST_PG_PORT=65439 \
  node --test tests/security/database-access.test.cjs
```

Use a dedicated local PostgreSQL instance with `listen_addresses=''`. The test
creates a uniquely named synthetic database and never uses `DATABASE_URL`.
Without the socket variable, the test is skipped during the general JS test run.

The migration is containment for the live access-control defects. Historical
membership legitimacy, previously accessed data, and separate server-side
security findings require their own evidence; this patch does not certify them.
