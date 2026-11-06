export type OriginPolicyEnv = {
  nodeEnv?: string;
  corsOrigins?: string;
  vercelPreviewOriginPattern?: string;
};

type ParsedOrigin = {
  origin: string;
  protocol: string;
  hostname: string;
};

export function readOriginPolicyEnv(env: NodeJS.ProcessEnv = process.env): OriginPolicyEnv {
  return {
    nodeEnv: env.NODE_ENV,
    corsOrigins: env.CORS_ORIGINS,
    vercelPreviewOriginPattern: env.VERCEL_PREVIEW_ORIGIN_PATTERN,
  };
}

/** Origins from CORS_ORIGINS. Localhost entries are dropped in production. */
export function configuredOrigins(env: OriginPolicyEnv): string[] {
  const seen = new Set<string>();
  const origins: string[] = [];
  for (const entry of (env.corsOrigins ?? '').split(',')) {
    const parsed = parseHttpOrigin(entry.trim());
    if (!parsed) continue;
    if (env.nodeEnv === 'production' && parsed.hostname === 'localhost') continue;
    if (seen.has(parsed.origin)) continue;
    seen.add(parsed.origin);
    origins.push(parsed.origin);
  }
  return origins;
}

/**
 * Browser Origin check shared by CORS and Better Auth.
 * Missing Origin is not handled here — CORS allows it for non-browser clients.
 */
export function isBrowserOriginAllowed(origin: string, env: OriginPolicyEnv): boolean {
  const parsed = parseHttpOrigin(origin);
  if (!parsed) return false;
  if (configuredOrigins(env).includes(parsed.origin)) return true;
  if (env.nodeEnv !== 'production' && isHttpLocalhost(parsed)) return true;
  if (env.nodeEnv === 'test' && matchesVercelPreview(parsed, env.vercelPreviewOriginPattern)) {
    return true;
  }
  return false;
}

/** CORS: no Origin header is allowed. The literal "null" origin is not. */
export function isCorsOriginAllowed(
  origin: string | undefined | null,
  env: OriginPolicyEnv
): boolean {
  if (!origin) return true;
  return isBrowserOriginAllowed(origin, env);
}

/**
 * List Better Auth uses for this request's Origin and for callbackURL / redirectTo.
 * An untrusted request origin is not echoed back, so it cannot authorize itself.
 */
export function trustedOriginsForRequest(
  origin: string | null | undefined,
  env: OriginPolicyEnv
): string[] {
  const allowed = configuredOrigins(env);
  if (origin && isBrowserOriginAllowed(origin, env)) {
    const parsed = parseHttpOrigin(origin);
    if (parsed && !allowed.includes(parsed.origin)) {
      allowed.push(parsed.origin);
    }
  }
  return allowed;
}

function parseHttpOrigin(value: string): ParsedOrigin | null {
  if (!value || value === 'null') return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (!url.hostname) return null;
  return { origin: url.origin, protocol: url.protocol, hostname: url.hostname };
}

function isHttpLocalhost(parsed: ParsedOrigin): boolean {
  return parsed.protocol === 'http:' && parsed.hostname === 'localhost';
}

function matchesVercelPreview(parsed: ParsedOrigin, patternSource: string | undefined): boolean {
  if (parsed.protocol !== 'https:') return false;
  if (!isVercelAppHostname(parsed.hostname)) return false;
  const pattern = patternSource?.trim();
  if (!pattern) return false;
  // A pattern that never names vercel.app (for example ".*") stays closed.
  if (!pattern.includes('vercel.app') && !pattern.includes('vercel\\.app')) return false;

  let expression: RegExp;
  try {
    expression = new RegExp(pattern);
  } catch {
    return false;
  }
  const match = expression.exec(parsed.origin);
  expression.lastIndex = 0;
  return match?.[0] === parsed.origin;
}

function isVercelAppHostname(hostname: string): boolean {
  if (!hostname.endsWith('.vercel.app')) return false;
  const labels = hostname.split('.');
  if (labels.length < 3) return false;
  return labels.every((label) => /^[a-z0-9-]+$/.test(label));
}
