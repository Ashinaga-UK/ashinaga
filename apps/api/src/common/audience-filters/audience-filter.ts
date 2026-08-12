export const audienceFilterTypes = ['program', 'year', 'university', 'location', 'status'] as const;

export type AudienceFilterType = (typeof audienceFilterTypes)[number];

export type AudienceFilter = {
  type: string;
  value: string;
};

export type AudienceFilterInput = {
  filterType: string;
  filterValue: string;
};

export type ScholarAudience = Record<AudienceFilterType, string | null | undefined>;

export function normalizeAudienceValue(value: string) {
  return value.trim();
}

export function audienceValuesEqual(
  left: string | null | undefined,
  right: string | null | undefined
) {
  if (left == null || right == null) return false;
  return normalizeAudienceValue(left).toLowerCase() === normalizeAudienceValue(right).toLowerCase();
}

export function matchesAudienceFilters(filters: AudienceFilter[], scholar: ScholarAudience) {
  if (filters.length === 0) return true;

  const filtersByType = new Map<string, string[]>();
  for (const filter of filters) {
    const values = filtersByType.get(filter.type) ?? [];
    values.push(filter.value);
    filtersByType.set(filter.type, values);
  }

  return Array.from(filtersByType.entries()).every(([type, values]) => {
    if (!audienceFilterTypes.includes(type as AudienceFilterType)) return false;
    return values.some((value) => audienceValuesEqual(scholar[type as AudienceFilterType], value));
  });
}

export function normalizeAudienceFilters<T extends AudienceFilterInput>(filters: T[]): T[] {
  return filters.map((filter) => ({
    ...filter,
    filterValue: normalizeAudienceValue(filter.filterValue),
  }));
}
