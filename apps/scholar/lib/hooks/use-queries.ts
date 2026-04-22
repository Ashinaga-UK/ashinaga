import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveRequest,
  createRequest,
  getMyAnnouncements,
  getMyRequests,
  getStaffList,
  restoreRequest,
} from '../api-client';

// Query keys
export const queryKeys = {
  myAnnouncements: ['my-announcements'] as const,
  myRequests: (includeArchived = false) => ['my-requests', includeArchived] as const,
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
export function useMyRequests(enabled = true, includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.myRequests(includeArchived),
    queryFn: () => getMyRequests(includeArchived),
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
        queryKey: ['my-requests'],
      });
    },
  });
}

export function useArchiveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
  });
}

export function useRestoreRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
  });
}
