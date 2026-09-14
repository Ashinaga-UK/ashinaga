/**
 * Returns an absolute http(s) URL safe for use as an href, or null if the
 * value is missing / not an http(s) URL (e.g. javascript:, data:, relative).
 */
export function toSafeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}
