import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import type { Flow } from './catalogue';
import { planPersonas, runSteps } from './runner';
import { isAllowedHost, resolveTarget } from './target';

describe('target allowlist', () => {
  it('allows test and localhost hosts', () => {
    for (const host of [
      'api-test.ashinaga-uk.org',
      'staff-test.ashinaga-uk.org',
      'scholar-test.ashinaga-uk.org',
      'localhost',
      '127.0.0.1',
      '[::1]',
    ]) {
      assert.equal(isAllowedHost(host), true, host);
    }
  });

  it('refuses production, including a trailing-dot hostname', () => {
    for (const url of [
      'https://staff.ashinaga-uk.org',
      'https://staff.ashinaga-uk.org.',
      'https://api.ashinaga-uk.org..',
      'https://www.ashinaga-uk.org',
      'https://ashinaga-uk.org',
      'https://b9ucm5htes.eu-west-3.awsapprunner.com',
      'https://staff-test.ashinaga-uk.org.evil.com',
    ]) {
      assert.equal(isAllowedHost(new URL(url).hostname), false, url);
    }
  });

  it('refuses a test target whose URL override points at production', () => {
    assert.throws(
      () => resolveTarget('test', { STAFF_APP_URL: 'https://staff.ashinaga-uk.org.' }),
      /Refusing to run/
    );
    assert.throws(
      () => resolveTarget('test', { API_URL: 'https://b9ucm5htes.eu-west-3.awsapprunner.com' }),
      /Refusing to run/
    );
    assert.equal(resolveTarget('test', {}).staffUrl, 'https://staff-test.ashinaga-uk.org');
    assert.equal(resolveTarget('local', {}).apiUrl, 'http://localhost:4000');
  });
});

describe('planPersonas', () => {
  const session = {};

  it('runs a both-stage flow as prep and scholar when both sessions exist', () => {
    assert.deepEqual(planPersonas({ persona: 'either' }, { prep: session, scholar: session }, {}), {
      personas: ['prep', 'scholar'],
    });
  });

  it('skips a both-stage flow when one student session is missing', () => {
    const plan = planPersonas(
      { persona: 'either' },
      { prep: session },
      { scholar: 'no scholar credentials (set QA_SCHOLAR_EMAIL/PASSWORD)' }
    );
    assert.ok('skip' in plan);
    assert.match(plan.skip, /needs prep and scholar/);
    assert.match(plan.skip, /no scholar credentials/);
  });

  it('skips a single-persona flow without that session', () => {
    const plan = planPersonas({ persona: 'staff' }, {}, { staff: 'staff sign-in failed: 401' });
    assert.ok('skip' in plan);
    assert.match(plan.skip, /staff sign-in failed/);
  });
});

describe('runSteps', () => {
  function fakeSession() {
    const calls: string[] = [];
    const locator = {
      filter: () => locator,
      first: () => locator,
      click: async () => {
        calls.push('click');
      },
      fill: async () => {
        calls.push('fill');
      },
      waitFor: async () => {
        calls.push('waitFor');
      },
    };
    const page = {
      setDefaultTimeout: () => undefined,
      goto: async (url: string) => {
        calls.push(`goto ${url}`);
      },
      getByRole: () => locator,
      getByText: () => locator,
      close: async () => undefined,
    };
    return { calls, session: { context: { newPage: async () => page } } };
  }

  const options = {
    target: resolveTarget('local', {}),
    flows: [],
    outDir: mkdtempSync(path.join(tmpdir(), 'qa-runner-test-')),
    timeout: 1_000,
  };

  function flow(steps: Flow['steps']): Flow {
    return {
      id: 'test.flow',
      area: 'Test',
      name: 'Test flow',
      app: 'staff',
      persona: 'staff',
      stage: 'n/a',
      route: '/',
      fixtures: [],
      steps,
      expected: '',
    } as Flow;
  }

  it('returns Skip for a write step without clicking or filling anything', async () => {
    const { calls, session } = fakeSession();
    const result = await runSteps(
      flow([{ goto: '/' }, { click: 'button', name: 'Send invitation', write: true }]),
      'staff',
      // biome-ignore lint/suspicious/noExplicitAny: fake Playwright session for the test
      session as any,
      options,
      {}
    );
    assert.equal(result.status, 'Skip');
    assert.match(result.note, /write steps not run/);
    assert.deepEqual(calls, ['goto http://localhost:4001/']);
  });

  it('runs read steps and passes', async () => {
    const { calls, session } = fakeSession();
    const result = await runSteps(
      flow([{ goto: '/' }, { seeRole: 'heading', name: 'Overview' }]),
      'staff',
      // biome-ignore lint/suspicious/noExplicitAny: fake Playwright session for the test
      session as any,
      options,
      {}
    );
    assert.equal(result.status, 'Pass');
    assert.deepEqual(calls, ['goto http://localhost:4001/', 'waitFor']);
  });
});
