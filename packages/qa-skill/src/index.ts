import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalogue, validateCatalogue } from './catalogue';
import { summarise, toMarkdown } from './report';
import { runFlows } from './runner';
import { seedLocal } from './seed-local';
import { resolveTarget } from './target';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return { command, flags };
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const catalogue = loadCatalogue();
  const problems = validateCatalogue(catalogue);
  if (problems.length > 0) {
    console.error(`Flow catalogue is invalid:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }

  if (command === 'list') {
    for (const flow of catalogue.flows) {
      console.log(`${flow.id}\t${flow.persona}\t${flow.route}\t${flow.name}`);
    }
    console.log(`\n${catalogue.flows.length} flows.`);
    return;
  }

  if (command === 'seed-local') {
    await seedLocal();
    return;
  }

  if (command !== 'run') {
    console.error('Usage: qa <run|list|seed-local> [--target test|local] [--only id,prefix]');
    process.exit(1);
  }

  const target = resolveTarget(String(flags.target || process.env.QA_TARGET || 'test'));
  const only = typeof flags.only === 'string' ? flags.only.split(',').map((s) => s.trim()) : [];
  const flows = only.length
    ? catalogue.flows.filter((f) => only.some((o) => f.id === o || f.id.startsWith(`${o}.`)))
    : catalogue.flows;

  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(
    typeof flags.out === 'string' ? flags.out : path.join(packageDir, 'reports', stamp)
  );

  console.log(`Running ${flows.length} flows against ${target.name} (${target.staffUrl})...`);
  const results = await runFlows({ target, flows, outDir, headed: flags.headed === true });

  const markdown = toMarkdown(results, target, startedAt);
  writeFileSync(path.join(outDir, 'report.md'), markdown);
  writeFileSync(
    path.join(outDir, 'report.json'),
    JSON.stringify({ target, startedAt, results }, null, 2)
  );
  console.log(markdown);
  console.log(`Report written to ${outDir}`);

  if (summarise(results).fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
