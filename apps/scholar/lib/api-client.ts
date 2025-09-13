// API client for making authenticated requests to the backend
// Works alongside better-auth for non-auth endpoints

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Remove trailing slash from base URL and ensure endpoint starts with slash
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

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

// Export the fetchAPI function and any other API functions as needed
export { fetchAPI };
