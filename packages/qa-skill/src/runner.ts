import { mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  chromium,
  type Page,
  request,
} from '@playwright/test';
import { describeStep, type Flow, type Step, stepAction } from './catalogue';
import { type Credentials, personaCredentials, type Target } from './target';

export type Status = 'Pass' | 'Fail' | 'Skip';

export type FlowResult = {
  id: string;
  area: string;
  name: string;
  status: Status;
  personas: string[];
  notes: string;
};

type Session = { context: BrowserContext; api?: APIRequestContext };
type SessionMap = Partial<Record<'anonymous' | 'staff' | 'prep' | 'scholar', Session>>;

export type RunOptions = {
  target: Target;
  flows: Flow[];
  outDir: string;
  headed?: boolean;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

const STUDENT_PERSONAS = ['prep', 'scholar'] as const;

export async function runFlows(options: RunOptions): Promise<FlowResult[]> {
  const env = options.env ?? process.env;
  const timeout = options.timeoutMs ?? 15_000;
  mkdirSync(path.join(options.outDir, 'screenshots'), { recursive: true });

  const browser = await chromium.launch({ headless: !options.headed });
  const sessions: SessionMap = {};
  const sessionErrors: Record<string, string> = {};

  try {
    sessions.anonymous = { context: await newContext(browser) };
    const credentials = personaCredentials(options.target, env);
    for (const persona of ['staff', 'prep', 'scholar'] as const) {
      const creds = credentials[persona];
      if (!creds) {
        sessionErrors[persona] =
          `no ${persona} credentials (set QA_${persona.toUpperCase()}_EMAIL/PASSWORD)`;
        continue;
      }
      try {
        sessions[persona] = await signIn(browser, options.target, creds);
      } catch (error) {
        sessionErrors[persona] = `${persona} sign-in failed: ${(error as Error).message}`;
      }
    }

    const fixtures = await resolveFixtures(options.target, sessions, env);
    const results: FlowResult[] = [];
    for (const flow of options.flows) {
      results.push(await runFlow(flow, { ...options, timeout }, sessions, sessionErrors, fixtures));
    }
    return results;
  } finally {
    await browser.close();
  }
}

async function newContext(
  browser: Browser,
  storageState?: Awaited<ReturnType<APIRequestContext['storageState']>>
): Promise<BrowserContext> {
  return browser.newContext({
    storageState,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
}

/** Same login pattern as apps/{staff,scholar}/test/e2e/auth.setup.ts: Better Auth email sign-in. */
async function signIn(browser: Browser, target: Target, creds: Credentials): Promise<Session> {
  const api = await request.newContext({ baseURL: target.apiUrl });
  const res = await api.post('/api/auth/sign-in/email', {
    data: { email: creds.email, password: creds.password },
  });
  if (!res.ok()) {
    throw new Error(`${res.status()} ${(await res.text()).slice(0, 200)}`);
  }
  const context = await newContext(browser, await api.storageState());
  return { context, api };
}

async function resolveFixtures(
  target: Target,
  sessions: SessionMap,
  env: NodeJS.ProcessEnv
): Promise<Record<string, string | undefined>> {
  let scholarId = env.QA_SCHOLAR_ID;
  const staffApi = sessions.staff?.api;
  if (!scholarId && staffApi) {
    const res = await staffApi.get(`${target.apiUrl}/api/scholars?limit=1&programStage=scholar`);
    if (res.ok()) {
      const body = (await res.json()) as { data?: { id: string }[] };
      scholarId = body.data?.[0]?.id;
    }
  }
  return { scholarId, inviteToken: env.QA_INVITE_TOKEN };
}

type FlowRunContext = RunOptions & { timeout: number };

async function runFlow(
  flow: Flow,
  options: FlowRunContext,
  sessions: SessionMap,
  sessionErrors: Record<string, string>,
  fixtures: Record<string, string | undefined>
): Promise<FlowResult> {
  const base = { id: flow.id, area: flow.area, name: flow.name };
  if (flow.skip) {
    return { ...base, status: 'Skip', personas: [], notes: flow.skip };
  }

  const personas =
    flow.persona === 'either' ? STUDENT_PERSONAS.filter((p) => sessions[p]) : [flow.persona];
  if (personas.length === 0) {
    return {
      ...base,
      status: 'Skip',
      personas: [],
      notes: `Missing fixture: ${STUDENT_PERSONAS.map((p) => sessionErrors[p]).join('; ')}`,
    };
  }

  const outcomes: { persona: string; status: Status; note: string }[] = [];
  for (const persona of personas) {
    const session = sessions[persona as keyof SessionMap];
    if (!session) {
      outcomes.push({
        persona,
        status: 'Skip',
        note: `Missing fixture: ${sessionErrors[persona]}`,
      });
      continue;
    }
    outcomes.push({ persona, ...(await runSteps(flow, persona, session, options, fixtures)) });
  }

  const status: Status = outcomes.some((o) => o.status === 'Fail')
    ? 'Fail'
    : outcomes.every((o) => o.status === 'Pass')
      ? 'Pass'
      : 'Skip';
  const notes = outcomes
    .filter((o) => o.note)
    .map((o) => (personas.length > 1 ? `[${o.persona}] ${o.note}` : o.note))
    .join(' ');
  return { ...base, status, personas: personas.map(String), notes };
}

async function runSteps(
  flow: Flow,
  persona: string,
  session: Session,
  options: FlowRunContext,
  fixtures: Record<string, string | undefined>
): Promise<{ status: Status; note: string }> {
  const appUrl = flow.app === 'staff' ? options.target.staffUrl : options.target.scholarUrl;
  const page = await session.context.newPage();
  page.setDefaultTimeout(options.timeout);

  try {
    for (const [index, step] of flow.steps.entries()) {
      if (step.write) {
        const pending = flow.steps.slice(index).filter((s) => s.write);
        return {
          status: 'Skip',
          note: `Read steps passed; write steps not run (${pending.map(describeStep).join('; ')}).`,
        };
      }
      const missing = missingPlaceholder(step, fixtures);
      if (missing) {
        return { status: 'Skip', note: `Missing fixture: {${missing}}.` };
      }
      try {
        await runStep(page, appUrl, step, fixtures, options.timeout);
      } catch (error) {
        const shot = path.join(options.outDir, 'screenshots', `${flow.id}-${persona}.png`);
        await page.screenshot({ path: shot, fullPage: false }).catch(() => undefined);
        const onScreen = await visibleText(page);
        return {
          status: 'Fail',
          note:
            `Step ${index + 1} (${describeStep(step)}) failed at ${page.url()}: ` +
            `${firstLine((error as Error).message)} On screen: "${onScreen}". Screenshot: ${shot}`,
        };
      }
    }
    return { status: 'Pass', note: '' };
  } finally {
    await page.close();
  }
}

function missingPlaceholder(step: Step, fixtures: Record<string, string | undefined>) {
  const match = step.goto?.match(/\{(\w+)\}/g) ?? [];
  for (const token of match) {
    const key = token.slice(1, -1);
    if (!fixtures[key]) return key;
  }
  return undefined;
}

async function runStep(
  page: Page,
  appUrl: string,
  step: Step,
  fixtures: Record<string, string | undefined>,
  timeout: number
): Promise<void> {
  const action = stepAction(step);
  const role = (value: string | undefined) =>
    page
      .getByRole(value as Parameters<Page['getByRole']>[0], { name: step.name })
      .filter({ visible: true })
      .first();

  switch (action) {
    case 'goto': {
      const target = (step.goto ?? '').replace(/\{(\w+)\}/g, (_, key) => fixtures[key] ?? '');
      await page.goto(`${appUrl}${target}`, { waitUntil: 'domcontentloaded' });
      return;
    }
    case 'see':
      await page
        .getByText(step.see ?? '')
        .filter({ visible: true })
        .first()
        .waitFor({ state: 'visible' });
      return;
    case 'seeRole':
      await role(step.seeRole).waitFor({ state: 'visible' });
      return;
    case 'notSeeLink': {
      const count = await page.getByRole('link', { name: step.notSeeLink, exact: true }).count();
      if (count > 0) throw new Error(`Link "${step.notSeeLink}" should not be shown.`);
      return;
    }
    case 'click':
      await role(step.click).click();
      return;
    case 'clickText':
      await page
        .getByText(step.clickText ?? '')
        .filter({ visible: true })
        .first()
        .click();
      return;
    case 'press':
      await page.keyboard.press(step.press ?? '');
      return;
    case 'urlIncludes':
      await page.waitForURL((url) => url.href.includes(step.urlIncludes ?? ''), { timeout });
      return;
    case 'tabSelected':
      await page
        .getByRole('tab', { name: step.tabSelected, selected: true })
        .first()
        .waitFor({ state: 'visible' });
      return;
    case 'download': {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout }),
        role(step.download).click(),
      ]);
      if (!download.suggestedFilename()) throw new Error('Download had no filename.');
      return;
    }
    case 'print': {
      await page.evaluate(() => {
        const w = window as unknown as { __qaPrinted?: boolean; print: () => void };
        w.__qaPrinted = false;
        w.print = () => {
          w.__qaPrinted = true;
        };
      });
      await role(step.print).click();
      await page.waitForFunction(() => (window as { __qaPrinted?: boolean }).__qaPrinted === true);
      return;
    }
    default:
      throw new Error(`Unknown step ${JSON.stringify(step)}`);
  }
}

async function visibleText(page: Page): Promise<string> {
  const text = await page
    .locator('body')
    .innerText({ timeout: 2_000 })
    .catch(() => '');
  return text.replace(/\s+/g, ' ').trim().slice(0, 240);
}

function firstLine(message: string): string {
  return message.split('\n')[0] ?? message;
}
