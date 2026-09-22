export const REQUEST_TYPES = [
  'extenuating_circumstances',
  'summer_funding_request',
  'summer_funding_report',
  'requirement_submission',
  'others',
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export const SCHOLAR_CREATABLE_REQUEST_TYPES: readonly RequestType[] = [
  'extenuating_circumstances',
  'summer_funding_request',
];

export const SCHOLAR_VISIBLE_REQUEST_TYPES = SCHOLAR_CREATABLE_REQUEST_TYPES;
