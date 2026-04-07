// Human-readable labels for request form data fields

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  extenuating_circumstances: 'Extenuating Circumstances',
  summer_funding_request: 'Summer Funding Request',
  summer_funding_report: 'Summer Funding Report',
  requirement_submission: 'Requirement Submission',
};

interface FieldConfig {
  label: string;
  type: 'text' | 'enum' | 'boolean';
  enumLabels?: Record<string, string>;
}

const SUMMER_FUNDING_REQUEST_FIELDS: Record<string, FieldConfig> = {
  activityType: {
    label: 'Activity Type',
    type: 'enum',
    enumLabels: {
      internship_ssa: 'An 8-week+ internship in sub-Saharan Africa',
      research_placement: 'A university research placement',
      visiting_home_volunteering: 'Visiting home and volunteering',
    },
  },
  riskOfNotCarryingOut: {
    label: 'Is there any strong risk of not being able to carry out the activities?',
    type: 'enum',
    enumLabels: { yes: 'Yes', no: 'No' },
  },
  riskDetails: {
    label: 'Risk Details',
    type: 'text',
  },
  appliedForAlternativeFunding: {
    label: 'Have you applied for alternative funding?',
    type: 'enum',
    enumLabels: {
      yes_successful: 'Yes, and I was successful',
      yes_unsuccessful: 'Yes, but I was unsuccessful',
      no: 'No, I have not applied',
    },
  },
  receivingOtherFunding: {
    label: 'Are you receiving any other funding for this activity?',
    type: 'enum',
    enumLabels: { yes: 'Yes', no: 'No' },
  },
  otherFundingSource: {
    label: 'Funding Source',
    type: 'text',
  },
  otherFundingAmount: {
    label: 'Funding Amount',
    type: 'text',
  },
  additionalNotes: {
    label: 'Additional Notes',
    type: 'text',
  },
  travelInsuranceAcknowledged: {
    label: 'I acknowledge that I need to arrange my own travel insurance',
    type: 'boolean',
  },
  informationTruthful: {
    label: 'I confirm that all information provided is true and accurate',
    type: 'boolean',
  },
};

const SUMMER_FUNDING_REPORT_FIELDS: Record<string, FieldConfig> = {
  activitySummary: {
    label: 'Activity Summary',
    type: 'text',
  },
  learningOutcomes: {
    label: 'Learning Outcomes',
    type: 'text',
  },
  challengesFaced: {
    label: 'Challenges Faced',
    type: 'text',
  },
  additionalNotes: {
    label: 'Additional Notes',
    type: 'text',
  },
};

const EXTENUATING_CIRCUMSTANCES_FIELDS: Record<string, FieldConfig> = {
  reason: {
    label: 'Reason for Extenuating Circumstances',
    type: 'text',
  },
};

const REQUIREMENT_SUBMISSION_FIELDS: Record<string, FieldConfig> = {
  submissionType: {
    label: 'Submission Type',
    type: 'enum',
    enumLabels: {
      ashinaga_proposal: 'Ashinaga Proposal',
      transcript: 'Transcript',
      tenancy_agreement: 'Tenancy Agreement',
      other: 'Other',
    },
  },
  additionalNotes: {
    label: 'Additional Notes',
    type: 'text',
  },
};

const FORM_FIELD_CONFIG: Record<string, Record<string, FieldConfig>> = {
  summer_funding_request: SUMMER_FUNDING_REQUEST_FIELDS,
  summer_funding_report: SUMMER_FUNDING_REPORT_FIELDS,
  extenuating_circumstances: EXTENUATING_CIRCUMSTANCES_FIELDS,
  requirement_submission: REQUIREMENT_SUBMISSION_FIELDS,
};

export interface FormDataDisplayItem {
  label: string;
  value: string;
}

export function getFormDataDisplayItems(
  requestType: string,
  formData: Record<string, any> | null | undefined
): FormDataDisplayItem[] {
  if (!formData || Object.keys(formData).length === 0) {
    return [];
  }

  const fieldConfig = FORM_FIELD_CONFIG[requestType];
  const items: FormDataDisplayItem[] = [];

  // Process known fields in order
  if (fieldConfig) {
    for (const [key, config] of Object.entries(fieldConfig)) {
      const rawValue = formData[key];
      if (rawValue === undefined || rawValue === null || rawValue === '') continue;

      let displayValue: string;
      if (config.type === 'boolean') {
        displayValue = rawValue ? 'Yes' : 'No';
      } else if (config.type === 'enum' && config.enumLabels) {
        displayValue = config.enumLabels[rawValue] || String(rawValue);
      } else {
        displayValue = String(rawValue);
      }

      items.push({ label: config.label, value: displayValue });
    }
  }

  // Include any unknown fields as fallback
  for (const [key, rawValue] of Object.entries(formData)) {
    if (fieldConfig && key in fieldConfig) continue;
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();

    items.push({
      label,
      value: typeof rawValue === 'boolean' ? (rawValue ? 'Yes' : 'No') : String(rawValue),
    });
  }

  return items;
}
