import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { analyze, CATALOGUE_PATH } from './check-flow-coverage.mjs';

const catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8'));

function run(diffText, { files = {}, specSources = [], existing, cat = catalogue } = {}) {
  return analyze({
    diffText,
    catalogue: cat,
    readFile: (p) => files[p],
    fileExists: existing ?? (() => true),
    specSources,
  });
}

const diffFor = (file, { added = [], removed = [], isNew = false } = {}) =>
  [
    `diff --git a/${file} b/${file}`,
    isNew ? '--- /dev/null' : `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -1,${removed.length} +10,${added.length} @@`,
    ...removed.map((l) => `-${l}`),
    ...added.map((l) => `+${l}`),
  ].join('\n');

describe('check-flow-coverage', () => {
  it('flags a new student page + nav item that is not in the catalogue', () => {
    const diff = [
      diffFor('apps/scholar/app/(scholar)/mentoring/page.tsx', {
        isNew: true,
        added: ['export default function Page() {}'],
      }),
      diffFor('apps/scholar/components/scholar-layout.tsx', {
        added: ["  { id: 'mentoring', href: '/mentoring', label: 'Mentoring', icon: Users },"],
      }),
    ].join('\n');
    const findings = run(diff);
    assert.equal(findings.length, 2);
    assert.match(findings[0].what, /page route "\/mentoring" is not in the flow catalogue/);
    assert.match(findings[1].what, /student nav item "\/mentoring" is not in the flow catalogue/);
  });

  it('flags a catalogue flow whose specs do not exist (the "My Proposal with zero tests" case)', () => {
    const findings = run(
      diffFor('apps/scholar/components/scholar-layout.tsx', {
        added: ["  { id: 'proposal', href: '/proposal', label: 'My Proposal', icon: PenLine },"],
      }),
      { existing: () => false }
    );
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].flows, ['prep.proposal']);
    assert.match(findings[0].fix, /Jest component\/page test/);
  });

  it('stays silent when the new nav item maps to a covered flow', () => {
    const findings = run(
      diffFor('apps/scholar/components/scholar-layout.tsx', {
        added: ["  { id: 'proposal', href: '/proposal', label: 'My Proposal', icon: PenLine },"],
      })
    );
    assert.deepEqual(findings, []);
  });

  it('honours an explicit specSkip in the catalogue', () => {
    const cat = structuredClone(catalogue);
    const flow = cat.flows.find((f) => f.id === 'student.resources');
    flow.specs = [];
    flow.specSkip = 'Covered by the QA skill only for now';
    const findings = run(
      diffFor('apps/scholar/components/scholar-layout.tsx', {
        added: ["  { id: 'resources', href: '/resources', label: 'Resources', icon: Library },"],
      }),
      { cat }
    );
    assert.deepEqual(findings, []);
  });

  it('flags a new staff section and profile tab with no flow', () => {
    const diff = [
      diffFor('apps/staff/components/staff-layout.tsx', {
        added: ["    value: 'mentors',"],
      }),
      diffFor('apps/staff/components/scholar-profile.tsx', {
        added: ['            <TabsTrigger value="mentoring">Mentoring</TabsTrigger>'],
      }),
    ].join('\n');
    const kinds = run(diff).map((f) => f.what);
    assert.deepEqual(kinds, [
      'new staff sidebar section "mentors" is not in the flow catalogue',
      'new scholar profile tab "mentoring" is not in the flow catalogue',
    ]);
  });

  it('flags a new API write path with no spec, and passes once a spec calls it', () => {
    const file = 'apps/api/src/mentors/mentors.controller.ts';
    const source = [
      "@Controller('api/mentors')",
      'export class MentorsController {',
      '  constructor(private readonly service: MentorsService) {}',
      '',
      '  @Post(":id/assign")',
      '  @UseGuards(StaffGuard)',
      '  async assignMentor(@Param("id") id: string) {',
      '    return this.service.assign(id);',
      '  }',
      '}',
    ].join('\n');
    const diff = [
      `diff --git a/${file} b/${file}`,
      `--- a/${file}`,
      `+++ b/${file}`,
      '@@ -4,0 +5,1 @@',
      '+  @Post(":id/assign")',
    ].join('\n');

    const flagged = run(diff, { files: { [file]: source } });
    assert.equal(flagged.length, 1);
    assert.equal(flagged[0].what, 'new write path POST /api/mentors/:id/assign');

    const covered = run(diff, {
      files: { [file]: source },
      specSources: ['await controller.assignMentor("m1");'],
    });
    assert.deepEqual(covered, []);
  });

  it('ignores docs-only, copy-only and infra-only changes', () => {
    const diff = [
      diffFor('docs/getting-started.md', { added: ['New paragraph about /dashboard'] }),
      diffFor('apps/scholar/components/scholar-layout.tsx', {
        removed: ["  { id: 'tasks', href: '/tasks', label: 'My Tasks', icon: CheckSquare },"],
        added: ["  { id: 'tasks', href: '/tasks', label: 'Your Tasks', icon: CheckSquare },"],
      }),
      diffFor('infra/accounts/test/main.tf', { added: ['  engine_version = "17"'] }),
    ].join('\n');
    // The relabelled nav item still maps to the covered student.tasks flow.
    assert.deepEqual(run(diff), []);
  });

  it('ignores a Biome-only reformat that moves route decorators and nav items', () => {
    const diff = [
      diffFor('apps/api/src/tasks/tasks.controller.ts', {
        removed: ["  @Post('bulk')", "  @Get('my-tasks')"],
        added: ["    @Post('bulk')", "    @Get('my-tasks')"],
      }),
      diffFor('apps/staff/components/staff-layout.tsx', {
        removed: [
          "  { href: '/?tab=requests', value: 'requests', label: 'Requests', icon: FileText },",
        ],
        added: [
          "  {  href: '/?tab=requests',  value: 'requests', label: 'Requests', icon: FileText },",
        ],
      }),
    ].join('\n');
    assert.deepEqual(run(diff, { existing: () => false }), []);
  });
});
