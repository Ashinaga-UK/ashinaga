// API client for making authenticated requests to the backend
// Works alongside better-auth for non-auth endpoints

import type { Gender } from './constants';

export interface ScholarGoalsStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

export interface ScholarTasksStats {
  total: number;
  completed: number;
  overdue: number;
}

export interface Scholar {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  phone?: string | null;
  program: string;
  year: string;
  university: string;
  location?: string | null;
  bio?: string | null;
  status: 'active' | 'inactive' | 'on_hold' | 'archived';
  programStage: 'prep_year' | 'scholar';
  intendedUniversity?: string | null;
  intendedCourse?: string | null;
  degreePathway?: string | null;
  startDate: string;
  lastActivity?: string | null;
  goals: ScholarGoalsStats;
  tasks: ScholarTasksStats;
  platformSetupIncomplete?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

// New interfaces for detailed scholar profile
export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  category: 'academic_development' | 'personal_development' | 'professional_development';
  targetDate: string;
  relatedSkills?: string | null;
  actionPlan?: string | null;
  reviewNotes?: string | null;
  completionScale: number;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  mimeType: string;
}

export interface TaskResponse {
  responseText?: string | null;
  linkUrl?: string | null;
  submittedAt: string;
  attachments: TaskAttachment[];
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  type:
    | 'document_upload'
    | 'form_completion'
    | 'meeting_attendance'
    | 'goal_update'
    | 'feedback_submission'
    | 'other';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  phase?: string | null;
  assignmentGroupId?: string | null;
  requiresResponse: boolean;
  requiresAttachment: boolean;
  requiresLink: boolean;
  status: 'pending' | 'in_progress' | 'completed';
  assignedBy: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  overdue: boolean;
  response?: TaskResponse;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: string;
  url: string;
  uploadedBy: string;
  uploadDate: string;
  createdAt: string;
  updatedAt: string;
}

export type PlatformSetupStatus = 'yes' | 'no' | 'pending';

export interface PlatformSetup {
  platformId: string;
  slug: string;
  name: string;
  signpostingUrl?: string | null;
  sortOrder: number;
  status: PlatformSetupStatus;
}

export interface AnnualUpdate {
  id: string;
  scholarId: string;
  academicYear: string;
  status: 'draft' | 'submitted';
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

export interface AnnualUpdateReportRow {
  id: string;
  scholarId: string;
  academicYear: string;
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  updatedAt: string;
  scholarName: string;
  scholarEmail: string;
  aaiScholarId: string | null;
  scholarYear: string;
  university: string;
}

export interface ScholarProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  phone?: string | null;
  program: string;
  year: string;
  university: string;
  location?: string | null;
  bio?: string | null;
  status: 'active' | 'inactive' | 'on_hold' | 'archived';
  programStage: 'prep_year' | 'scholar';
  intendedUniversity?: string | null;
  intendedCourse?: string | null;
  degreePathway?: string | null;
  startDate: string;
  lastActivity?: string | null;
  aaiScholarId?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  nationality?: string | null;
  addressHomeCountry?: string | null;
  passportExpirationDate?: string | null;
  visaExpirationDate?: string | null;
  emergencyContactCountryOfStudy?: string | null;
  emergencyContactHomeCountry?: string | null;
  graduationDate?: string | null;
  universityId?: string | null;
  dietaryInformation?: string | null;
  kokorozashi?: string | null;
  longTermCareerPlan?: string | null;
  postGraduationPlan?: string | null;
  majorCategory?: string | null;
  fieldOfStudy?: string | null;
  goals: Goal[];
  tasks: Task[];
  documents: Document[];
  platformSetups?: PlatformSetup[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateScholarProfileData {
  dateOfBirth?: string;
  gender?: Gender;
  nationality?: string;
  phone?: string;
  location?: string;
  addressHomeCountry?: string;
  passportExpirationDate?: string;
  visaExpirationDate?: string;
  emergencyContactCountryOfStudy?: string;
  emergencyContactHomeCountry?: string;
  program?: string;
  university?: string;
  year?: string;
  startDate?: string;
  graduationDate?: string;
  universityId?: string;
  dietaryInformation?: string;
  kokorozashi?: string;
  longTermCareerPlan?: string;
  postGraduationPlan?: string;
  bio?: string;
  majorCategory?: string;
  fieldOfStudy?: string;
  programStage?: 'prep_year' | 'scholar';
  intendedUniversity?: string;
  intendedCourse?: string;
  degreePathway?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface GetScholarsResponse {
  data: Scholar[];
  pagination: PaginationMeta;
}

export interface GetScholarsParams {
  page?: number;
  limit?: number;
  search?: string;
  program?: string;
  year?: string;
  university?: string;
  status?: 'active' | 'inactive' | 'on_hold' | 'archived';
  programStage?: 'prep_year' | 'scholar';
  platformSetup?: 'incomplete' | 'complete';
  sortBy?: 'name' | 'lastActivity' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  console.log('[fetchAPI] About to fetch:', {
    url,
    method: options.method || 'GET',
    body: options.body,
    headers: options.headers,
  });

  try {
    const headers: Record<string, string> = {};

    // Copy existing headers if they exist
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    // Only set Content-Type if there's a body
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for authentication
    });

    console.log('[fetchAPI] Response received:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      // Don't log 401 errors as they're expected when not authenticated
      if (response.status !== 401) {
        console.error(`API Error: ${response.status} - ${errorText}`);
      }
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[fetchAPI] Response data:', data);
    return data;
  } catch (error) {
    console.error('[fetchAPI] FETCH FAILED:', error);
    console.error('[fetchAPI] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function getScholars(params?: GetScholarsParams): Promise<GetScholarsResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/scholars${queryString ? `?${queryString}` : ''}`;

  return fetchAPI<GetScholarsResponse>(endpoint);
}

export async function getScholar(id: string): Promise<Scholar> {
  return fetchAPI<Scholar>(`/api/scholars/${id}`);
}

export async function getScholarProfile(id: string): Promise<ScholarProfile> {
  return fetchAPI<ScholarProfile>(`/api/scholars/${id}/profile`);
}

export async function updateScholarPlatformSetup(
  scholarId: string,
  data: { slug: string; status: PlatformSetupStatus }
): Promise<ScholarProfile> {
  return fetchAPI<ScholarProfile>(`/api/scholars/${scholarId}/platform-setup`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export async function getAnnualUpdatesByScholar(scholarId: string): Promise<AnnualUpdate[]> {
  return fetchAPI<AnnualUpdate[]>(`/api/annual-updates/scholar/${scholarId}`);
}

export async function getAnnualUpdatesReport(): Promise<AnnualUpdateReportRow[]> {
  return fetchAPI<AnnualUpdateReportRow[]>('/api/annual-updates');
}

async function downloadCsvFile(
  endpoint: string,
  filename: string,
  errorMessage: string,
  options: RequestInit = {}
): Promise<void> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(errorMessage);
  }

  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function downloadScholarAnnualReviewsCSV(
  scholarId: string,
  scholarName: string
): Promise<void> {
  await downloadCsvFile(
    `/api/annual-updates/scholar/${scholarId}/export/csv`,
    `${scholarName.replace(/\s+/g, '_')}_Annual_Reviews.csv`,
    'Failed to download annual reviews CSV'
  );
}

export async function downloadAnnualReviewsCSV(annualUpdateIds?: string[]): Promise<void> {
  await downloadCsvFile(
    '/api/annual-updates/export/csv',
    `${annualUpdateIds ? 'annual-reviews-filtered' : 'annual-reviews-export'}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`,
    'Failed to download annual reviews CSV',
    annualUpdateIds
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ annualUpdateIds }),
        }
      : { method: 'GET' }
  );
}

export async function updateScholarProfile(
  scholarId: string,
  data: UpdateScholarProfileData
): Promise<ScholarProfile> {
  return fetchAPI<ScholarProfile>(`/api/scholars/${scholarId}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Trigger download of all scholars CSV (staff). */
export async function downloadAllScholarsCSV(): Promise<void> {
  await downloadCsvFile(
    '/api/scholars/export/csv',
    `scholars-export-${new Date().toISOString().slice(0, 10)}.csv`,
    'Failed to download scholars CSV'
  );
}

export async function archiveScholar(scholarId: string): Promise<Scholar> {
  return fetchAPI<Scholar>(`/api/scholars/${scholarId}/archive`, {
    method: 'PATCH',
  });
}

export async function deleteScholar(scholarId: string): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/api/scholars/${scholarId}`, {
    method: 'DELETE',
  });
}

// File download function
export async function getFileDownloadUrl(attachmentId: string): Promise<{ downloadUrl: string }> {
  return fetchAPI<{ downloadUrl: string }>(`/api/files/download/${attachmentId}`);
}

// Request interfaces
export interface RequestAttachment {
  id: string;
  name: string;
  size: string;
  url: string;
  mimeType: string;
  uploadedAt: string;
}

export interface RequestAuditLog {
  id: string;
  action: string;
  performedBy: string;
  previousStatus?: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';
  newStatus?: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';
  comment?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface RequestAssignee {
  id: string;
  name: string;
  email: string;
}

export interface Request {
  id: string;
  scholarId: string;
  scholarName: string;
  scholarEmail: string;
  type:
    | 'extenuating_circumstances'
    | 'summer_funding_request'
    | 'summer_funding_report'
    | 'requirement_submission';
  description: string;
  formData?: Record<string, unknown> | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';
  submittedDate: string;
  reviewedBy?: string | null;
  reviewComment?: string | null;
  reviewDate?: string | null;
  assignees?: RequestAssignee[];
  attachments: RequestAttachment[];
  auditLogs: RequestAuditLog[];
  createdAt: string;
  updatedAt: string;
}

export interface GetRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?:
    | 'extenuating_circumstances'
    | 'summer_funding_request'
    | 'summer_funding_report'
    | 'requirement_submission';
  status?: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';
  priority?: 'high' | 'medium' | 'low';
  sortBy?: 'submittedDate' | 'status' | 'priority' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetRequestsResponse {
  data: Request[];
  pagination: PaginationMeta;
}

export async function getRequests(params?: GetRequestsParams): Promise<GetRequestsResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/requests${queryString ? `?${queryString}` : ''}`;

  return fetchAPI<GetRequestsResponse>(endpoint);
}

export interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  reviewed: number;
  commented: number;
}

export async function getRequestStats(): Promise<RequestStats> {
  return fetchAPI<RequestStats>('/api/requests/stats');
}

export async function updateRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected' | 'reviewed' | 'commented',
  comment: string,
  reviewedBy: string
): Promise<{
  id: string;
  status: string;
  reviewComment: string;
  reviewedBy: string;
  reviewDate: string;
}> {
  return fetchAPI(`/api/requests/${requestId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, comment, reviewedBy }),
  });
}

export async function deleteRequest(requestId: string): Promise<void> {
  return fetchAPI(`/api/requests/${requestId}`, {
    method: 'DELETE',
  });
}

// Announcement types and functions
export interface ScholarFilter {
  id: string;
  userId: string;
  name: string;
  email: string;
  program: string;
  year: string;
  university: string;
  location?: string | null;
  status: 'active' | 'inactive' | 'on_hold';
}

export interface AnnouncementFilterOptions {
  programs: string[];
  years: string[];
  universities: string[];
  locations: string[];
  statuses: string[];
}

export interface GetAnnouncementsParams {
  year?: string;
  program?: string;
  university?: string;
  status?: 'active' | 'archived' | 'all';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  filters?: Array<{
    filterType: string;
    filterValue: string;
  }>;
}

export async function getScholarsForFiltering(): Promise<ScholarFilter[]> {
  return fetchAPI<ScholarFilter[]>('/api/announcements/scholars');
}

export async function getAnnouncementFilterOptions(): Promise<AnnouncementFilterOptions> {
  return fetchAPI<AnnouncementFilterOptions>('/api/announcements/filter-options');
}

export async function createAnnouncement(data: CreateAnnouncementData): Promise<{
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}> {
  return fetchAPI('/api/announcements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  archivedAt?: string | null;
  filters: Array<{ type: string; value: string }>;
  recipientCount: number;
}

export async function getAnnouncements(params?: GetAnnouncementsParams): Promise<Announcement[]> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        (key === 'status' || value !== 'all')
      ) {
        queryParams.append(key, String(value));
      }
    });
  }

  const queryString = queryParams.toString();
  return fetchAPI<Announcement[]>(`/api/announcements${queryString ? `?${queryString}` : ''}`);
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  return fetchAPI(`/api/announcements/${announcementId}`, {
    method: 'DELETE',
  });
}

export interface ScholarStats {
  total: number;
  active: number;
  inactive: number;
  onHold: number;
}

export async function getScholarStats(): Promise<ScholarStats> {
  return fetchAPI<ScholarStats>('/api/scholars/stats');
}

// Scholar filter options (for scholar management table)
export interface ScholarFilterOptions {
  programs: string[];
  years: string[];
  universities: string[];
  intendedUniversities: string[];
  intendedCourses: string[];
}

export async function getFilterOptions(): Promise<ScholarFilterOptions> {
  return fetchAPI<ScholarFilterOptions>('/api/scholars/filters');
}

// User management functions
export interface UpdateUserData {
  name?: string;
  image?: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  userType?: 'staff' | 'scholar';
  createdAt?: string;
  updatedAt?: string;
}

export async function updateUser(data: UpdateUserData): Promise<UserProfile> {
  return fetchAPI('/api/users/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// Task management functions
export interface CreateTaskData {
  title: string;
  description?: string;
  type:
    | 'document_upload'
    | 'form_completion'
    | 'meeting_attendance'
    | 'goal_update'
    | 'feedback_submission'
    | 'other';
  priority?: 'high' | 'medium' | 'low';
  dueDate: string;
  scholarId: string;
  phase?: string;
  requiresResponse?: boolean;
  requiresAttachment?: boolean;
  requiresLink?: boolean;
}

export async function createTask(data: CreateTaskData): Promise<Task> {
  return fetchAPI<Task>('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export interface CreateBulkTasksData {
  title: string;
  description?: string;
  type: CreateTaskData['type'];
  priority?: 'high' | 'medium' | 'low';
  dueDate: string;
  scholarIds?: string[];
  programStage?: 'prep_year';
  phase?: string;
  requiresResponse?: boolean;
  requiresAttachment?: boolean;
  requiresLink?: boolean;
}

export async function createBulkTasks(
  data: CreateBulkTasksData
): Promise<{ created: number; tasks: unknown[] }> {
  return fetchAPI('/api/tasks/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export async function getTasksByScholar(scholarId: string): Promise<Task[]> {
  return fetchAPI<Task[]>(`/api/tasks/scholar/${scholarId}`);
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  type?:
    | 'document_upload'
    | 'form_completion'
    | 'meeting_attendance'
    | 'goal_update'
    | 'feedback_submission'
    | 'other';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  phase?: string | null;
  requiresResponse?: boolean;
  requiresAttachment?: boolean;
  requiresLink?: boolean;
}

export async function updateTask(taskId: string, data: UpdateTaskData): Promise<Task> {
  return fetchAPI<Task>(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export async function deleteTask(taskId: string): Promise<{ id: string; alreadyDeleted: boolean }> {
  return fetchAPI(`/api/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export interface TaskTitleSuggestion {
  title: string;
  description?: string | null;
  type:
    | 'document_upload'
    | 'form_completion'
    | 'meeting_attendance'
    | 'goal_update'
    | 'feedback_submission'
    | 'other';
  priority: 'high' | 'medium' | 'low';
  phase?: string | null;
  requiresResponse?: boolean;
  requiresAttachment?: boolean;
  requiresLink?: boolean;
  lastUsedAt: string;
  useCount: number;
}

export async function getTaskTitleSuggestions(
  query: string,
  limit = 8
): Promise<TaskTitleSuggestion[]> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('limit', String(limit));
  return fetchAPI<TaskTitleSuggestion[]>(`/api/tasks/suggestions?${params.toString()}`);
}

// Scholar creation function
export interface CreateScholarData {
  name: string;
  email: string;
  program: string;
  year: string;
  university: string;
  startDate: string;
  aaiScholarId?: string;
  dateOfBirth?: string;
  gender?: Gender;
  nationality?: string;
  phone?: string;
  location?: string;
  addressHomeCountry?: string;
  passportExpirationDate?: string;
  visaExpirationDate?: string;
  emergencyContactCountryOfStudy?: string;
  emergencyContactHomeCountry?: string;
  graduationDate?: string;
  universityId?: string;
  dietaryInformation?: string;
  kokorozashi?: string;
  longTermCareerPlan?: string;
  postGraduationPlan?: string;
  bio?: string;
  majorCategory?: string;
  fieldOfStudy?: string;
  programStage?: 'prep_year' | 'scholar';
  intendedUniversity?: string;
  intendedCourse?: string;
  degreePathway?: string;
}

export async function createScholar(data: CreateScholarData): Promise<{
  success: boolean;
  message: string;
  scholar?: unknown;
}> {
  return fetchAPI('/api/scholars', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// Invitations (staff portal)
export interface InvitationSummary {
  id: string;
  email: string;
  userType: 'staff' | 'scholar';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  acceptedAt: string | null;
  sentAt: string | null;
  lastResentAt: string | null;
  resentCount: string;
  invitedBy: string;
  createdAt: string;
}

export interface CreateInvitationResponse {
  id: string;
  email: string;
  userType: string;
  status: string;
  expiresAt: string;
  sentAt: string;
}

export interface StaffInvitationOptions {
  /** Defaults to `staff` so existing invite dialogs keep working. */
  userType?: 'staff' | 'scholar';
  /** Programme stage: 'prep_year' or 'scholar' */
  programStage?: 'prep_year' | 'scholar';
  /** Intended destination (only meaningful when programStage = prep_year) */
  intendedUniversity?: string;
  intendedCourse?: string;
  degreePathway?: string;
}

/** Create an invitation. Defaults to staff invites unless userType is overridden. */
export async function createStaffInvitation(
  email: string,
  options: StaffInvitationOptions = {}
): Promise<CreateInvitationResponse> {
  const body: {
    email: string;
    userType: 'staff' | 'scholar';
    scholarData?: {
      programStage?: 'prep_year' | 'scholar';
      intendedUniversity?: string;
      intendedCourse?: string;
      degreePathway?: string;
    };
  } = {
    email,
    userType: options.userType ?? 'staff',
  };
  if (body.userType === 'scholar' && options.programStage) {
    body.scholarData = {
      programStage: options.programStage,
      intendedUniversity: options.intendedUniversity,
      intendedCourse: options.intendedCourse,
      degreePathway: options.degreePathway,
    };
  }
  return fetchAPI<CreateInvitationResponse>('/api/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function getInvitations(
  status?: 'pending' | 'accepted' | 'expired' | 'cancelled'
): Promise<InvitationSummary[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return fetchAPI<InvitationSummary[]>(`/api/invitations${qs}`);
}

export async function resendInvitation(
  invitationId: string
): Promise<{ message: string; resentCount: number }> {
  return fetchAPI<{ message: string; resentCount: number }>('/api/invitations/resend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invitationId }),
  });
}

export async function cancelInvitation(invitationId: string): Promise<{ message: string }> {
  return fetchAPI<{ message: string }>(`/api/invitations/${invitationId}`, {
    method: 'DELETE',
  });
}

// Resources
export type ResourceType = 'Guide' | 'Handbook' | 'Template';
export type ResourceCategory = 'LDF' | 'Handbook' | 'Proposal' | 'Support';
export type ResourceStatus = 'draft' | 'live';
export type ResourceSourceType = 'url' | 'file';

export interface ResourceFilter {
  type: string;
  value: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  sourceType: ResourceSourceType;
  url: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
  status: ResourceStatus;
  filters: ResourceFilter[];
  createdAt: string;
  updatedAt: string;
}

export interface ResourceFilterOptions {
  programs: string[];
  years: string[];
  universities: string[];
  locations: string[];
  statuses: string[];
}

export interface SaveResourceData {
  title: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  sourceType?: ResourceSourceType;
  url?: string;
  pendingFileKey?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  status?: ResourceStatus;
  filters?: Array<{
    filterType: string;
    filterValue: string;
  }>;
}

export async function getResources(): Promise<Resource[]> {
  return fetchAPI<Resource[]>('/api/resources');
}

export async function createResource(data: SaveResourceData): Promise<Resource> {
  return fetchAPI<Resource>('/api/resources', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateResource(
  resourceId: string,
  data: Partial<SaveResourceData>
): Promise<Resource> {
  return fetchAPI<Resource>(`/api/resources/${resourceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteResource(resourceId: string): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/api/resources/${resourceId}`, {
    method: 'DELETE',
  });
}

export async function getResourceFilterOptions(): Promise<ResourceFilterOptions> {
  return fetchAPI<ResourceFilterOptions>('/api/resources/filter-options');
}

export async function createResourceUploadUrl(data: {
  fileName: string;
  fileType: string;
  fileSize: number;
}): Promise<{ uploadUrl: string; fields: Record<string, string>; fileKey: string }> {
  return fetchAPI<{ uploadUrl: string; fields: Record<string, string>; fileKey: string }>(
    '/api/resources/upload-url',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function getResourceDownloadUrl(
  resourceId: string,
  disposition: 'attachment' | 'inline' = 'attachment'
): Promise<{ downloadUrl: string }> {
  const query = disposition === 'inline' ? '?disposition=inline' : '';
  return fetchAPI<{ downloadUrl: string }>(`/api/resources/${resourceId}/download${query}`);
}

export interface RequiredDocumentType {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface RequiredDocumentFileSummary {
  id: string;
  fileName: string;
  uploadedAt: string;
}

export interface RequiredDocumentCohortItem {
  typeId: string;
  status: 'submitted' | 'missing';
  file: RequiredDocumentFileSummary | null;
}

export interface RequiredDocumentCohortScholar {
  scholarId: string;
  name: string;
  email: string;
  items: RequiredDocumentCohortItem[];
}

export interface RequiredDocumentCohort {
  types: RequiredDocumentType[];
  scholars: RequiredDocumentCohortScholar[];
}

export interface RequiredDocumentChecklistItem {
  type: RequiredDocumentType;
  status: 'submitted' | 'missing';
  file: {
    id: string;
    typeId: string;
    fileName: string;
    fileMimeType: string;
    fileSizeBytes: number;
    uploadedAt: string;
  } | null;
}

export interface RequiredDocumentChecklist {
  scholarId: string;
  items: RequiredDocumentChecklistItem[];
}

export async function getRequiredDocumentTypes(): Promise<RequiredDocumentType[]> {
  return fetchAPI<RequiredDocumentType[]>('/api/documents/types');
}

export async function createRequiredDocumentType(data: {
  label: string;
  description?: string;
}): Promise<RequiredDocumentType> {
  return fetchAPI<RequiredDocumentType>('/api/documents/types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRequiredDocumentType(
  typeId: string,
  data: { label?: string; description?: string; isActive?: boolean; sortOrder?: number }
): Promise<RequiredDocumentType> {
  return fetchAPI<RequiredDocumentType>(`/api/documents/types/${typeId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getRequiredDocumentCohort(
  missingTypeId?: string
): Promise<RequiredDocumentCohort> {
  const query = missingTypeId ? `?missingTypeId=${encodeURIComponent(missingTypeId)}` : '';
  return fetchAPI<RequiredDocumentCohort>(`/api/documents/cohort${query}`);
}

export async function getScholarRequiredDocuments(
  scholarId: string
): Promise<RequiredDocumentChecklist> {
  return fetchAPI<RequiredDocumentChecklist>(`/api/documents/scholar/${scholarId}`);
}

export async function getRequiredDocumentDownloadUrl(
  fileId: string,
  disposition: 'attachment' | 'inline' = 'attachment'
): Promise<{ downloadUrl: string }> {
  const query = disposition === 'inline' ? '?disposition=inline' : '';
  return fetchAPI<{ downloadUrl: string }>(`/api/documents/${fileId}/download${query}`);
}

// Staff management
export interface StaffMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  isSuperAdmin: boolean;
  joinedAt: string;
  isSelf: boolean;
}

export interface StaffManagementResponse {
  staff: StaffMember[];
  canManage: boolean;
}

export async function getStaffForManagement(): Promise<StaffManagementResponse> {
  return fetchAPI<StaffManagementResponse>('/api/users/staff/manage');
}

export async function removeStaffMember(
  userId: string
): Promise<{ success: boolean; alreadyInactive: boolean }> {
  return fetchAPI<{ success: boolean; alreadyInactive: boolean }>(`/api/users/staff/${userId}`, {
    method: 'DELETE',
  });
}
