import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type App = 'staff' | 'scholar';
export type Persona = 'anonymous' | 'staff' | 'prep' | 'scholar' | 'either';
export type Stage = 'all' | 'prep_year' | 'scholar';

export type Step = {
  goto?: string;
  see?: string;
  seeRole?: string;
  notSeeLink?: string;
  click?: string;
  clickText?: string;
  press?: string;
  urlIncludes?: string;
  tabSelected?: string;
  download?: string;
  print?: string;
  name?: string;
  write?: boolean;
  note?: string;
};

export type Flow = {
  id: string;
  area: string;
  name: string;
  app: App;
  persona: Persona;
  stage: Stage;
  route: string;
  fixtures: string[];
  steps: Step[];
  expected: string;
  skip?: string;
  notes?: string;
  /** Specs that cover this flow (ASH-123 coverage map). Empty means none. */
  specs: string[];
  /** Why a flow with no specs is acceptable. */
  specSkip?: string;
};

export type Catalogue = {
  version: number;
  flows: Flow[];
};

const ACTION_KEYS = [
  'goto',
  'see',
  'seeRole',
  'notSeeLink',
  'click',
  'clickText',
  'press',
  'urlIncludes',
  'tabSelected',
  'download',
  'print',
] as const;
const ROLE_ACTIONS = new Set(['seeRole', 'click', 'download', 'print']);
const APPS = new Set<App>(['staff', 'scholar']);
const PERSONAS = new Set<Persona>(['anonymous', 'staff', 'prep', 'scholar', 'either']);
const STAGES = new Set<Stage>(['all', 'prep_year', 'scholar']);

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CATALOGUE_PATH = path.join(packageDir, 'catalogue', 'flows.json');

export function loadCatalogue(filePath = CATALOGUE_PATH): Catalogue {
  return JSON.parse(readFileSync(filePath, 'utf8')) as Catalogue;
}

export function stepAction(step: Step): (typeof ACTION_KEYS)[number] | undefined {
  return ACTION_KEYS.find((key) => step[key] !== undefined);
}

export function describeStep(step: Step): string {
  const action = stepAction(step);
  if (!action) return JSON.stringify(step);
  const value = step[action];
  return step.name ? `${action} ${value} "${step.name}"` : `${action} "${value}"`;
}

/** Structural checks; returns human-readable problems (empty when valid). */
export function validateCatalogue(catalogue: Catalogue): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const flow of catalogue.flows) {
    const where = flow.id || '(missing id)';
    if (!/^[a-z-]+(\.[a-z0-9-]+)+$/.test(flow.id ?? '')) {
      problems.push(`${where}: id must look like "area.flow-name"`);
    }
    if (seen.has(flow.id)) problems.push(`${where}: duplicate id`);
    seen.add(flow.id);
    if (!APPS.has(flow.app)) problems.push(`${where}: unknown app "${flow.app}"`);
    if (!PERSONAS.has(flow.persona)) problems.push(`${where}: unknown persona "${flow.persona}"`);
    if (!STAGES.has(flow.stage)) problems.push(`${where}: unknown stage "${flow.stage}"`);
    if (!flow.name || !flow.expected || !flow.route) {
      problems.push(`${where}: name, route and expected are required`);
    }
    if (!flow.skip && flow.steps.length === 0) {
      problems.push(`${where}: needs steps or an explicit skip reason`);
    }
    if (!Array.isArray(flow.specs)) {
      problems.push(`${where}: specs must be a list (empty when no spec covers it)`);
    } else if (flow.specs.length === 0 && !flow.specSkip) {
      problems.push(`${where}: no specs, so it needs a specSkip reason`);
    }
    if (flow.steps.length > 0 && stepAction(flow.steps[0]) !== 'goto') {
      problems.push(`${where}: first step must be goto`);
    }
    for (const [index, step] of flow.steps.entries()) {
      const actions = ACTION_KEYS.filter((key) => step[key] !== undefined);
      if (actions.length !== 1) {
        problems.push(`${where} step ${index + 1}: exactly one action expected`);
        continue;
      }
      if (ROLE_ACTIONS.has(actions[0]) && !step.name) {
        problems.push(`${where} step ${index + 1}: ${actions[0]} needs a name`);
      }
    }
  }
  return problems;
}
