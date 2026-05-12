import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRequest,
  type GetMyAnnouncementsParams,
  getMyAnnouncements,
  getMyRequests,
  getStaffList,
} from '../api-client';

// Query keys
export const queryKeys = {
  myAnnouncements: (params?: GetMyAnnouncementsParams) => ['my-announcements', params] as const,
  myRequests: ['my-requests'] as const,
  staffList: ['staff-list'] as const,
};

// My announcements query
export function useMyAnnouncements(params?: GetMyAnnouncementsParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.myAnnouncements(params),
    queryFn: () => getMyAnnouncements(params),
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

// Staff list query
export function useStaffList(enabled = true) {
  return useQuery({
    queryKey: queryKeys.staffList,
    queryFn: getStaffList,
    enabled,
  });
}

// Create request mutation
export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      // Invalidate and refetch requests
      queryClient.invalidateQueries({
        queryKey: queryKeys.myRequests,
      });
    },
  });
}
