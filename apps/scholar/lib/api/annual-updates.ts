import { fetchAPI } from '../api-client';

export type AnnualUpdateStatus = 'draft' | 'submitted';

export interface AnnualUpdate {
  id: string;
  scholarId: string;
  academicYear: string;
  status: AnnualUpdateStatus;
  highlights: string | null;
  partTimeJobs: string | null;
  extracurriculars: string | null;
  leadershipRolesDescription: string | null;
  leadershipRolesCount: number | null;
  payItForwardDescription: string | null;
  payItForwardCount: number | null;
  subSaharanAfricaActivitiesDescription: string | null;
  subSaharanAfricaActivitiesCount: number | null;
  independentInternshipsCount: number | null;
  internshipsInAfricaSummary: string | null;
  internshipsElsewhereSummary: string | null;
  completedAshinagaAfricaInternship: boolean | null;
  academicYearAverageClassification: string | null;
  academicYearWeightedGrade: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnualUpdatePayload {
  academicYear: string;
  highlights?: string;
  partTimeJobs?: string;
  extracurriculars?: string;
  leadershipRolesDescription?: string;
  leadershipRolesCount?: number;
  payItForwardDescription?: string;
  payItForwardCount?: number;
  subSaharanAfricaActivitiesDescription?: string;
  subSaharanAfricaActivitiesCount?: number;
  independentInternshipsCount?: number;
  internshipsInAfricaSummary?: string;
  internshipsElsewhereSummary?: string;
  completedAshinagaAfricaInternship?: boolean;
  academicYearAverageClassification?: string;
  academicYearWeightedGrade?: string;
}

export async function getMyAnnualUpdate(academicYear: string): Promise<AnnualUpdate | null> {
  const params = new URLSearchParams({ academicYear });
  return fetchAPI<AnnualUpdate | null>(`/api/annual-updates/my?${params.toString()}`);
}

export async function saveAnnualUpdateDraft(data: AnnualUpdatePayload): Promise<AnnualUpdate> {
  return fetchAPI<AnnualUpdate>('/api/annual-updates/my', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function submitAnnualUpdate(data: AnnualUpdatePayload): Promise<AnnualUpdate> {
  return fetchAPI<AnnualUpdate>('/api/annual-updates/my/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
