import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRequest, getMyAnnouncements, getMyRequests } from '../api-client';

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
