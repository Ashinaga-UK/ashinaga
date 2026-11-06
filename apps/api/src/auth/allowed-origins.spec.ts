import {
  configuredOrigins,
  isCorsOriginAllowed,
  type OriginPolicyEnv,
  trustedOriginsForRequest,
} from './allowed-origins';

const STAFF_PROD = 'https://staff.ashinaga-uk.org';
const SCHOLAR_PROD = 'https://scholar.ashinaga-uk.org';
const STAFF_TEST = 'https://staff-test.ashinaga-uk.org';
const SCHOLAR_TEST = 'https://scholar-test.ashinaga-uk.org';
const PREVIEW = 'https://ashinaga-staff-git-feature-team.vercel.app';
const PREVIEW_PATTERN = '^https://ashinaga-(staff|scholar)-[a-z0-9-]+-team\\.vercel\\.app$';

const prodEnv: OriginPolicyEnv = {
  nodeEnv: 'production',
  corsOrigins: `${STAFF_PROD},${SCHOLAR_PROD},http://localhost:4001,http://localhost:4002`,
  vercelPreviewOriginPattern: PREVIEW_PATTERN,
};

const testEnv: OriginPolicyEnv = {
  nodeEnv: 'test',
  corsOrigins: `${STAFF_TEST},${SCHOLAR_TEST},http://localhost:4001,http://localhost:4002`,
  vercelPreviewOriginPattern: PREVIEW_PATTERN,
};

describe('configuredOrigins', () => {
  it('drops localhost entries in production and keeps the portal origins', () => {
    expect(configuredOrigins(prodEnv)).toEqual([STAFF_PROD, SCHOLAR_PROD]);
  });

  it('keeps localhost entries outside production', () => {
    expect(configuredOrigins(testEnv)).toEqual([
      STAFF_TEST,
      SCHOLAR_TEST,
      'http://localhost:4001',
      'http://localhost:4002',
    ]);
  });

  it('trims whitespace and skips empty or non-http entries', () => {
    expect(
      configuredOrigins({
        nodeEnv: 'production',
        corsOrigins: ` ${STAFF_PROD} , , javascript:alert(1), ${SCHOLAR_PROD} `,
      })
    ).toEqual([STAFF_PROD, SCHOLAR_PROD]);
  });
});

describe('isCorsOriginAllowed', () => {
  it('allows a missing Origin and rejects the literal null origin', () => {
    expect(isCorsOriginAllowed(undefined, prodEnv)).toBe(true);
    expect(isCorsOriginAllowed('', prodEnv)).toBe(true);
    expect(isCorsOriginAllowed('null', prodEnv)).toBe(false);
  });

  it('allows the configured staff and scholar origins in prod and test', () => {
    expect(isCorsOriginAllowed(STAFF_PROD, prodEnv)).toBe(true);
    expect(isCorsOriginAllowed(SCHOLAR_PROD, prodEnv)).toBe(true);
    expect(isCorsOriginAllowed(STAFF_TEST, testEnv)).toBe(true);
    expect(isCorsOriginAllowed(SCHOLAR_TEST, testEnv)).toBe(true);
  });

  it('rejects an arbitrary vercel.app origin in prod and test', () => {
    expect(isCorsOriginAllowed('https://anything.vercel.app', prodEnv)).toBe(false);
    expect(isCorsOriginAllowed('https://evil-attacker.vercel.app', prodEnv)).toBe(false);
    expect(isCorsOriginAllowed('https://anything.vercel.app', testEnv)).toBe(false);
    expect(isCorsOriginAllowed('https://evil-attacker.vercel.app', testEnv)).toBe(false);
  });

  it('rejects localhost in production, including ports listed in CORS_ORIGINS', () => {
    expect(isCorsOriginAllowed('http://localhost:1234', prodEnv)).toBe(false);
    expect(isCorsOriginAllowed('http://localhost:4001', prodEnv)).toBe(false);
    expect(isCorsOriginAllowed('http://localhost:4002', prodEnv)).toBe(false);
  });

  it('allows any http localhost port outside production', () => {
    expect(isCorsOriginAllowed('http://localhost:1234', testEnv)).toBe(true);
    expect(isCorsOriginAllowed('http://localhost:4001', { nodeEnv: 'development' })).toBe(true);
    expect(isCorsOriginAllowed('http://localhost:4002', { nodeEnv: undefined })).toBe(true);
  });

  it('rejects lookalike hosts, credentials, and https localhost', () => {
    expect(isCorsOriginAllowed('https://staff.ashinaga-uk.org.evil.com', prodEnv)).toBe(false);
    expect(isCorsOriginAllowed('http://localhost.evil.com:4001', testEnv)).toBe(false);
    expect(isCorsOriginAllowed('http://user:pass@localhost:4001', testEnv)).toBe(false);
    expect(isCorsOriginAllowed('https://localhost:4001', testEnv)).toBe(false);
    expect(isCorsOriginAllowed('http://127.0.0.1:4001', testEnv)).toBe(false);
  });

  it('allows a team preview origin only when NODE_ENV is test and the pattern matches', () => {
    expect(isCorsOriginAllowed(PREVIEW, testEnv)).toBe(true);
    expect(isCorsOriginAllowed(PREVIEW, prodEnv)).toBe(false);
    expect(isCorsOriginAllowed(PREVIEW, { ...testEnv, nodeEnv: 'development' })).toBe(false);
    expect(
      isCorsOriginAllowed(PREVIEW, { ...testEnv, vercelPreviewOriginPattern: undefined })
    ).toBe(false);
  });

  it('rejects a preview pattern that is invalid, unanchored, or not limited to vercel.app', () => {
    expect(isCorsOriginAllowed(PREVIEW, { ...testEnv, vercelPreviewOriginPattern: '(' })).toBe(
      false
    );
    expect(
      isCorsOriginAllowed(PREVIEW, { ...testEnv, vercelPreviewOriginPattern: 'vercel\\.app' })
    ).toBe(false);
    expect(
      isCorsOriginAllowed('https://evil.example', { ...testEnv, vercelPreviewOriginPattern: '.*' })
    ).toBe(false);
    expect(
      isCorsOriginAllowed('https://evil.example', {
        ...testEnv,
        vercelPreviewOriginPattern: '^https://evil\\.example$',
      })
    ).toBe(false);
  });

  it('still allows a vercel.app origin that was explicitly listed', () => {
    const listed = 'https://staff-git-main-team.vercel.app';
    expect(
      isCorsOriginAllowed(listed, {
        nodeEnv: 'test',
        corsOrigins: listed,
      })
    ).toBe(true);
  });
});

describe('trustedOriginsForRequest', () => {
  it('does not echo an untrusted origin, so callbackURL and redirectTo cannot use it', () => {
    expect(trustedOriginsForRequest('https://evil.vercel.app', prodEnv)).toEqual([
      STAFF_PROD,
      SCHOLAR_PROD,
    ]);
    expect(trustedOriginsForRequest('http://localhost:1234', prodEnv)).toEqual([
      STAFF_PROD,
      SCHOLAR_PROD,
    ]);
    expect(trustedOriginsForRequest('https://anything.vercel.app', testEnv)).not.toContain(
      'https://anything.vercel.app'
    );
  });

  it('includes a trusted request origin that is not already in CORS_ORIGINS', () => {
    expect(trustedOriginsForRequest('http://localhost:1234', testEnv)).toContain(
      'http://localhost:1234'
    );
    expect(trustedOriginsForRequest(PREVIEW, testEnv)).toContain(PREVIEW);
  });

  it('does not add a preview origin outside test', () => {
    expect(trustedOriginsForRequest(PREVIEW, prodEnv)).not.toContain(PREVIEW);
  });
});
