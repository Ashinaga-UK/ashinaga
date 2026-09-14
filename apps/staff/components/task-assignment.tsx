'use client';

import { Plus } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  type CreateTaskData,
  createBulkTasks,
  getAllActiveScholars,
  getTaskTitleSuggestions,
  type Scholar,
  type TaskTitleSuggestion,
  type UpdateTaskData,
} from '../lib/api-client';
import { useCreateTask, useUpdateTask } from '../lib/hooks/use-queries';
import { evidenceDefaultsForType } from '../lib/task-evidence';
import { TaskEvidenceFields } from './task-evidence-fields';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
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
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover';
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
  phase?: string | null;
  requiresResponse?: boolean;
  requiresAttachment?: boolean;
  requiresLink?: boolean;
}

interface TaskAssignmentProps {
  trigger?: React.ReactNode;
  preselectedScholarId?: string;
  onSuccess?: (scholarIds: string[]) => void;
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
  const [selectedScholarIds, setSelectedScholarIds] = useState<string[]>(
    preselectedScholarId ? [preselectedScholarId] : []
  );
  const [scholarSearch, setScholarSearch] = useState('');
  const [isAssigningMany, setIsAssigningMany] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskType, setTaskType] = useState<CreateTaskData['type']>('other');
  const otherDefaults = evidenceDefaultsForType('other');
  const [phase, setPhase] = useState('');
  const [requiresResponse, setRequiresResponse] = useState(otherDefaults.requiresResponse);
  const [requiresAttachment, setRequiresAttachment] = useState(otherDefaults.requiresAttachment);
  const [requiresLink, setRequiresLink] = useState(otherDefaults.requiresLink);
  const [suggestions, setSuggestions] = useState<TaskTitleSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize form with existing task data if in edit mode
  useEffect(() => {
    if (existingTask && mode === 'edit') {
      setTaskTitle(existingTask.title);
      setTaskDescription(existingTask.description ?? '');
      setTaskType(existingTask.type);
      setPriority(existingTask.priority);
      setPhase(existingTask.phase ?? '');
      const defaults = evidenceDefaultsForType(existingTask.type);
      setRequiresResponse(existingTask.requiresResponse ?? defaults.requiresResponse);
      setRequiresAttachment(existingTask.requiresAttachment ?? defaults.requiresAttachment);
      setRequiresLink(existingTask.requiresLink ?? defaults.requiresLink);
      // Format date for input field (YYYY-MM-DD)
      const date = new Date(existingTask.dueDate);
      const formattedDate = date.toISOString().split('T')[0];
      setDueDate(formattedDate || '');
    }
  }, [existingTask, mode]);

  useEffect(() => {
    if (preselectedScholarId) {
      setSelectedScholarIds([preselectedScholarId]);
    }
  }, [preselectedScholarId]);

  // Fetch scholars when the picker dialog opens
  useEffect(() => {
    if (open && !preselectedScholarId) {
      fetchScholars();
    }
  }, [open, preselectedScholarId]);

  // Debounced fetch of title suggestions when typing
  useEffect(() => {
    if (!open || mode === 'edit') return;
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(async () => {
      try {
        const rows = await getTaskTitleSuggestions(taskTitle, 8);
        setSuggestions(rows);
      } catch (err) {
        console.error('Failed to load task title suggestions:', err);
        setSuggestions([]);
      }
    }, 200);
    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [taskTitle, open, mode]);

  const applySuggestion = (s: TaskTitleSuggestion) => {
    setTaskTitle(s.title);
    if (s.description) setTaskDescription(s.description);
    setTaskType(s.type);
    setPriority(s.priority);
    setPhase(s.phase ?? '');
    const defaults = evidenceDefaultsForType(s.type);
    setRequiresResponse(s.requiresResponse ?? defaults.requiresResponse);
    setRequiresAttachment(s.requiresAttachment ?? defaults.requiresAttachment);
    setRequiresLink(s.requiresLink ?? defaults.requiresLink);
    setSuggestionsOpen(false);
  };

  const fetchScholars = async () => {
    setLoadingScholars(true);
    try {
      const data = await getAllActiveScholars();
      setScholars(data);
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

  const canPickScholars = !preselectedScholarId && mode !== 'edit';
  const visibleScholars = scholars.filter((scholar) => {
    const query = scholarSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      scholar.name.toLowerCase().includes(query) ||
      scholar.email.toLowerCase().includes(query) ||
      scholar.program.toLowerCase().includes(query)
    );
  });
  const selectedScholars = scholars.filter((scholar) => selectedScholarIds.includes(scholar.id));
  const selectedScholar = preselectedScholarId
    ? (scholars.find((s) => s.id === preselectedScholarId) ?? selectedScholars[0])
    : selectedScholars[0];

  const toggleScholar = (scholarId: string, checked: boolean) => {
    setSelectedScholarIds((current) => {
      if (checked) {
        return current.includes(scholarId) ? current : [...current, scholarId];
      }
      return current.filter((id) => id !== scholarId);
    });
  };

  const toggleAllScholars = (checked: boolean) => {
    setSelectedScholarIds(checked ? scholars.map((scholar) => scholar.id) : []);
  };

  const resetCreateForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setDueDate('');
    setPriority('medium');
    setTaskType('other');
    setPhase('');
    setScholarSearch('');
    const resetDefaults = evidenceDefaultsForType('other');
    setRequiresResponse(resetDefaults.requiresResponse);
    setRequiresAttachment(resetDefaults.requiresAttachment);
    setRequiresLink(resetDefaults.requiresLink);
    if (!preselectedScholarId) {
      setSelectedScholarIds([]);
    }
  };

  const handleSubmit = async () => {
    if (selectedScholarIds.length === 0 || !taskTitle || !dueDate || !taskType) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const sharedTask = {
      title: taskTitle,
      description: taskDescription || undefined,
      type: taskType,
      priority: priority || 'medium',
      dueDate,
      phase: phase.trim() || undefined,
      requiresResponse,
      requiresAttachment,
      requiresLink,
    };

    if (mode === 'edit' && existingTask) {
      const updateData: UpdateTaskData = {
        title: taskTitle,
        description: taskDescription || undefined,
        type: taskType,
        priority: priority,
        dueDate,
        phase: phase.trim() || null,
        requiresResponse,
        requiresAttachment,
        requiresLink,
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
              onSuccess([preselectedScholarId]);
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
    } else if (selectedScholarIds.length === 1 && selectedScholarIds[0]) {
      createTaskMutation.mutate(
        { ...sharedTask, scholarId: selectedScholarIds[0] },
        {
          onSuccess: () => {
            toast({
              title: 'Success',
              description: 'Task has been assigned successfully.',
            });
            if (onSuccess && mode === 'create') {
              onSuccess(selectedScholarIds);
            }
            resetCreateForm();
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
        }
      );
    } else {
      setIsAssigningMany(true);
      void createBulkTasks({
        ...sharedTask,
        scholarIds: selectedScholarIds,
      })
        .then((result) => {
          toast({
            title: 'Tasks assigned',
            description: `${result.created} task${result.created === 1 ? '' : 's'} created.`,
          });
          if (onSuccess && mode === 'create') {
            onSuccess(selectedScholarIds);
          }
          resetCreateForm();
          setOpen(false);
        })
        .catch((error) => {
          console.error('Error creating tasks:', error);
          toast({
            title: 'Error',
            description: 'Failed to assign task. Please try again.',
            variant: 'destructive',
          });
        })
        .finally(() => {
          setIsAssigningMany(false);
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
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden data-[state=open]:flex">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit'
              ? 'Edit Task'
              : canPickScholars
                ? 'Assign Task'
                : 'Assign Task to Scholar'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the task details'
              : canPickScholars
                ? 'Choose one or more people. Prep Year candidates and enrolled scholars can both receive this task.'
                : 'Create and assign a new task to this scholar'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
          {canPickScholars && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="scholarSearch">Select scholars *</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedScholarIds.length} selected
                </p>
              </div>
              <Input
                id="scholarSearch"
                value={scholarSearch}
                onChange={(e) => setScholarSearch(e.target.value)}
                placeholder="Search by name, email, or program"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm font-medium text-ashinaga-teal-700 hover:underline"
                  onClick={() =>
                    toggleAllScholars(
                      !scholars.every((scholar) => selectedScholarIds.includes(scholar.id))
                    )
                  }
                  disabled={loadingScholars || scholars.length === 0}
                >
                  {scholars.length > 0 &&
                  scholars.every((scholar) => selectedScholarIds.includes(scholar.id))
                    ? 'Clear all'
                    : 'Select all'}
                </button>
                {loadingScholars ? (
                  <span className="text-sm text-muted-foreground">Loading scholars…</span>
                ) : null}
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {visibleScholars.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {loadingScholars ? 'Loading scholars…' : 'No matching scholars.'}
                  </p>
                ) : (
                  visibleScholars.map((scholar) => {
                    const checked = selectedScholarIds.includes(scholar.id);
                    const checkboxId = `assign-scholar-${scholar.id}`;
                    return (
                      <label
                        key={scholar.id}
                        htmlFor={checkboxId}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={checked}
                          onCheckedChange={(value) => toggleScholar(scholar.id, value === true)}
                          aria-label={`Select ${scholar.name}`}
                        />
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={scholar.image || '/placeholder.svg'} />
                          <AvatarFallback>
                            {scholar.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{scholar.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {scholar.program} • {scholar.year}
                          </p>
                        </div>
                        <Badge
                          variant={scholar.programStage === 'prep_year' ? 'default' : 'secondary'}
                        >
                          {scholar.programStage === 'prep_year' ? 'Candidate' : 'Scholar'}
                        </Badge>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {!canPickScholars && selectedScholar && (
            <div className="rounded-lg bg-muted p-4">
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
                  <p className="text-sm text-muted-foreground">
                    {selectedScholar.program} • {selectedScholar.year}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task Title *</Label>
              <Popover
                modal
                open={mode !== 'edit' && suggestionsOpen && suggestions.length > 0}
                onOpenChange={(nextOpen) => {
                  if (mode === 'edit') return;
                  setSuggestionsOpen(nextOpen);
                }}
              >
                <PopoverAnchor asChild>
                  <Input
                    id="taskTitle"
                    ref={titleInputRef}
                    type="text"
                    value={taskTitle}
                    onChange={(e) => {
                      setTaskTitle(e.target.value);
                      setSuggestionsOpen(true);
                    }}
                    onFocus={() => setSuggestionsOpen(true)}
                    placeholder="Enter task title"
                    autoComplete="off"
                  />
                </PopoverAnchor>
                <PopoverContent
                  align="start"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  onCloseAutoFocus={(event) => event.preventDefault()}
                  className="w-[var(--radix-popover-trigger-width,var(--radix-popper-anchor-width))] max-h-60 overflow-y-auto p-0"
                >
                  <ul>
                    {suggestions.map((s) => (
                      <li key={s.title}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            applySuggestion(s);
                          }}
                        >
                          <div className="truncate text-sm font-medium">{s.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.type.replace('_', ' ')} • {s.priority} • used {s.useCount}×
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskType">Task Type</Label>
              <Select
                value={taskType}
                onValueChange={(value) => {
                  const nextType = value as CreateTaskData['type'];
                  setTaskType(nextType);
                  const defaults = evidenceDefaultsForType(nextType);
                  setRequiresResponse(defaults.requiresResponse);
                  setRequiresAttachment(defaults.requiresAttachment);
                  setRequiresLink(defaults.requiresLink);
                }}
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
            <div className="space-y-2">
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="taskDescription">Task Description *</Label>
              <Textarea
                id="taskDescription"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Provide detailed instructions for the student"
                rows={4}
                className="min-h-24 resize-none overflow-y-auto"
              />
            </div>
          </div>

          <TaskEvidenceFields
            phase={phase}
            onPhaseChange={setPhase}
            requiresResponse={requiresResponse}
            requiresAttachment={requiresAttachment}
            requiresLink={requiresLink}
            onRequiresResponseChange={setRequiresResponse}
            onRequiresAttachmentChange={setRequiresAttachment}
            onRequiresLinkChange={setRequiresLink}
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              selectedScholarIds.length === 0 ||
              !taskTitle ||
              !taskDescription ||
              !dueDate ||
              isAssigningMany ||
              createTaskMutation.isPending ||
              updateTaskMutation.isPending
            }
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            {isAssigningMany || createTaskMutation.isPending || updateTaskMutation.isPending
              ? mode === 'edit'
                ? 'Updating...'
                : 'Assigning...'
              : mode === 'edit'
                ? 'Update Task'
                : selectedScholarIds.length > 1
                  ? `Assign to ${selectedScholarIds.length} scholars`
                  : 'Assign Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
