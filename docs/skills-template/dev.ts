#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function loadEnvFile(filePath: string): void {
  const content = readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const index = line.indexOf('=');
    if (index <= 0) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const packageDir = path.resolve(path.dirname(currentFilePath), '..');
const envLocalPath = path.join(packageDir, '.env.local');
const envPath = path.join(packageDir, '.env');

if (existsSync(envLocalPath)) {
  loadEnvFile(envLocalPath);
} else if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('[your-skill] Skipping dev task: no command arguments provided.');
  process.exit(0);
}

await import('./index.ts');
