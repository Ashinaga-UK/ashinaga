import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveScholar,
  type CreateTaskData,
  createAnnouncement,
  createCoordinatorMeetingUpdate,
  createCoordinatorNote,
  createTask,
  deleteCoordinatorMeetingUpdate,
  deleteCoordinatorNote,
  deleteScholar,
  deleteTask,
  type GetAnnouncementsParams,
  getAnnouncements,
  getAnnualUpdatesByScholar,
  getCoordinatorMeetingUpdates,
  getCoordinatorNotes,
  getPrepTaskCohort,
  getRequiredDocumentCohort,
  getRequiredDocumentTypes,
  getResourceFilterOptions,
  getResources,
  getScholarProfile,
  getScholarRequiredDocuments,
  getTasksByScholar,
  type PlatformSetupStatus,
  type PrepTaskCohortFilters,
  type ResourceFilterOptions,
  type Task,
  type UpdateScholarProfileData,
  type UpdateTaskData,
  updateCoordinatorMeetingUpdate,
  updateCoordinatorNote,
  updateScholarPlatformSetup,
  updateScholarProfile,
  updateTask,
  updateUser,
} from '../api-client';

// Query keys
export const queryKeys = {
  scholarProfile: (id: string) => ['scholar', id, 'profile'] as const,
  scholarAnnualUpdates: (id: string) => ['scholar', id, 'annual-updates'] as const,
  scholarTasks: (id: string) => ['scholar', id, 'tasks'] as const,
  user: ['user'] as const,
  announcements: (params?: GetAnnouncementsParams) => ['announcements', params] as const,
  resources: ['resources'] as const,
  resourceFilterOptions: ['resources', 'filter-options'] as const,
  requiredDocumentCohort: (missingTypeId?: string) =>
    ['required-documents', 'cohort', missingTypeId ?? 'all'] as const,
  requiredDocumentTypes: ['required-documents', 'types'] as const,
  scholarRequiredDocuments: (id: string) => ['scholar', id, 'required-documents'] as const,
  prepTaskCohort: (filters: PrepTaskCohortFilters = {}) =>
    ['prep-tasks', 'cohort', filters] as const,
  scholarCoordinatorNotes: (id: string) => ['scholar', id, 'coordinator-notes'] as const,
  scholarMeetingUpdates: (id: string) => ['scholar', id, 'meeting-updates'] as const,
};

// Scholar profile query
export function useScholarProfile(scholarId: string) {
  return useQuery({
    queryKey: queryKeys.scholarProfile(scholarId),
    queryFn: () => getScholarProfile(scholarId),
    enabled: !!scholarId,
  });
}

export function useScholarAnnualUpdates(scholarId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.scholarAnnualUpdates(scholarId),
    queryFn: () => getAnnualUpdatesByScholar(scholarId),
    enabled: !!scholarId && enabled,
  });
}

// Scholar tasks query
export function useScholarTasks(scholarId: string) {
  return useQuery({
    queryKey: queryKeys.scholarTasks(scholarId),
    queryFn: () => getTasksByScholar(scholarId),
    enabled: !!scholarId,
  });
}

// Create task mutation
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskData) => createTask(data),
    onSuccess: (newTask, variables) => {
      // Invalidate and refetch tasks for this scholar
      queryClient.invalidateQueries({
        queryKey: queryKeys.scholarTasks(variables.scholarId),
      });

      // Also update the scholar profile to reflect new task stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.scholarProfile(variables.scholarId),
      });

      // Optionally, optimistically update the tasks list
      queryClient.setQueryData<Task[]>(queryKeys.scholarTasks(variables.scholarId), (old) => {
        if (!old) return [newTask];
        return [...old, newTask];
      });
    },
  });
}

// Update user mutation
export function useUpdateUser() {
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      // Force a page reload to refresh session
      // This is a workaround for Better Auth's session management
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
  });
}

// Announcements query
export function useAnnouncements(params?: GetAnnouncementsParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.announcements(params),
    queryFn: () => getAnnouncements(params),
    enabled,
  });
}

// Resources query
export function useResources(enabled = true) {
  return useQuery({
    queryKey: queryKeys.resources,
    queryFn: getResources,
    enabled,
  });
}

export function useResourceFilterOptions() {
  return useQuery<ResourceFilterOptions>({
    queryKey: queryKeys.resourceFilterOptions,
    queryFn: getResourceFilterOptions,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePrepTaskCohort(filters: PrepTaskCohortFilters = {}) {
  return useQuery({
    queryKey: queryKeys.prepTaskCohort(filters),
    queryFn: () => getPrepTaskCohort(filters),
    placeholderData: keepPreviousData,
  });
}

export function useRequiredDocumentCohort(missingTypeId?: string) {
  return useQuery({
    queryKey: queryKeys.requiredDocumentCohort(missingTypeId),
    queryFn: () => getRequiredDocumentCohort(missingTypeId),
  });
}

export function useRequiredDocumentTypes() {
  return useQuery({
    queryKey: queryKeys.requiredDocumentTypes,
    queryFn: getRequiredDocumentTypes,
  });
}

export function useScholarRequiredDocuments(scholarId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.scholarRequiredDocuments(scholarId),
    queryFn: () => getScholarRequiredDocuments(scholarId),
    enabled: !!scholarId && enabled,
  });
}

export function useCoordinatorNotes(scholarId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.scholarCoordinatorNotes(scholarId),
    queryFn: () => getCoordinatorNotes(scholarId),
    enabled: !!scholarId && enabled,
  });
}

export function useCoordinatorMeetingUpdates(scholarId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.scholarMeetingUpdates(scholarId),
    queryFn: () => getCoordinatorMeetingUpdates(scholarId),
    enabled: !!scholarId && enabled,
  });
}

export function useCreateCoordinatorNote(scholarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string }) => createCoordinatorNote(scholarId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarCoordinatorNotes(scholarId) });
    },
  });
}

export function useUpdateCoordinatorNote(scholarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, body }: { noteId: string; body: string }) =>
      updateCoordinatorNote(scholarId, noteId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarCoordinatorNotes(scholarId) });
    },
  });
}

export function useDeleteCoordinatorNote(scholarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteCoordinatorNote(scholarId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarCoordinatorNotes(scholarId) });
    },
  });
}

export function useCreateCoordinatorMeetingUpdate(scholarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      meetingDate: string;
      notes?: string;
      concern?: string;
      furtherAction?: string;
    }) => createCoordinatorMeetingUpdate(scholarId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarMeetingUpdates(scholarId) });
    },
  });
}

export function useUpdateCoordinatorMeetingUpdate(scholarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      updateId,
      data,
    }: {
      updateId: string;
      data: {
        meetingDate?: string;
        notes?: string;
        concern?: string;
        furtherAction?: string;
      };
    }) => updateCoordinatorMeetingUpdate(scholarId, updateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarMeetingUpdates(scholarId) });
    },
  });
}

export function useDeleteCoordinatorMeetingUpdate(scholarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updateId: string) => deleteCoordinatorMeetingUpdate(scholarId, updateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarMeetingUpdates(scholarId) });
    },
  });
}

// Create announcement mutation
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      // Invalidate and refetch announcements
      queryClient.invalidateQueries({
        queryKey: ['announcements'],
      });
    },
  });
}

// Update task mutation
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskData }) =>
      updateTask(taskId, data),
    onSuccess: (updatedTask) => {
      if (updatedTask && 'scholarId' in updatedTask) {
        const scholarId = (updatedTask as { scholarId: string }).scholarId;
        queryClient.invalidateQueries({ queryKey: queryKeys.scholarTasks(scholarId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.scholarProfile(scholarId) });
      }
    },
  });
}

// Delete task mutation (soft delete)
export function useDeleteTask(scholarId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      if (scholarId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.scholarTasks(scholarId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.scholarProfile(scholarId) });
      } else {
        queryClient.invalidateQueries({ queryKey: ['scholar'] });
      }
    },
  });
}

// Update scholar profile (staff)
export function useUpdateScholarProfile(scholarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateScholarProfileData) => updateScholarProfile(scholarId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarProfile(scholarId) });
    },
  });
}

export function useUpdateScholarPlatformSetup(scholarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; status: PlatformSetupStatus }) =>
      updateScholarPlatformSetup(scholarId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarProfile(scholarId) });
    },
  });
}

// Archive scholar (staff)
export function useArchiveScholar() {
  return useMutation({
    mutationFn: archiveScholar,
  });
}

// Delete scholar (staff)
export function useDeleteScholar() {
  return useMutation({
    mutationFn: deleteScholar,
  });
}
