// API client for making authenticated requests to the backend
// Works alongside better-auth for non-auth endpoints

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
  status: 'active' | 'inactive' | 'on_hold';
  startDate: string;
  lastActivity?: string | null;
  goals: ScholarGoalsStats;
  tasks: ScholarTasksStats;
  createdAt: string;
  updatedAt: string;
}

// New interfaces for detailed scholar profile
export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  category: 'academic' | 'career' | 'leadership' | 'personal' | 'community';
  targetDate: string;
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
  status: 'pending' | 'in_progress' | 'completed';
  assignedBy: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
  status: 'active' | 'inactive' | 'on_hold';
  startDate: string;
  lastActivity?: string | null;
  goals: Goal[];
  tasks: Task[];
  documents: Document[];
  createdAt: string;
  updatedAt: string;
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
  status?: 'active' | 'inactive' | 'on_hold';
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
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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

export interface Request {
  id: string;
  scholarId: string;
  scholarName: string;
  scholarEmail: string;
  type: 'financial_support' | 'extenuating_circumstances' | 'academic_support';
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';
  submittedDate: string;
  reviewedBy?: string | null;
  reviewComment?: string | null;
  reviewDate?: string | null;
  attachments: RequestAttachment[];
  auditLogs: RequestAuditLog[];
  createdAt: string;
  updatedAt: string;
}

export interface GetRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'financial_support' | 'extenuating_circumstances' | 'academic_support';
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
  filters: Array<{ type: string; value: string }>;
  recipientCount: number;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  return fetchAPI<Announcement[]>('/api/announcements');
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
}

export async function getFilterOptions(): Promise<ScholarFilterOptions> {
  return fetchAPI<ScholarFilterOptions>('/api/scholars/filters');
}

// User management functions
export interface UpdateUserData {
  name?: string;
}

export async function updateUser(data: UpdateUserData): Promise<any> {
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
}

export async function createTask(data: CreateTaskData): Promise<{
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  dueDate: string;
  status: string;
  scholarId: string;
  assignedBy: string;
  createdAt: string;
}> {
  return fetchAPI('/api/tasks', {
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
  gender?: string;
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
}

export async function createScholar(data: CreateScholarData): Promise<{
  success: boolean;
  message: string;
  scholar?: any;
}> {
  return fetchAPI('/api/scholars', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}
