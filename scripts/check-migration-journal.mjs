#!/usr/bin/env node

import { readFileSync } from 'node:fs';
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

  console.log(
    `Migration journal timestamps are monotonic (${journal.entries.length} entries).`
  );
}
