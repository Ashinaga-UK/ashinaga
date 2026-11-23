#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/** Applied on some DBs with an inverted `when`; columns were later backfilled by 0019. */
export const SKIPPED_JOURNAL_TAGS = new Set(['0017_new_redwing']);

export function defaultJournalPath() {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../apps/api/src/db/migrations/meta/_journal.json'
  );
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function checkMigrationJournal(entries, { allowlistedTags = SKIPPED_JOURNAL_TAGS } = {}) {
  const failures = [];

  if (!Array.isArray(entries) || entries.length === 0) {
    return { failures: ['Migration journal has no entries.'] };
  }

  let maxWhen = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    const tag = current?.tag ?? `<idx ${i}>`;

    if (current.idx !== i) {
      failures.push(`${tag}: idx=${current.idx} expected ${i}`);
    }

    if (!isFiniteNumber(current.when)) {
      failures.push(`${tag}: when must be a finite number, got ${JSON.stringify(current.when)}`);
      continue;
    }

    if (i > 0 && current.when <= maxWhen && !allowlistedTags.has(current.tag)) {
      failures.push(`${tag} when=${current.when} <= max(previous)=${maxWhen}`);
    }

    maxWhen = Math.max(maxWhen, current.when);
  }

  return { failures };
}

export function assertAppliedMigrationWhens(
  entries,
  appliedWhens,
  { allowlistedTags = SKIPPED_JOURNAL_TAGS } = {}
) {
  const applied = new Set(appliedWhens.map(Number));
  const failures = [];

  for (const entry of entries) {
    if (allowlistedTags.has(entry.tag)) continue;
    if (!applied.has(Number(entry.when))) {
      failures.push(
        `${entry.tag} when=${entry.when} is not in drizzle.__drizzle_migrations.created_at`
      );
    }
  }

  return { failures };
}

function changesAccountExpiresAt(sql) {
  return sql.split('--> statement-breakpoint').some((statement) => {
    const compact = statement.replace(/\s+/g, ' ');
    return (
      compact.includes('ALTER TABLE "account"') &&
      /(?:DROP|RENAME) COLUMN "expires_at"/.test(compact)
    );
  });
}

/** Better Auth 1.6 compat migration tag fragment (survives renumber, e.g. 0037_orange_skrulls). */
export const BETTER_AUTH_COMPAT_TAG = 'orange_skrulls';

export function findBetterAuthCompatSql(sqlFiles) {
  return sqlFiles.find(
    (file) => file.name.includes(BETTER_AUTH_COMPAT_TAG) && file.name.endsWith('.sql')
  );
}

/** Compat migration must add the 1.6 columns beside expires_at. A later drop is deliberate. */
export function checkAccountExpiresAt(sqlFiles, accountColumns) {
  const failures = [];
  const compat = findBetterAuthCompatSql(sqlFiles);

  if (!compat) {
    failures.push(`Missing Better Auth compat migration (*_${BETTER_AUTH_COMPAT_TAG}.sql).`);
  } else if (changesAccountExpiresAt(compat.sql)) {
    failures.push(`${compat.name} renames or drops account.expires_at.`);
  } else if (
    !compat.sql.includes('ADD COLUMN "access_token_expires_at"') ||
    !compat.sql.includes('SET "access_token_expires_at" = "expires_at"') ||
    !compat.sql.includes('ADD COLUMN "refresh_token_expires_at"') ||
    !compat.sql.includes('ADD COLUMN "scope"')
  ) {
    failures.push(
      `${compat.name} must add the 1.6 account columns and backfill access_token_expires_at.`
    );
  }

  for (const file of sqlFiles) {
    if (file === compat) continue;
    if (changesAccountExpiresAt(file.sql)) {
      failures.push(
        `${file.name} changes account.expires_at. That drop waits until 1.3.4 can no longer be rolled back, in its own migration.`
      );
    }
  }

  const columns = new Set(accountColumns);
  for (const column of ['access_token_expires_at', 'refresh_token_expires_at', 'scope']) {
    if (!columns.has(column)) {
      failures.push(`Better Auth compat snapshot account is missing ${column}.`);
    }
  }
  if (columns.has('expires_at')) {
    failures.push(
      'Better Auth compat snapshot lists account.expires_at. The next drizzle-kit generate would drop the column the running 1.3.4 image still selects.'
    );
  }

  return { failures };
}

export function readAccountExpiresAtSources(migrationsDir) {
  const sqlFiles = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({
      name,
      sql: readFileSync(path.join(migrationsDir, name), 'utf8'),
    }));

  const journal = JSON.parse(
    readFileSync(path.join(migrationsDir, 'meta', '_journal.json'), 'utf8')
  );
  const entry = (journal.entries ?? []).find((e) =>
    String(e.tag ?? '').includes(BETTER_AUTH_COMPAT_TAG)
  );
  if (!entry) {
    throw new Error(
      `Journal is missing Better Auth compat tag containing ${BETTER_AUTH_COMPAT_TAG}`
    );
  }
  const prefix = String(entry.tag).match(/^(\d+)_/)?.[1];
  if (!prefix) {
    throw new Error(`Better Auth compat journal tag has no numeric prefix: ${entry.tag}`);
  }
  const snapshot = JSON.parse(
    readFileSync(path.join(migrationsDir, 'meta', `${prefix}_snapshot.json`), 'utf8')
  );
  const accountColumns = Object.keys(snapshot.tables['public.account'].columns);
  return { sqlFiles, accountColumns, compatTag: entry.tag, snapshotName: `${prefix}_snapshot.json` };
}

export function parseAppliedWhens(raw) {
  return String(raw)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => Number(line));
}

function isMain() {
  const invoked = process.argv[1];
  return Boolean(invoked) && path.basename(invoked) === 'check-migration-journal.mjs';
}

if (isMain()) {
  const journalPath = process.argv[2] || defaultJournalPath();
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  const { failures } = checkMigrationJournal(journal.entries ?? []);

  if (failures.length > 0) {
    console.error('Drizzle journal timestamps must be strictly increasing:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Migration journal timestamps are monotonic (${journal.entries.length} entries).`);

  const migrationsDir = path.join(path.dirname(journalPath), '..');
  const sources = readAccountExpiresAtSources(migrationsDir);
  const account = checkAccountExpiresAt(sources.sqlFiles, sources.accountColumns);
  if (account.failures.length > 0) {
    console.error('account.expires_at must stay in the database until 1.3.4 rollback is retired:');
    for (const failure of account.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log('account.expires_at stays beside the Better Auth 1.6 columns.');
}
