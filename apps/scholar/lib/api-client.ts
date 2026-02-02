// API client for making authenticated requests to the backend
// Works alongside better-auth for non-auth endpoints

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Remove trailing slash from base URL and ensure endpoint starts with slash
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  // Only set Content-Type for requests with a body
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    // Don't log 401 errors as they're expected when not authenticated
    if (response.status !== 401) {
      console.error(`API Error: ${response.status} - ${error}`);
    }
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Announcement types and functions
export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function getMyAnnouncements(): Promise<Announcement[]> {
  return fetchAPI<Announcement[]>('/api/announcements/my-announcements');
}

// Request types and functions
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
  comment?: string;
  metadata?: string;
  createdAt: string;
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
  formData?: Record<string, any> | null;
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

export async function getMyRequests(): Promise<Request[]> {
  return fetchAPI<Request[]>('/api/requests/my-requests');
}

export interface CreateRequestData {
  type:
    | 'extenuating_circumstances'
    | 'summer_funding_request'
    | 'summer_funding_report'
    | 'requirement_submission';
  description: string;
  formData?: Record<string, any>;
  priority?: 'high' | 'medium' | 'low';
  attachmentIds?: string[];
  assignedTo?: string;
}

export async function createRequest(data: CreateRequestData): Promise<Request> {
  return fetchAPI<Request>('/api/requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Staff types and functions
export interface StaffMember {
  id: string;
  name: string;
  email: string;
}

export async function getStaffList(): Promise<StaffMember[]> {
  return fetchAPI<StaffMember[]>('/api/users/staff');
}

// Export the fetchAPI function and any other API functions as needed
export { fetchAPI };
