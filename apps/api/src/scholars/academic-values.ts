export const PLACEHOLDER_ACADEMIC_VALUES = ['TBD', 'Pre-University'] as const;

export function isPlaceholderAcademicValue(value?: string | null): boolean {
  const trimmed = value?.trim() ?? '';
  return (
    trimmed === '' ||
    PLACEHOLDER_ACADEMIC_VALUES.includes(trimmed as (typeof PLACEHOLDER_ACADEMIC_VALUES)[number])
  );
}
