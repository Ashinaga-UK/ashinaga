'use client';

import {
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { deleteGoal, getMyGoals, type Goal, updateGoal } from '../lib/api/goals';
import { useSession } from '../lib/auth-client';
import { CommentThread } from './comment-thread';
import { CreateGoalDialog } from './create-goal-dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Textarea } from './ui/textarea';

export function MyGoals() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCompletion, setEditingCompletion] = useState<string | null>(null);
  const [tempCompletion, setTempCompletion] = useState<number>(1);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [tempReview, setTempReview] = useState<string>('');

  const loadGoals = async () => {
    try {
      const data = await getMyGoals();
      setGoals(data);
      setFilteredGoals(data);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    let filtered = [...goals];

    if (filter !== 'all') {
      filtered = filtered.filter((goal) => goal.status === filter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((goal) => goal.category === categoryFilter);
    }

    setFilteredGoals(filtered);
  }, [goals, filter, categoryFilter]);

  const handleCompletionUpdate = async (goalId: string, newCompletion: number) => {
    try {
      const status =
        newCompletion === 10 ? 'completed' : newCompletion > 1 ? 'in_progress' : 'pending';
      await updateGoal(goalId, { completionScale: newCompletion, status });
      await loadGoals();
      setEditingCompletion(null);
    } catch (error) {
      console.error('Failed to update goal completion:', error);
    }
  };

  const handleReviewUpdate = async (goalId: string, reviewNotes: string) => {
    try {
      await updateGoal(goalId, { reviewNotes });
      await loadGoals();
      setEditingReview(null);
    } catch (error) {
      console.error('Failed to update review notes:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
        await loadGoals();
      } catch (error) {
        console.error('Failed to delete goal:', error);
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'academic_development':
        return '🎓';
      case 'personal_development':
        return '🌟';
      case 'professional_development':
        return '💼';
      default:
        return '📌';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'academic_development':
        return 'Academic Development';
      case 'personal_development':
        return 'Personal Development';
      case 'professional_development':
        return 'Professional Development';
      default:
        return category;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Target className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ashinaga-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading LDF...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: goals.length,
    completed: goals.filter((g) => g.status === 'completed').length,
    inProgress: goals.filter((g) => g.status === 'in_progress').length,
    pending: goals.filter((g) => g.status === 'pending').length,
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My LDF</h1>
            <p className="text-gray-600 mt-1">
              Track and manage your Learning Development Framework
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New LDF Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total LDF Items</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Target className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold">
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-ashinaga-teal-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filter by:</span>
          </div>
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="academic_development">Academic Development</SelectItem>
              <SelectItem value="personal_development">Personal Development</SelectItem>
              <SelectItem value="professional_development">Professional Development</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Goals List */}
        <div className="grid gap-4">
          {filteredGoals.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {filter === 'all' && categoryFilter === 'all'
                      ? "You haven't set any LDF items yet"
                      : 'No LDF items found with the selected filters'}
                  </p>
                  {filter === 'all' && categoryFilter === 'all' && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First LDF Item
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredGoals.map((goal) => (
              <Card key={goal.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                        <div>
                          <h3 className="font-semibold text-lg">{goal.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{getCategoryLabel(goal.category)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Target: {new Date(goal.targetDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Related Skills */}
                      {goal.relatedSkills && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs font-semibold text-blue-900 mb-1">
                            Related LDF Skills & Qualities
                          </p>
                          <p className="text-sm text-blue-800">{goal.relatedSkills}</p>
                        </div>
                      )}

                      {/* Action Plan */}
                      {goal.actionPlan && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-xs font-semibold text-green-900 mb-1">Action Plan</p>
                          <p className="text-sm text-green-800">{goal.actionPlan}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(goal.status)}
                      <span className={`text-sm capitalize ${getStatusColor(goal.status)}`}>
                        {goal.status.replace('_', ' ')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Completion Scale Section */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completion Scale</span>
                      <span className="text-sm font-medium">{goal.completionScale}/10</span>
                    </div>
                    {editingCompletion === goal.id ? (
                      <div className="space-y-2">
                        <Slider
                          value={[tempCompletion]}
                          onValueChange={(value) => setTempCompletion(value[0] || 1)}
                          min={1}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCompletionUpdate(goal.id, tempCompletion)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingCompletion(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setEditingCompletion(goal.id);
                          setTempCompletion(goal.completionScale);
                        }}
                      >
                        <Progress value={(goal.completionScale / 10) * 100} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">
                          Click to update completion (1-10 scale)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Review & Self-Reflection Section */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">
                        Goal Review & Self-Reflection
                      </span>
                      {!editingReview && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingReview(goal.id);
                            setTempReview(goal.reviewNotes || '');
                          }}
                        >
                          {goal.reviewNotes ? 'Edit' : 'Add'} Review
                        </Button>
                      )}
                    </div>
                    {editingReview === goal.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={tempReview}
                          onChange={(e) => setTempReview(e.target.value)}
                          placeholder="How is it going? In as much detail as possible, are you on track to meet your deadline?"
                          rows={4}
                          className="w-full"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleReviewUpdate(goal.id, tempReview)}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingReview(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : goal.reviewNotes ? (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-900">{goal.reviewNotes}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        No review notes yet. Click "Add Review" to reflect on your progress.
                      </p>
                    )}
                  </div>

                  {goal.completedAt && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-green-600">
                        ✅ Completed on {new Date(goal.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Comment Thread */}
                  {session?.user?.id && (
                    <div className="mt-4">
                      <CommentThread goalId={goal.id} currentUserId={session.user.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create Goal Dialog */}
      {showCreateDialog && (
        <CreateGoalDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={loadGoals}
        />
      )}
    </>
  );
}
