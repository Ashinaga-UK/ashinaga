const STAGE_LABEL_PATTERN = /^(\d{1,2})([a-z])?$/i;

export function normalizeStageLabel(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(STAGE_LABEL_PATTERN);
  if (!match) {
    throw new Error('Use a step like 1, 1a, or 1b');
  }
  return `${match[1]}${match[2] ? match[2].toLowerCase() : ''}`;
}
