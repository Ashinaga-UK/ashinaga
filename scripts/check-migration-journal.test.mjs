import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertAppliedMigrationWhens,
  checkAccountExpiresAt,
  checkMigrationJournal,
  readAccountExpiresAtSources,
  SKIPPED_JOURNAL_TAGS,
} from './check-migration-journal.mjs';

const monotonic = [
  { idx: 0, tag: '0000_a', when: 100 },
  { idx: 1, tag: '0001_b', when: 200 },
  { idx: 2, tag: '0002_c', when: 300 },
];

describe('checkMigrationJournal', () => {
  it('accepts a strictly increasing journal', () => {
    assert.deepEqual(checkMigrationJournal(monotonic).failures, []);
  });

  it('rejects inverted timestamps', () => {
    const { failures } = checkMigrationJournal([
      { idx: 0, tag: '0000_a', when: 200 },
      { idx: 1, tag: '0001_b', when: 100 },
    ]);
    assert.match(failures[0], /0001_b when=100 <= max\(previous\)=200/);
  });

  it('rejects equal timestamps (Drizzle would skip the later file)', () => {
    const { failures } = checkMigrationJournal([
      { idx: 0, tag: '0000_a', when: 100 },
      { idx: 1, tag: '0001_b', when: 100 },
    ]);
    assert.match(failures[0], /0001_b when=100 <= max\(previous\)=100/);
  });

  it('rejects a non-allowlisted entry in the gap after an allowlisted inversion', () => {
    const { failures } = checkMigrationJournal([
      { idx: 0, tag: '0016_married_thing', when: 300 },
      { idx: 1, tag: '0017_new_redwing', when: 100 },
      { idx: 2, tag: '0018_gap_entry', when: 250 },
    ]);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /0018_gap_entry when=250 <= max\(previous\)=300/);
  });

  it('rejects missing or non-finite when', () => {
    assert.match(checkMigrationJournal([{ idx: 0, tag: '0000_a' }]).failures[0], /finite number/);
    assert.match(
      checkMigrationJournal([{ idx: 0, tag: '0000_a', when: Number.NaN }]).failures[0],
      /finite number/
    );
  });

  it('allowlists the known 0017 inversion', () => {
    const { failures } = checkMigrationJournal([
      { idx: 0, tag: '0016_married_thing', when: 1786711054195 },
      { idx: 1, tag: '0017_new_redwing', when: 1786641850176 },
      { idx: 2, tag: '0018_remarkable_vulture', when: 1787833180461 },
    ]);
    assert.deepEqual(failures, []);
    assert.equal(SKIPPED_JOURNAL_TAGS.has('0017_new_redwing'), true);
  });
});

describe('assertAppliedMigrationWhens', () => {
  it('requires every non-allowlisted when to be present', () => {
    const { failures } = assertAppliedMigrationWhens(monotonic, [100, 300]);
    assert.match(failures[0], /0001_b when=200 is not in/);
  });

  it('allowlists 0017 when the row was never recorded', () => {
    const { failures } = assertAppliedMigrationWhens(
      [
        { tag: '0016_married_thing', when: 1786711054195 },
        { tag: '0017_new_redwing', when: 1786641850176 },
        { tag: '0018_remarkable_vulture', when: 1787833180461 },
      ],
      [1786711054195, 1787833180461]
    );
    assert.deepEqual(failures, []);
  });
});

const keptColumns = ['access_token_expires_at', 'refresh_token_expires_at', 'scope', 'password'];
const additiveSql = [
  {
    name: '0036_orange_skrulls.sql',
    sql: `ALTER TABLE "account" ADD COLUMN "access_token_expires_at" timestamp with time zone;--> statement-breakpoint
UPDATE "account" SET "access_token_expires_at" = "expires_at";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "refresh_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "scope" text;`,
  },
];

describe('checkAccountExpiresAt', () => {
  it('accepts the additive 0036 migration and a snapshot that omits expires_at', () => {
    assert.deepEqual(checkAccountExpiresAt(additiveSql, keptColumns).failures, []);
  });

  it('rejects a rename or drop of account.expires_at', () => {
    const rename = checkAccountExpiresAt(
      [
        {
          name: '0036_orange_skrulls.sql',
          sql: 'ALTER TABLE "account" RENAME COLUMN "expires_at" TO "access_token_expires_at";',
        },
      ],
      keptColumns
    );
    assert.match(rename.failures[0], /renames or drops/);

    const laterDrop = checkAccountExpiresAt(
      [
        ...additiveSql,
        {
          name: '0037_drop.sql',
          sql: 'ALTER TABLE "account" DROP COLUMN "expires_at";',
        },
      ],
      keptColumns
    );
    assert.match(laterDrop.failures[0], /0037_drop.sql/);
  });

  it('rejects a snapshot that still lists account.expires_at', () => {
    const { failures } = checkAccountExpiresAt(additiveSql, [...keptColumns, 'expires_at']);
    assert.match(failures[0], /next drizzle-kit generate would drop/);
  });

  it('matches the migrations on disk', () => {
    const migrationsDir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../apps/api/src/db/migrations'
    );
    const sources = readAccountExpiresAtSources(migrationsDir);
    assert.deepEqual(checkAccountExpiresAt(sources.sqlFiles, sources.accountColumns).failures, []);
  });
});
