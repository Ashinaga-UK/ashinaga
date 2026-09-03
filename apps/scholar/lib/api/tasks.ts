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
  phase?: string | null;
  assignmentGroupId?: string | null;
  requiresResponse?: boolean;
  requiresAttachment?: boolean;
  requiresLink?: boolean;
  status: 'pending' | 'in_progress' | 'completed';
  assignedBy: string;
  assignedByName: string | null;
  createdAt: string;
  completedAt: string | null;
  overdue?: boolean;
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
  payload: {
    responseText?: string;
    attachmentIds?: unknown[];
    linkUrl?: string;
  }
): Promise<unknown> {
  return fetchAPI(`/api/tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
