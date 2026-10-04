import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCatalogue, validateCatalogue } from './catalogue';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');
const catalogue = loadCatalogue();
const routes = catalogue.flows.map((f) => f.route);
const ids = new Set(catalogue.flows.map((f) => f.id));

describe('flow catalogue', () => {
  it('is structurally valid', () => {
    assert.deepEqual(validateCatalogue(catalogue), []);
  });

  it('covers every staff sidebar section', () => {
    const source = read('apps/staff/components/staff-layout.tsx');
    const values = [...source.matchAll(/value: '([a-z-]+)'/g)].map((m) => m[1]);
    assert.ok(values.length >= 10, 'expected to parse the staff nav items');
    for (const value of values) {
      const route = value === 'overview' ? '/' : `/?tab=${value}`;
      assert.ok(
        routes.some((r) => r === route || r.startsWith(`${route}&`)),
        `no flow for staff nav "${value}"`
      );
    }
  });

  it('covers every scholar profile tab', () => {
    const source = read('apps/staff/components/scholar-profile.tsx');
    const tabs = [...source.matchAll(/<TabsTrigger value="([a-z-]+)"/g)].map((m) => m[1]);
    assert.ok(tabs.length >= 7, 'expected to parse the scholar profile tabs');
    for (const tab of tabs) {
      assert.ok(
        routes.some((r) => r.includes(`scholarTab=${tab}`)),
        `no flow for profile tab "${tab}"`
      );
    }
  });

  it('covers every student nav item', () => {
    const source = read('apps/scholar/components/scholar-layout.tsx');
    const hrefs = [...source.matchAll(/href: '(\/[a-z-]+)'/g)].map((m) => m[1]);
    assert.ok(hrefs.length >= 10, 'expected to parse the student nav items');
    for (const href of hrefs) {
      assert.ok(
        catalogue.flows.some((f) => f.app === 'scholar' && f.route === href),
        `no flow for student nav "${href}"`
      );
    }
  });

  it('includes every flow named in ASH-122', () => {
    const required = [
      'staff.overview',
      'staff.scholars.list',
      'staff.scholars.profile',
      'staff.scholars.onboard',
      'staff.scholars.assign-task',
      'staff.scholars.assign-prep-cohort',
      'staff.scholars.export-csv',
      'staff.prep-documents',
      'staff.prep-tasks',
      'staff.prep-reports',
      'staff.annual-reviews',
      'staff.requests',
      'staff.announcements.create',
      'staff.announcements.draft-live',
      'staff.resources',
      'staff.invitations.active-staff',
      'staff.invitations.staff-invites',
      'staff.invitations.scholar-invites',
      'staff.invitations.invite-staff',
      'staff.invitations.onboard-student',
      'student.sign-in',
      'student.signup-from-invite',
      'student.overview',
      'student.profile',
      'student.ldf',
      'student.tasks',
      'student.requests',
      'student.announcements',
      'student.resources',
      'prep.documents',
      'prep.proposal',
      'prep.chrome',
      'scholar.annual-review',
      'scholar.chrome',
    ];
    for (const id of required) assert.ok(ids.has(id), `missing ${id}`);
  });

  it('keeps the Prep Year and enrolled-scholar paths distinct', () => {
    const flow = (id: string) => catalogue.flows.find((f) => f.id === id);
    assert.ok(flow('prep.chrome')?.steps.some((s) => s.notSeeLink === 'My Annual Review'));
    assert.ok(flow('scholar.chrome')?.steps.some((s) => s.notSeeLink === 'My Documents'));
    assert.equal(flow('prep.documents')?.persona, 'prep');
    assert.equal(flow('scholar.annual-review')?.persona, 'scholar');
  });

  it('never flips a scholar to another stage', () => {
    for (const flow of catalogue.flows) {
      for (const step of flow.steps) {
        assert.ok(
          !JSON.stringify(step).toLowerCase().includes('flip to'),
          `${flow.id} must not click Flip to scholar`
        );
      }
    }
  });
});
