import { fetchAPI } from '../api-client';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type:
    | 'document_upload'
    | 'form_completion'
    | 'meeting_attendance'
    | 'goal_update'
    | 'feedback_submission'
    | 'other';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedBy: string;
  assignedByName: string | null;
  createdAt: string;
  completedAt: string | null;
}

export async function getMyTasks(): Promise<Task[]> {
  return fetchAPI<Task[]>('/api/tasks/my-tasks');
}

export async function updateTaskStatus(
  taskId: string,
  status: 'pending' | 'in_progress' | 'completed'
): Promise<Task> {
  return fetchAPI<Task>(`/api/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function completeTask(
  taskId: string,
  responseText: string,
  attachmentIds: string[]
): Promise<any> {
  return fetchAPI(`/api/tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ responseText, attachmentIds }),
  });
}
