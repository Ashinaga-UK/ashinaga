import { fetchAPI } from '../api-client';

export interface GoalComment {
  id: string;
  goalId: string;
  userId: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  userType: 'staff' | 'scholar';
}

export interface CreateCommentData {
  comment: string;
}

export interface UpdateCommentData {
  comment: string;
}

export async function getGoalComments(goalId: string): Promise<GoalComment[]> {
  return fetchAPI<GoalComment[]>(`/api/goals/${goalId}/comments`);
}

export async function createGoalComment(
  goalId: string,
  data: CreateCommentData
): Promise<GoalComment> {
  return fetchAPI<GoalComment>(`/api/goals/${goalId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGoalComment(
  commentId: string,
  data: UpdateCommentData
): Promise<GoalComment> {
  return fetchAPI<GoalComment>(`/api/goals/comments/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteGoalComment(commentId: string): Promise<{ message: string }> {
  return fetchAPI<{ message: string }>(`/api/goals/comments/${commentId}`, {
    method: 'DELETE',
  });
}
