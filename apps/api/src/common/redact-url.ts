// Paths whose next segment is a secret token. Invitation links carry the signup
// token, and Better Auth can format reset links as /reset-password/<token>.
const TOKEN_PATH_PREFIXES = ['/api/invitations/validate/', '/api/auth/reset-password/'];

/**
 * A request URL that is safe to log: the query string (OAuth code/state,
 * verify-email and reset tokens) is dropped, and token path segments are
 * replaced with [redacted].
 */
export function redactUrlForLog(url: string | undefined | null): string {
  if (!url) return '';
  const pathname = url.split(/[?#]/, 1)[0] ?? '';

  for (const prefix of TOKEN_PATH_PREFIXES) {
    if (pathname.toLowerCase().startsWith(prefix) && pathname.length > prefix.length) {
      const rest = pathname.slice(prefix.length);
      const slash = rest.indexOf('/');
      return `${pathname.slice(0, prefix.length)}[redacted]${slash === -1 ? '' : rest.slice(slash)}`;
    }
  }

  return pathname;
}
