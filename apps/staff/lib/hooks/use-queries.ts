import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTask,
  getScholarProfile,
  getTasksByScholar,
  updateUser,
  type CreateTaskData,
  type ScholarProfile,
  type Task,
} from '../api-client';

// Query keys
export const queryKeys = {
  scholarProfile: (id: string) => ['scholar', id, 'profile'] as const,
  scholarTasks: (id: string) => ['scholar', id, 'tasks'] as const,
  user: ['user'] as const,
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
        if (!old) return [newTask as Task];
        return [...old, newTask as Task];
      });
    },
  });
}

// Update user mutation
export function useUpdateUser() {
  const queryClient = useQueryClient();

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
