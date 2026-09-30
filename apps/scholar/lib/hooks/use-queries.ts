import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRequest,
  type GetMyAnnouncementsParams,
  getMyAnnouncements,
  getMyDocumentChecklist,
  getMyRequests,
  getMyResources,
  getScholarNotificationsFeed,
  getStaffList,
  markScholarNotificationsRead,
} from '../api-client';

// Query keys
export const queryKeys = {
  myAnnouncements: (params?: GetMyAnnouncementsParams) => ['my-announcements', params] as const,
  myResources: ['my-resources'] as const,
  myRequests: ['my-requests'] as const,
  myDocuments: ['my-documents'] as const,
  staffList: ['staff-list'] as const,
  scholarNotifications: (search = '') => ['notifications', 'scholar-feed', search] as const,
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

// My resources query
export function useMyResources(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myResources,
    queryFn: getMyResources,
    enabled,
  });
}

export function useMyDocumentChecklist(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myDocuments,
    queryFn: getMyDocumentChecklist,
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

export function useScholarNotificationsFeed(search = '') {
  return useInfiniteQuery({
    queryKey: queryKeys.scholarNotifications(search),
    queryFn: ({ pageParam }) =>
      getScholarNotificationsFeed({
        page: pageParam,
        limit: 20,
        search: search || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.items || lastPage.items.length === 0) {
        return undefined;
      }
      const loaded = lastPage.page * lastPage.limit;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkScholarNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markScholarNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'scholar-feed'] });
    },
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
