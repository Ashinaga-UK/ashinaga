'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  ListTodo,
  Loader2,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import type { Task } from '../lib/api/tasks';
import { completeTask, getMyTasks, updateTaskStatus } from '../lib/api/tasks';
import { groupPrepYearTasks } from '../lib/group-prep-tasks';
import { useScholarSession } from '../lib/scholar-session';
import { isTaskDueToday, isTaskOverdue } from '../lib/task-due';
import { TaskCompletionDialog } from './task-completion-dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from './ui/use-toast';

export function MyTasks() {
  const { programStage, profileStatus } = useScholarSession();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>(
    'all'
  );
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

  const openCompleteDialog = (task: Task) => {
    setSelectedTask(task);
    setShowCompletionDialog(true);
  };

  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in_progress') => {
    try {
      await updateTaskStatus(taskId, newStatus);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: newStatus,
                completedAt: null,
                overdue: isTaskOverdue({ ...task, status: newStatus, overdue: undefined }),
              }
            : task
        )
      );
    } catch (err) {
      console.error('Error updating task status:', err);
      toast({
        title: 'Could not update task',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTaskComplete = async (
    taskId: string,
    payload: { responseText?: string; attachmentIds?: unknown[]; linkUrl?: string }
  ) => {
    try {
      await completeTask(taskId, payload);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: 'completed' as const,
                completedAt: new Date().toISOString(),
                overdue: false,
              }
            : task
        )
      );
      setShowCompletionDialog(false);
      setSelectedTask(null);
    } catch (err) {
      console.error('Error completing task:', err);
      toast({
        title: 'Could not complete task',
        description: 'Please try again.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return isTaskOverdue(task);
    return task.status === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'dueDate') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const labels = { high: 'High', medium: 'Medium', low: 'Low' } as const;
    return (
      <Badge variant={priority === 'high' ? 'destructive' : 'secondary'}>
        {labels[priority as keyof typeof labels] ?? priority}
      </Badge>
    );
  };

  const getTaskTypeBadge = (type: string) => {
    const displayText = type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return <Badge variant="outline">{displayText}</Badge>;
  };

  const formatDate = (task: Task) => {
    const date = new Date(task.dueDate);

    if (isTaskOverdue(task)) {
      return (
        <span className="font-medium text-destructive">Overdue: {date.toLocaleDateString()}</span>
      );
    }

    if (isTaskDueToday(task)) {
      return <span className="font-medium text-orange-600 dark:text-orange-400">Due Today</span>;
    }

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const dueDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const tomorrowDay = Date.UTC(
      tomorrow.getUTCFullYear(),
      tomorrow.getUTCMonth(),
      tomorrow.getUTCDate()
    );
    if (dueDay === tomorrowDay) {
      return <span className="font-medium text-blue-600 dark:text-blue-400">Due Tomorrow</span>;
    }

    return <span className="text-muted-foreground">{date.toLocaleDateString()}</span>;
  };

  const renderTaskCard = (task: Task) => (
    <div
      key={task.id}
      className={`rounded-lg border border-ashinaga-teal-100 bg-card p-4 dark:border-border ${task.status === 'completed' ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(task.status)}
            <h3
              className={`text-lg font-semibold text-foreground ${task.status === 'completed' ? 'line-through' : ''}`}
            >
              {task.title}
            </h3>
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {getPriorityBadge(task.priority)}
            {getTaskTypeBadge(task.type)}
            {task.phase && <Badge variant="secondary">{task.phase}</Badge>}
            {isTaskOverdue(task) && <Badge variant="destructive">Overdue</Badge>}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDate(task)}
            </div>
            {task.assignedByName && (
              <span className="text-muted-foreground">Assigned by: {task.assignedByName}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {task.status !== 'completed' && (
            <Button size="sm" variant="outline" onClick={() => openCompleteDialog(task)}>
              <CheckCircle className="mr-1 h-4 w-4" />
              Complete
            </Button>
          )}
          {task.status !== 'completed' && (
            <Select
              value={task.status}
              onValueChange={(value) =>
                handleStatusChange(task.id, value as 'pending' | 'in_progress')
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading || profileStatus === 'loading') {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading tasks...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="text-foreground">{error}</p>
          <Button onClick={loadTasks} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isPrepYear = programStage === 'prep_year';
  const grouped = isPrepYear ? groupPrepYearTasks(tasks) : null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="hidden text-2xl font-bold text-foreground md:block">My Tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPrepYear
                ? 'Due now, upcoming, and completed work for Prep Year.'
                : 'Track and complete the work assigned to you.'}
            </p>
          </div>
          {!isPrepYear && (
            <div className="flex flex-wrap gap-2">
              <Select value={filter} onValueChange={(value: typeof filter) => setFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isPrepYear && grouped ? (
          <>
            <TaskGroupSection
              title="Due now"
              emptyLabel="Nothing due right now"
              tasks={grouped.dueNow}
              renderTask={renderTaskCard}
            />
            <TaskGroupSection
              title="Upcoming"
              emptyLabel="No upcoming tasks"
              tasks={grouped.upcoming}
              renderTask={renderTaskCard}
            />
            <TaskGroupSection
              title="Completed"
              emptyLabel="No completed tasks yet"
              tasks={grouped.completed}
              renderTask={renderTaskCard}
            />
          </>
        ) : sortedTasks.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-ashinaga-teal-100 bg-card/40 px-4 text-center dark:border-border">
            <ListTodo className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No tasks found</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Tasks assigned to you will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">{sortedTasks.map(renderTaskCard)}</div>
        )}
      </div>

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

function TaskGroupSection({
  title,
  emptyLabel,
  tasks,
  renderTask,
}: {
  title: string;
  emptyLabel: string;
  tasks: Task[];
  renderTask: (task: Task) => ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        {title}{' '}
        <span className="text-base font-normal text-muted-foreground">({tasks.length})</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">{tasks.map(renderTask)}</div>
      )}
    </section>
  );
}
