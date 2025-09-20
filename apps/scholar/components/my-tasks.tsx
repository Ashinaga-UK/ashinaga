'use client';

import { AlertCircle, Calendar, CheckCircle, Circle, Clock, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Task } from '../lib/api/tasks';
import { completeTask, getMyTasks, updateTaskStatus } from '../lib/api/tasks';
import { TaskCompletionDialog } from './task-completion-dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyTasks();
      setTasks(data);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (
    taskId: string,
    newStatus: 'pending' | 'in_progress' | 'completed'
  ) => {
    // If marking as completed, open the completion dialog
    if (newStatus === 'completed') {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setShowCompletionDialog(true);
      }
      return;
    }

    // Otherwise, just update the status
    try {
      await updateTaskStatus(taskId, newStatus);
      // Update the local state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: newStatus,
                completedAt: null,
              }
            : task
        )
      );
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const handleTaskComplete = async (
    taskId: string,
    responseText: string,
    attachmentData: any[]
  ) => {
    try {
      await completeTask(taskId, responseText, attachmentData);
      // Update the local state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: 'completed' as const,
                completedAt: new Date().toISOString(),
              }
            : task
        )
      );
      setShowCompletionDialog(false);
      setSelectedTask(null);
    } catch (err) {
      console.error('Error completing task:', err);
      throw err;
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'dueDate') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700',
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[priority as keyof typeof colors]}`}
      >
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const getTaskTypeBadge = (type: string) => {
    const displayText = type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
        {displayText}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if overdue
    const isOverdue = date < today && date.toDateString() !== today.toDateString();

    // Check if due today
    if (date.toDateString() === today.toDateString()) {
      return <span className="text-orange-600 font-medium">Due Today</span>;
    }

    // Check if due tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return <span className="text-blue-600 font-medium">Due Tomorrow</span>;
    }

    // Check if overdue
    if (isOverdue) {
      return <span className="text-red-600 font-medium">Overdue: {date.toLocaleDateString()}</span>;
    }

    return <span>{date.toLocaleDateString()}</span>;
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const overdue = tasks.filter((t) => {
      const dueDate = new Date(t.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today && t.status !== 'completed';
    }).length;

    return { total, completed, inProgress, pending, overdue };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ashinaga-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">{error}</p>
          <Button onClick={loadTasks} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const stats = getTaskStats();

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Tasks</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl text-gray-600">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.completed}</CardTitle>
            </CardHeader>
          </Card>
          {stats.overdue > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardDescription>Overdue</CardDescription>
                <CardTitle className="text-2xl text-red-600">{stats.overdue}</CardTitle>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Filters and Sort */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>My Tasks</CardTitle>
              <div className="flex gap-2">
                <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sortedTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No tasks found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedTasks.map((task) => (
                  <Card key={task.id} className={task.status === 'completed' ? 'opacity-75' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <h3
                              className={`text-lg font-semibold ${task.status === 'completed' ? 'line-through' : ''}`}
                            >
                              {task.title}
                            </h3>
                          </div>
                          {task.description && (
                            <p className="text-gray-600 text-sm">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 items-center text-sm">
                            {getPriorityBadge(task.priority)}
                            {getTaskTypeBadge(task.type)}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              {formatDate(task.dueDate)}
                            </div>
                            {task.assignedByName && (
                              <span className="text-gray-500">
                                Assigned by: {task.assignedByName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(task.id, 'completed')}
                              className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleStatusChange(task.id, value as any)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Completion Dialog */}
      {selectedTask && (
        <TaskCompletionDialog
          task={selectedTask}
          open={showCompletionDialog}
          onOpenChange={setShowCompletionDialog}
          onComplete={handleTaskComplete}
        />
      )}
    </>
  );
}
