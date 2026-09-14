#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import process from 'node:process';
import {
  assertAppliedMigrationWhens,
  defaultJournalPath,
  parseAppliedWhens,
} from './check-migration-journal.mjs';

const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

const appliedWhens = parseAppliedWhens(Buffer.concat(chunks).toString('utf8'));
if (appliedWhens.some((value) => !Number.isFinite(value))) {
  console.error('Expected numeric created_at rows from drizzle.__drizzle_migrations.');
  process.exit(1);
}

const journal = JSON.parse(readFileSync(defaultJournalPath(), 'utf8'));
const { failures } = assertAppliedMigrationWhens(journal.entries ?? [], appliedWhens);

if (failures.length > 0) {
  console.error('Drizzle skipped one or more journaled migrations:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const last = journal.entries.at(-1);
console.log(
  `Database migrations match the journal (${journal.entries.length} files, tip ${last.tag}).`
);
