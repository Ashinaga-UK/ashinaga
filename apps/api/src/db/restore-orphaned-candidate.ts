/**
 * Put a deleted scholar back on the candidate list without a new invitation.
 *
 * A delete that already happened removed the profile and left the login, so the
 * email cannot be invited again and the person is invisible. This recreates a
 * Prep Year profile on that same login. They keep the password they already chose.
 *
 * Usage (from apps/api, with the target environment's DB_* vars set):
 *   pnpm db:restore-candidate -- person@example.com
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { restoreOrphanedCandidate } from '../scholars/restore-orphaned-candidate';
import { closeDatabase, getDatabase } from './connection';

function loadLocalEnv(): void {
  const envPath = resolve(__dirname, '../../.env');
  let contents: string;
  try {
    contents = readFileSync(envPath, 'utf8');
  } catch {
    return;
  }
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  loadLocalEnv();
  const email = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
  if (!email) {
    throw new Error('Pass the email address: pnpm db:restore-candidate -- person@example.com');
  }

  const restored = await restoreOrphanedCandidate(getDatabase(), email);
  console.log(`Restored ${restored.name} <${restored.email}> as a Prep Year candidate.`);
  console.log(`Scholar id: ${restored.scholarId}`);
  console.log('They can sign in with their existing password. They will appear under Candidates.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
