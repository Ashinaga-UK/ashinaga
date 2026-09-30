#!/usr/bin/env node
/**
 * Flow-coverage detector (ASH-123).
 *
 * Compares this branch with its base and flags only NEW or CHANGED product flows that no
 * spec covers:
 *   - a new staff/scholar `page.tsx` route
 *   - a new staff sidebar section, student nav item or scholar-profile tab
 *   - a new `/api/` controller route (GET or write) whose handler/path no spec mentions
 *
 * UI flows are resolved against the ASH-122 flow catalogue
 * (packages/qa-skill/catalogue/flows.json) and reported by the same flow IDs. A flow is covered
 * when it lists specs that exist, or carries an explicit `specSkip` reason.
 *
 * Silent on docs, copy, styling, infra and formatting-only changes: only added route/nav/tab
 * lines count, and a line that was merely moved or reformatted cancels out.
 *
 * Usage: node scripts/check-flow-coverage.mjs [--base origin/test] [--head HEAD]
 * (Spec files and the catalogue are read from the working tree, so --head is for spot checks.)
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const CATALOGUE_PATH = 'packages/qa-skill/catalogue/flows.json';
const SPEC_FILE = /\.(spec|test|e2e-spec)\.(ts|tsx)$/;
const API_DECORATOR = /@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)'|"([^"]*)")?\s*\)/;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const normalise = (text) => text.replace(/\s+/g, ' ').trim();

/** Parse `git diff --unified=0` output into per-file added/removed lines. */
export function parseDiff(diffText) {
  const files = new Map();
  let current = null;
  let newLine = 0;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = { path: null, isNew: false, renamedFrom: null, added: [], removed: [] };
      continue;
    }
    if (!current) continue;
    if (line.startsWith('--- ')) {
      if (line === '--- /dev/null') current.isNew = true;
      continue;
    }
    if (line.startsWith('rename from ')) {
      current.renamedFrom = line.slice('rename from '.length);
      continue;
    }
    if (line.startsWith('rename to ')) {
      current.path = line.slice('rename to '.length);
      files.set(current.path, current);
      continue;
    }
    if (line.startsWith('+++ ')) {
      if (line !== '+++ /dev/null') {
        current.path = line.slice(line.startsWith('+++ b/') ? 6 : 4);
        files.set(current.path, current);
      }
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (line.startsWith('+')) {
      current.added.push({ line: newLine, text: line.slice(1) });
      newLine++;
    } else if (line.startsWith('-')) {
      current.removed.push(line.slice(1));
    }
  }
  return files;
}

/** Added lines that are not just a moved/reformatted copy of a removed line in the same file. */
function genuinelyAdded(file) {
  const removed = new Map();
  for (const text of file.removed) {
    const key = normalise(text);
    removed.set(key, (removed.get(key) ?? 0) + 1);
  }
  return file.added.filter(({ text }) => {
    const key = normalise(text);
    const count = removed.get(key) ?? 0;
    if (count > 0) {
      removed.set(key, count - 1);
      return false;
    }
    return true;
  });
}

function pageRoute(filePath) {
  const match = filePath.match(/^apps\/(staff|scholar)\/app\/(?:(.*)\/)?page\.tsx$/);
  if (!match) return null;
  const segments = (match[2] ?? '').split('/').filter((s) => s && !/^\(.*\)$/.test(s));
  return { app: match[1], route: `/${segments.join('/')}` };
}

/** Find new route/nav/tab/API signals in a parsed diff. */
export function findSignals(files) {
  const signals = [];
  for (const file of files.values()) {
    const page = pageRoute(file.path);
    if (page && (file.isNew || file.renamedFrom)) {
      const previous = file.renamedFrom ? pageRoute(file.renamedFrom) : null;
      if (!previous || previous.route !== page.route || previous.app !== page.app) {
        signals.push({ kind: 'page', app: page.app, key: page.route, file: file.path, line: 1 });
      }
    }

    const added = genuinelyAdded(file);
    const push = (kind, app, key, entry) =>
      signals.push({ kind, app, key, file: file.path, line: entry.line });

    if (file.path === 'apps/staff/components/staff-layout.tsx') {
      for (const entry of added) {
        const m = entry.text.match(/value: '([a-z0-9-]+)'/);
        if (m) push('staff-nav', 'staff', m[1], entry);
      }
    }
    if (file.path === 'apps/scholar/components/scholar-layout.tsx') {
      for (const entry of added) {
        const m = entry.text.match(/href: '(\/[a-z0-9/-]*)'/);
        if (m) push('student-nav', 'scholar', m[1], entry);
      }
    }
    if (file.path === 'apps/staff/components/scholar-profile.tsx') {
      for (const entry of added) {
        const m = entry.text.match(/<TabsTrigger value="([a-z0-9-]+)"/);
        if (m) push('profile-tab', 'staff', m[1], entry);
      }
    }
    if (/^apps\/api\/src\/.*\.controller\.ts$/.test(file.path)) {
      for (const entry of added) {
        const m = entry.text.match(API_DECORATOR);
        if (m) {
          signals.push({
            kind: 'api',
            app: 'api',
            method: m[1].toUpperCase(),
            subPath: m[2] ?? m[3] ?? '',
            file: file.path,
            line: entry.line,
          });
        }
      }
    }
  }
  return signals;
}

function flowsFor(signal, catalogue) {
  const flows = catalogue.flows;
  switch (signal.kind) {
    case 'staff-nav': {
      const route = signal.key === 'overview' ? '/' : `/?tab=${signal.key}`;
      return flows.filter(
        (f) => f.app === 'staff' && (f.route === route || f.route.startsWith(`${route}&`))
      );
    }
    case 'student-nav':
      return flows.filter((f) => f.app === 'scholar' && f.route === signal.key);
    case 'profile-tab':
      return flows.filter((f) => f.route.includes(`scholarTab=${signal.key}`));
    case 'page':
      return flows.filter(
        (f) =>
          f.app === signal.app && (f.route === signal.key || f.route.startsWith(`${signal.key}?`))
      );
    default:
      return [];
  }
}

function isCovered(flow, fileExists) {
  if (flow.specSkip) return true;
  return (flow.specs ?? []).some((spec) => fileExists(spec));
}

function describeSignal(signal) {
  switch (signal.kind) {
    case 'staff-nav':
      return `staff sidebar section "${signal.key}"`;
    case 'student-nav':
      return `student nav item "${signal.key}"`;
    case 'profile-tab':
      return `scholar profile tab "${signal.key}"`;
    case 'page':
      return `${signal.app} page route "${signal.key}"`;
    default:
      return `${signal.method} ${signal.route}`;
  }
}

function apiRoute(signal, readFile) {
  const source = readFile(signal.file) ?? '';
  const prefix = source.match(/@Controller\(\s*['"]([^'"]*)['"]\s*\)/)?.[1] ?? '';
  const route = `/${[prefix, signal.subPath].filter(Boolean).join('/')}`.replace(/\/+/g, '/');
  const lines = source.split('\n');
  let handler;
  for (let i = signal.line; i < Math.min(lines.length, signal.line + 12); i++) {
    const text = lines[i].trim();
    if (!text || text.startsWith('@') || text.startsWith('//')) continue;
    handler = text.match(/^(?:public\s+|private\s+)?(?:async\s+)?([A-Za-z0-9_]+)\s*\(/)?.[1];
    if (handler) break;
  }
  return { route, handler };
}

/**
 * Pure analysis: returns the uncovered new flows.
 * @param {{ diffText: string, catalogue: any, readFile: (p: string) => string | undefined,
 *           fileExists: (p: string) => boolean, specSources: string[] }} input
 */
export function analyze({ diffText, catalogue, readFile, fileExists, specSources }) {
  const findings = [];
  const exceptions = new Set((catalogue.apiCoverageExceptions ?? []).map((e) => e.route));

  for (const signal of findSignals(parseDiff(diffText))) {
    const where = `${signal.file}:${signal.line}`;

    if (signal.kind === 'api') {
      const { route, handler } = apiRoute(signal, readFile);
      const key = `${signal.method} ${route}`;
      if (exceptions.has(key)) continue;
      const staticPath = route.split('/:')[0];
      const pathLiterals = ["'", '"', '`'].map((quote) => `${quote}${staticPath}`);
      const mentioned = specSources.some(
        (src) =>
          (handler && src.includes(`.${handler}(`)) ||
          pathLiterals.some((literal) => src.includes(literal))
      );
      if (!mentioned) {
        findings.push({
          where,
          what: `${WRITE_METHODS.has(signal.method) ? 'new write path' : 'new API route'} ${key}`,
          flows: [],
          fix:
            `Add a controller/service unit spec (apps/api/src/**/${handler ?? 'handler'}.spec) or an ` +
            'API integration spec (apps/api/test/integration) that calls it, or list it in ' +
            'apiCoverageExceptions with a reason.',
        });
      }
      continue;
    }

    const flows = flowsFor(signal, catalogue);
    if (flows.length === 0) {
      findings.push({
        where,
        what: `new ${describeSignal(signal)} is not in the flow catalogue`,
        flows: [],
        fix:
          `Add a flow for it to ${CATALOGUE_PATH} (the ASH-122 QA skill walks it) and list the ` +
          'spec that covers it, or give the flow a specSkip reason.',
      });
      continue;
    }
    const uncovered = flows.filter((flow) => !isCovered(flow, fileExists));
    if (uncovered.length === flows.length) {
      findings.push({
        where,
        what: `${describeSignal(signal)} has no covering spec`,
        flows: uncovered.map((f) => f.id),
        fix:
          `Add the cheapest test that proves it (a Jest component/page test for ${signal.app}, ` +
          'Playwright only if it is a user-visible flow the e2e smoke does not already cover), ' +
          `then list it under "specs" for ${uncovered.map((f) => f.id).join(', ')} — or set specSkip.`,
      });
    }
  }
  return findings;
}

function listSpecSources(root) {
  const sources = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (SPEC_FILE.test(entry.name)) sources.push(readFileSync(full, 'utf8'));
    }
  };
  for (const top of ['apps', 'packages']) {
    if (existsSync(path.join(root, top))) walk(path.join(root, top));
  }
  return sources;
}

function formatReport(findings, base) {
  if (findings.length === 0) {
    return `Flow coverage: no new uncovered flows compared with ${base}.`;
  }
  const lines = [
    `Flow coverage: ${findings.length} new flow(s) compared with ${base} have no test.`,
    '',
  ];
  for (const f of findings) {
    lines.push(`- ${f.what}${f.flows.length ? ` [${f.flows.join(', ')}]` : ''} (${f.where})`);
    lines.push(`  Fix: ${f.fix}`);
  }
  lines.push('', 'See .claude/skills/flow-coverage/SKILL.md for when this fires and what to add.');
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const baseFlag = args.indexOf('--base');
  const base =
    baseFlag >= 0
      ? args[baseFlag + 1]
      : process.env.FLOW_COVERAGE_BASE ||
        (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/test');
  const headFlag = args.indexOf('--head');
  const head = headFlag >= 0 ? args[headFlag + 1] : 'HEAD';
  const root = process.cwd();

  const diffText = execFileSync(
    'git',
    ['diff', '--unified=0', '--no-color', '-M', `${base}...${head}`],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  const catalogue = JSON.parse(readFileSync(path.join(root, CATALOGUE_PATH), 'utf8'));
  const findings = analyze({
    diffText,
    catalogue,
    readFile: (p) =>
      existsSync(path.join(root, p)) ? readFileSync(path.join(root, p), 'utf8') : undefined,
    fileExists: (p) => existsSync(path.join(root, p)),
    specSources: listSpecSources(root),
  });

  const report = formatReport(findings, base);
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Flow coverage\n\n${report}\n`);
  }
  process.exit(findings.length > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
