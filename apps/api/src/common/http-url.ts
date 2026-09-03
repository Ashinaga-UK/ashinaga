import { BadRequestException } from '@nestjs/common';

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

export function assertHttpUrl(value: string): string {
  const safe = toSafeHttpUrl(value);
  if (!safe) {
    throw new BadRequestException('Link must be an http or https URL');
  }
  return safe;
}
