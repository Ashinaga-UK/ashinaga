#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, 'packages');

if (!existsSync(packagesDir)) {
  console.log('No packages directory found. Skipping skill package checks.');
  process.exit(0);
}

const packageDirs = readdirSync(packagesDir)
  .map((name) => path.join(packagesDir, name))
  .filter((fullPath) => statSync(fullPath).isDirectory());

const skillPackages = packageDirs.filter((dir) => existsSync(path.join(dir, 'SKILL.md')));

if (skillPackages.length === 0) {
  console.log('No skill packages detected. Skipping skill package checks.');
  process.exit(0);
}

const failures = [];

for (const skillDir of skillPackages) {
  const rel = path.relative(rootDir, skillDir);
  const packageJsonPath = path.join(skillDir, 'package.json');
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const devPath = path.join(skillDir, 'src', 'dev.ts');
  const envExamplePath = path.join(skillDir, '.env.example');

  if (!existsSync(packageJsonPath)) {
    failures.push(`${rel}: missing package.json`);
    continue;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const devScript = packageJson?.scripts?.dev;

  if (!devScript || !String(devScript).includes('src/dev.ts')) {
    failures.push(`${rel}: scripts.dev must run src/dev.ts to avoid root dev breakages`);
  }

  if (!existsSync(devPath)) {
    failures.push(`${rel}: missing src/dev.ts`);
  }

  if (!existsSync(envExamplePath)) {
    failures.push(`${rel}: missing .env.example`);
  }

  const skillMd = existsSync(skillMdPath) ? readFileSync(skillMdPath, 'utf8') : '';

  if (!skillMd.includes('.env.example') || !skillMd.includes('.env.local')) {
    failures.push(`${rel}: SKILL.md must document .env.example -> .env.local setup`);
  }
}

if (failures.length > 0) {
  console.error('Skill package contract check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Skill package contract passed for ${skillPackages.length} package(s).`);
