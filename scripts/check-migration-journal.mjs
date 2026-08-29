#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const journalPath = path.join(
  process.cwd(),
  'apps/api/src/db/migrations/meta/_journal.json'
);
const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
const entries = journal.entries ?? [];

if (entries.length === 0) {
  console.error('Migration journal has no entries.');
  process.exit(1);
}

const failures = [];

for (let i = 0; i < entries.length; i++) {
  const current = entries[i];
  if (current.idx !== i) {
    failures.push(`${current.tag}: idx=${current.idx} expected ${i}`);
  }
  if (i === 0) continue;
  const previous = entries[i - 1];
  if (current.when <= previous.when) {
    failures.push(
      `${current.tag} when=${current.when} <= ${previous.tag} when=${previous.when}`
    );
  }
}

if (failures.length > 0) {
  console.error('Drizzle journal timestamps must be strictly increasing:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Migration journal timestamps are monotonic (${entries.length} entries).`);
