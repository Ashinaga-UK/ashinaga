import { fetchAPI } from '../api-client';

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: 'academic' | 'career' | 'leadership' | 'personal' | 'community';
  targetDate: string;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed';
  scholarId: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalData {
  title: string;
  description?: string;
  category: 'academic' | 'career' | 'leadership' | 'personal' | 'community';
  targetDate: string;
  progress?: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  category?: 'academic' | 'career' | 'leadership' | 'personal' | 'community';
  targetDate?: string;
  progress?: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

export async function getMyGoals(): Promise<Goal[]> {
  return fetchAPI<Goal[]>('/api/goals/my-goals');
}

export async function createGoal(data: CreateGoalData): Promise<Goal> {
  return fetchAPI<Goal>('/api/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGoal(goalId: string, data: UpdateGoalData): Promise<Goal> {
  return fetchAPI<Goal>(`/api/goals/${goalId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteGoal(goalId: string): Promise<{ message: string }> {
  return fetchAPI<{ message: string }>(`/api/goals/${goalId}`, {
    method: 'DELETE',
  });
}

export async function getGoalById(goalId: string): Promise<Goal> {
  return fetchAPI<Goal>(`/api/goals/${goalId}`);
}
