// API client for making authenticated requests to the backend
// Works alongside better-auth for non-auth endpoints

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

export interface ScholarProfile extends Scholar {
  goals: Goal[];
  tasks: Task[];
  documents: Document[];
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

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
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

export interface FilterOptions {
  programs: string[];
  years: string[];
  universities: string[];
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return fetchAPI<FilterOptions>('/api/scholars/filters');
}
