import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export type RequestType =
  | 'extenuating_circumstances'
  | 'summer_funding_request'
  | 'summer_funding_report'
  | 'requirement_submission';

// Type-specific form data interfaces
export interface ExtenuatingCircumstancesFormData {
  reason: string;
}

export interface SummerFundingRequestFormData {
  activityType: 'internship_ssa' | 'research_placement' | 'visiting_home_volunteering';
  appliedForAlternativeFunding: 'yes_successful' | 'yes_unsuccessful' | 'no';
  receivingOtherFunding: 'yes' | 'no';
  otherFundingSource?: string;
  otherFundingAmount?: string;
  riskOfNotCarryingOut: 'yes' | 'no';
  riskDetails?: string;
  additionalNotes?: string;
  travelInsuranceAcknowledged: boolean;
  informationTruthful: boolean;
}

export interface SummerFundingReportFormData {
  activitySummary: string;
  learningOutcomes: string;
  challengesFaced?: string;
  additionalNotes?: string;
}

export interface RequirementSubmissionFormData {
  submissionType: 'ashinaga_proposal' | 'transcript' | 'tenancy_agreement' | 'other';
  additionalNotes?: string;
}

export type FormData =
  | ExtenuatingCircumstancesFormData
  | SummerFundingRequestFormData
  | SummerFundingReportFormData
  | RequirementSubmissionFormData;

export class CreateRequestDto {
  @IsEnum([
    'extenuating_circumstances',
    'summer_funding_request',
    'summer_funding_report',
    'requirement_submission',
  ])
  @IsNotEmpty()
  type: RequestType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  formData?: FormData;

  @IsEnum(['high', 'medium', 'low'])
  @IsOptional()
  priority?: 'high' | 'medium' | 'low';

  @IsString()
  @IsNotEmpty({ message: 'Staff member assignment is required' })
  assignedTo: string; // Staff member ID to handle the request

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  attachmentIds?: string[];
}

export class CreateRequestResponseDto {
  id: string;
  scholarId: string;
  type: string;
  description: string;
  priority: string;
  status: string;
  submittedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
