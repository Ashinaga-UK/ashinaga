import { useQuery } from '@tanstack/react-query';
import { type Announcement, getMyAnnouncements } from '../api-client';

// Query keys
export const queryKeys = {
  myAnnouncements: ['my-announcements'] as const,
};

// My announcements query
export function useMyAnnouncements(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myAnnouncements,
    queryFn: getMyAnnouncements,
    enabled,
  });
}
