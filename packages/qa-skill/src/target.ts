export type TargetName = 'test' | 'local';

export type Target = {
  name: TargetName;
  apiUrl: string;
  staffUrl: string;
  scholarUrl: string;
};

export type Credentials = { email: string; password: string };

const DEFAULT_URLS: Record<TargetName, Omit<Target, 'name'>> = {
  test: {
    apiUrl: 'https://api-test.ashinaga-uk.org',
    staffUrl: 'https://staff-test.ashinaga-uk.org',
    scholarUrl: 'https://scholar-test.ashinaga-uk.org',
  },
  local: {
    apiUrl: 'http://localhost:4000',
    staffUrl: 'http://localhost:4001',
    scholarUrl: 'http://localhost:4002',
  },
};

// Accounts created by `seed-local` (the staff and scholar ones match the Playwright e2e setups).
export const LOCAL_ACCOUNTS = {
  staff: { email: 'e2e-staff@ashinaga.org', password: 'E2eStaffPassw0rd!' },
  prep: { email: 'qa-prep@example.com', password: 'QaPrepPassw0rd!' },
  scholar: { email: 'e2e-scholar@example.com', password: 'E2eScholarPassw0rd!' },
} as const;

const PROD_HOSTS = new Set([
  'api.ashinaga-uk.org',
  'staff.ashinaga-uk.org',
  'scholar.ashinaga-uk.org',
]);

export function resolveTarget(name: string, env: NodeJS.ProcessEnv = process.env): Target {
  if (name !== 'test' && name !== 'local') {
    throw new Error(`Unknown target "${name}". Use "test" or "local".`);
  }
  const defaults = DEFAULT_URLS[name];
  const target: Target = {
    name,
    apiUrl: stripSlash(env.API_URL || defaults.apiUrl),
    staffUrl: stripSlash(env.STAFF_APP_URL || defaults.staffUrl),
    scholarUrl: stripSlash(env.SCHOLAR_APP_URL || defaults.scholarUrl),
  };
  for (const url of [target.apiUrl, target.staffUrl, target.scholarUrl]) {
    if (PROD_HOSTS.has(new URL(url).hostname)) {
      throw new Error(
        `Refusing to run against production (${url}). QA runs on test or local only.`
      );
    }
  }
  return target;
}

export function personaCredentials(
  target: Target,
  env: NodeJS.ProcessEnv = process.env
): Record<'staff' | 'prep' | 'scholar', Credentials | undefined> {
  const pick = (prefix: string, fallback?: Credentials): Credentials | undefined => {
    const email = env[`QA_${prefix}_EMAIL`];
    const password = env[`QA_${prefix}_PASSWORD`];
    if (email && password) return { email, password };
    return target.name === 'local' ? fallback : undefined;
  };
  return {
    staff: pick('STAFF', LOCAL_ACCOUNTS.staff),
    prep: pick('PREP', LOCAL_ACCOUNTS.prep),
    scholar: pick('SCHOLAR', LOCAL_ACCOUNTS.scholar),
  };
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
