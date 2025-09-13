import { useQuery } from '@tanstack/react-query';
import { type Announcement, getMyAnnouncements, type Request, getMyRequests } from '../api-client';

// Query keys
export const queryKeys = {
  myAnnouncements: ['my-announcements'] as const,
  myRequests: ['my-requests'] as const,
};

// My announcements query
export function useMyAnnouncements(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myAnnouncements,
    queryFn: getMyAnnouncements,
    enabled,
  });
}

// My requests query
export function useMyRequests(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myRequests,
    queryFn: getMyRequests,
    enabled,
  });
}
