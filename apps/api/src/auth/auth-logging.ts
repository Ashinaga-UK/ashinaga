/**
 * Log an auth error without its message or payload. Drizzle errors embed query
 * params (emails, phones, dates of birth) in the message, so log name/code only.
 */
export function logAuthError(label: string, error: unknown): void {
  if (error && typeof error === 'object') {
    const err = error as { name?: string; code?: string; cause?: { code?: string } };
    console.error(label, { name: err.name ?? 'Error', code: err.code ?? err.cause?.code });
    return;
  }
  console.error(label, { name: typeof error });
}
