import { fetchAPI } from '../api-client';

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: 'academic_development' | 'personal_development' | 'professional_development';
  targetDate: string;
  relatedSkills: string | null;
  actionPlan: string | null;
  reviewNotes: string | null;
  completionScale: number;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed';
  term: 'term_1' | 'term_2' | 'term_3' | null;
  scholarId: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalData {
  title: string;
  description?: string;
  category: 'academic_development' | 'personal_development' | 'professional_development';
  targetDate: string;
  relatedSkills?: string;
  actionPlan?: string;
  reviewNotes?: string;
  completionScale?: number;
  progress?: number;
  status?: 'pending' | 'in_progress' | 'completed';
  term?: 'term_1' | 'term_2' | 'term_3';
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  category?: 'academic_development' | 'personal_development' | 'professional_development';
  targetDate?: string;
  relatedSkills?: string;
  actionPlan?: string;
  reviewNotes?: string;
  completionScale?: number;
  progress?: number;
  status?: 'pending' | 'in_progress' | 'completed';
  term?: 'term_1' | 'term_2' | 'term_3';
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
