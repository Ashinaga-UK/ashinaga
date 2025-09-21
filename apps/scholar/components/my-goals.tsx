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
import { CreateGoalDialog } from './create-goal-dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';

export function MyGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProgress, setEditingProgress] = useState<string | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(0);

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

  const handleProgressUpdate = async (goalId: string, newProgress: number) => {
    try {
      const status =
        newProgress === 100 ? 'completed' : newProgress > 0 ? 'in_progress' : 'pending';
      await updateGoal(goalId, { progress: newProgress, status });
      await loadGoals();
      setEditingProgress(null);
    } catch (error) {
      console.error('Failed to update goal progress:', error);
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
      case 'academic':
        return '🎓';
      case 'career':
        return '💼';
      case 'leadership':
        return '👥';
      case 'personal':
        return '🌟';
      case 'community':
        return '🤝';
      default:
        return '📌';
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
          <p className="mt-4 text-gray-600">Loading goals...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">My Goals</h1>
            <p className="text-gray-600 mt-1">Track and manage your personal development goals</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Goals</p>
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
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="career">Career</SelectItem>
              <SelectItem value="leadership">Leadership</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="community">Community</SelectItem>
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
                      ? "You haven't set any goals yet"
                      : 'No goals found with the selected filters'}
                  </p>
                  {filter === 'all' && categoryFilter === 'all' && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Goal
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
                            <span className="capitalize">{goal.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Target: {new Date(goal.targetDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {goal.description && (
                        <p className="text-gray-600 mt-2 mb-4">{goal.description}</p>
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

                  {/* Progress Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium">{goal.progress}%</span>
                    </div>
                    {editingProgress === goal.id ? (
                      <div className="space-y-2">
                        <Slider
                          value={[tempProgress]}
                          onValueChange={(value) => setTempProgress(value[0] || 0)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleProgressUpdate(goal.id, tempProgress)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingProgress(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setEditingProgress(goal.id);
                          setTempProgress(goal.progress);
                        }}
                      >
                        <Progress value={goal.progress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">Click to update progress</p>
                      </div>
                    )}
                  </div>

                  {goal.completedAt && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-green-600">
                        ✅ Completed on {new Date(goal.completedAt).toLocaleDateString()}
                      </p>
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
