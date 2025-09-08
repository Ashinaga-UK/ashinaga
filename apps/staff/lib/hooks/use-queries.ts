import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type Announcement,
  type CreateAnnouncementData,
  type CreateTaskData,
  createAnnouncement,
  createTask,
  getAnnouncements,
  getScholarProfile,
  getTasksByScholar,
  type ScholarProfile,
  type Task,
  type UpdateTaskData,
  updateTask,
  updateUser,
} from '../api-client';

// Query keys
export const queryKeys = {
  scholarProfile: (id: string) => ['scholar', id, 'profile'] as const,
  scholarTasks: (id: string) => ['scholar', id, 'tasks'] as const,
  user: ['user'] as const,
  announcements: ['announcements'] as const,
};

// Scholar profile query
export function useScholarProfile(scholarId: string) {
  return useQuery({
    queryKey: queryKeys.scholarProfile(scholarId),
    queryFn: () => getScholarProfile(scholarId),
    enabled: !!scholarId,
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
        if (!old) return [{ ...newTask, updatedAt: newTask.createdAt } as Task];
        return [...old, { ...newTask, updatedAt: newTask.createdAt } as Task];
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
export function useAnnouncements() {
  return useQuery({
    queryKey: queryKeys.announcements,
    queryFn: getAnnouncements,
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
        queryKey: queryKeys.announcements,
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
    onSuccess: (updatedTask, variables) => {
      // Invalidate tasks for the scholar
      // We need to find the scholar ID from the task
      if (updatedTask && 'scholarId' in updatedTask) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.scholarTasks((updatedTask as any).scholarId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.scholarProfile((updatedTask as any).scholarId),
        });
      }
    },
  });
}
