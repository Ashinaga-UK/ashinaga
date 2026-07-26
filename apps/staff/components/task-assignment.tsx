'use client';

import { Plus } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  type CreateTaskData,
  getScholars,
  getTaskSuggestions,
  type Scholar,
  type TaskSuggestion,
  type UpdateTaskData,
} from '../lib/api-client';
import { useCreateTask, useUpdateTask } from '../lib/hooks/use-queries';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

interface ExistingTask {
  id: string;
  title: string;
  description?: string | null;
  type: CreateTaskData['type'];
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: string;
}

interface TaskAssignmentProps {
  trigger?: React.ReactNode;
  preselectedScholarId?: string;
  onSuccess?: (scholarId: string) => void;
  existingTask?: ExistingTask;
  mode?: 'create' | 'edit';
}

export function TaskAssignment({
  trigger,
  preselectedScholarId,
  onSuccess,
  existingTask,
  mode = 'create',
}: TaskAssignmentProps) {
  const { toast } = useToast();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const [open, setOpen] = useState(false);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loadingScholars, setLoadingScholars] = useState(false);
  const [selectedScholarId, setSelectedScholarId] = useState(preselectedScholarId || '');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskType, setTaskType] = useState<CreateTaskData['type']>('other');
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize form with existing task data if in edit mode
  useEffect(() => {
    if (existingTask && mode === 'edit') {
      setTaskTitle(existingTask.title);
      setTaskDescription(existingTask.description ?? '');
      setTaskType(existingTask.type);
      setPriority(existingTask.priority);
      // Format date for input field (YYYY-MM-DD)
      const date = new Date(existingTask.dueDate);
      const formattedDate = date.toISOString().split('T')[0];
      setDueDate(formattedDate || '');
    }
  }, [existingTask, mode]);

  const fetchSuggestions = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const results = await getTaskSuggestions(trimmed, 10);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch task suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTaskTitle(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSuggestionClick = (title: string) => {
    setTaskTitle(title);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const fetchScholars = async () => {
    setLoadingScholars(true);
    try {
      const response = await getScholars({ limit: 100, status: 'active' });
      setScholars(response.data);
    } catch (error) {
      console.error('Error fetching scholars:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scholars. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingScholars(false);
    }
  };

  // Fetch scholars when dialog opens
  useEffect(() => {
    if (open && !preselectedScholarId) {
      fetchScholars();
    }
  }, [open, preselectedScholarId, fetchScholars]);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedScholar = scholars.find((s) => s.id === selectedScholarId);

  const handleSubmit = async () => {
    if (!selectedScholarId || !taskTitle || !dueDate || !taskType) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const taskData: CreateTaskData = {
      title: taskTitle,
      description: taskDescription || undefined,
      type: taskType,
      priority: priority || 'medium',
      dueDate,
      scholarId: selectedScholarId,
    };

    if (mode === 'edit' && existingTask) {
      const updateData: UpdateTaskData = {
        title: taskTitle,
        description: taskDescription || undefined,
        type: taskType,
        priority: priority,
        dueDate,
      };

      updateTaskMutation.mutate(
        { taskId: existingTask.id, data: updateData },
        {
          onSuccess: () => {
            toast({
              title: 'Success',
              description: 'Task has been updated successfully.',
            });

            // Call onSuccess callback after successful update
            if (onSuccess && preselectedScholarId) {
              onSuccess(preselectedScholarId);
            }

            setOpen(false);
          },
          onError: (error) => {
            console.error('Error updating task:', error);
            toast({
              title: 'Error',
              description: 'Failed to update task. Please try again.',
              variant: 'destructive',
            });
          },
        }
      );
    } else {
      createTaskMutation.mutate(taskData, {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Task has been assigned successfully.',
          });

          // Call onSuccess callback after successful creation
          if (onSuccess && mode === 'create') {
            onSuccess(selectedScholarId);
          }

          // Reset form
          setTaskTitle('');
          setTaskDescription('');
          setDueDate('');
          setPriority('medium');
          setTaskType('other');
          if (!preselectedScholarId) {
            setSelectedScholarId('');
          }
          setOpen(false);
        },
        onError: (error) => {
          console.error('Error creating task:', error);
          toast({
            title: 'Error',
            description: 'Failed to assign task. Please try again.',
            variant: 'destructive',
          });
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Assign Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Task' : 'Assign Task to Student'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the task details'
              : 'Create and assign a new task to a student'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Selection - Hide in edit mode since we can't change the assigned student */}
          {!preselectedScholarId && mode !== 'edit' && (
            <div className="space-y-2">
              <Label>Select Student *</Label>
              <Select value={selectedScholarId} onValueChange={setSelectedScholarId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingScholars ? 'Loading...' : 'Choose a student'} />
                </SelectTrigger>
                <SelectContent>
                  {scholars.map((scholar) => (
                    <SelectItem key={scholar.id} value={scholar.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={scholar.image || '/placeholder.svg'} />
                          <AvatarFallback>
                            {scholar.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{scholar.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {scholar.year}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Student Display */}
          {selectedScholar && (
            <div className="bg-ashinaga-teal-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedScholar.image || '/placeholder.svg'} />
                  <AvatarFallback>
                    {selectedScholar.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{selectedScholar.name}</h4>
                  <p className="text-sm text-gray-600">
                    {selectedScholar.program} • {selectedScholar.year}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Task Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div ref={suggestionsRef} className="relative">
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  value={taskTitle}
                  onChange={handleTitleChange}
                  placeholder="Enter task title"
                  autoComplete="off"
                />
                {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {loadingSuggestions && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                    )}
                    {!loadingSuggestions &&
                      suggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.title}-${index}`}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSuggestionClick(suggestion.title);
                          }}
                        >
                          <div className="font-medium">{suggestion.title}</div>
                          {suggestion.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {suggestion.description}
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="taskType">Task Type</Label>
                <Select
                  value={taskType}
                  onValueChange={(value) => setTaskType(value as CreateTaskData['type'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document_upload">Document Upload</SelectItem>
                    <SelectItem value="form_completion">Form Completion</SelectItem>
                    <SelectItem value="meeting_attendance">Meeting Attendance</SelectItem>
                    <SelectItem value="goal_update">Goal Update</SelectItem>
                    <SelectItem value="feedback_submission">Feedback Submission</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as 'high' | 'medium' | 'low')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="taskDescription">Task Description *</Label>
                <Textarea
                  id="taskDescription"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Provide detailed instructions for the student"
                  rows={6}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedScholarId ||
              !taskTitle ||
              !taskDescription ||
              createTaskMutation.isPending ||
              updateTaskMutation.isPending
            }
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            {createTaskMutation.isPending || updateTaskMutation.isPending
              ? mode === 'edit'
                ? 'Updating...'
                : 'Assigning...'
              : mode === 'edit'
                ? 'Update Task'
                : 'Assign Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
