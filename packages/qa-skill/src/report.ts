import type { FlowResult } from './runner';
import type { Target } from './target';

export function summarise(results: FlowResult[]) {
  return {
    total: results.length,
    pass: results.filter((r) => r.status === 'Pass').length,
    fail: results.filter((r) => r.status === 'Fail').length,
    skip: results.filter((r) => r.status === 'Skip').length,
  };
}

export function toMarkdown(results: FlowResult[], target: Target, startedAt: Date): string {
  const counts = summarise(results);
  const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const lines = [
    `# QA run: ${target.name}`,
    '',
    `- Started: ${startedAt.toISOString()}`,
    `- Staff: ${target.staffUrl} · Student: ${target.scholarUrl} · API: ${target.apiUrl}`,
    `- Result: **${counts.pass} Pass · ${counts.fail} Fail · ${counts.skip} Skip** of ${counts.total} flows`,
    '',
    '| Flow | Area | Result | Ran as | Notes |',
    '|---|---|---|---|---|',
    ...results.map(
      (r) =>
        `| \`${r.id}\` ${cell(r.name)} | ${cell(r.area)} | ${r.status} | ${r.personas.join(', ') || '—'} | ${cell(r.notes)} |`
    ),
    '',
  ];
  return lines.join('\n');
}
