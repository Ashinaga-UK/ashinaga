export const DEGREE_PATHWAY_OPTIONS = [
  'Foundation Year',
  'Direct Entry',
  'Top-up Degree',
  'Other',
] as const;

export type DegreePathway = (typeof DEGREE_PATHWAY_OPTIONS)[number];
