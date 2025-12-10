import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRequest, getMyAnnouncements, getMyRequests, getStaffList } from '../api-client';

// Query keys
export const queryKeys = {
  myAnnouncements: ['my-announcements'] as const,
  myRequests: ['my-requests'] as const,
  staffList: ['staff-list'] as const,
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
