/**
 * Options for profile dropdowns (nationality, country of study, academic year).
 * Kept in sync with scholar app where applicable.
 */

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export const ACADEMIC_YEAR_OPTIONS = [
  'Pre-University',
  'Foundation',
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Postgraduate',
] as const;

/** Common countries for nationality and country of study dropdowns. */
export const COUNTRY_OPTIONS = [
  'United Kingdom',
  'United States',
  'Japan',
  'Kenya',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'South Africa',
  'Nigeria',
  'Ghana',
  'Ethiopia',
  'Zambia',
  'Zimbabwe',
  'Malawi',
  'Botswana',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Ireland',
  'India',
  'China',
  'South Korea',
  'Brazil',
  'Mexico',
  'Other',
] as const;

/** University options used when API filter options are empty (e.g. scholar app list). */
export const DEFAULT_UNIVERSITY_OPTIONS = [
  'Imperial College London',
  'University of Edinburgh',
  'LSE',
  'Cambridge University',
  'Oxford University',
  'UCL',
  'University of York',
  'University of Warwick',
  'University of Central Lancashire',
  'University of East Anglia',
  'University of Manchester',
  'University of Leeds',
] as const;
