'use client';

import { Plus, Send } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { type CreateTaskData, createBulkTasks, getScholars } from '../lib/api-client';
import { evidenceDefaultsForType } from '../lib/task-evidence';
import { TaskEvidenceFields } from './task-evidence-fields';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
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

interface Scholar {
  id: string;
  name: string;
  year: string;
  program: string;
  university: string;
  status: string;
}

interface BulkTaskAssignmentProps {
  trigger?: React.ReactNode;
  selectedScholarIds?: string[];
  filteredScholars?: Scholar[];
  assignToProgramStage?: 'prep_year';
  onSuccess?: () => void;
}

type TaskType = CreateTaskData['type'];
type Priority = 'high' | 'medium' | 'low';

export function BulkTaskAssignment({
  trigger,
  selectedScholarIds,
  filteredScholars,
  assignToProgramStage,
  onSuccess,
}: BulkTaskAssignmentProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [taskType, setTaskType] = useState<TaskType>('other');
  const otherDefaults = evidenceDefaultsForType('other');
  const [phase, setPhase] = useState('');
  const [requiresResponse, setRequiresResponse] = useState(otherDefaults.requiresResponse);
  const [requiresAttachment, setRequiresAttachment] = useState(otherDefaults.requiresAttachment);
  const [requiresLink, setRequiresLink] = useState(otherDefaults.requiresLink);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cohortCount, setCohortCount] = useState<number | null>(null);

  const resolvedScholarIds: string[] =
    selectedScholarIds && selectedScholarIds.length > 0
      ? selectedScholarIds
      : (filteredScholars?.map((s) => s.id) ?? []);
  const isPrepCohort = assignToProgramStage === 'prep_year';
  const targetCount = isPrepCohort ? (cohortCount ?? 0) : resolvedScholarIds.length;

  useEffect(() => {
    if (!open || !isPrepCohort) return;
    let cancelled = false;
    void getScholars({ programStage: 'prep_year', status: 'active', limit: 1 })
      .then((response) => {
        if (!cancelled) setCohortCount(response.pagination.totalItems);
      })
      .catch(() => {
        if (!cancelled) setCohortCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isPrepCohort]);

  const resetForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setDueDate('');
    setPriority('medium');
    setTaskType('other');
    setPhase('');
    const resetDefaults = evidenceDefaultsForType('other');
    setRequiresResponse(resetDefaults.requiresResponse);
    setRequiresAttachment(resetDefaults.requiresAttachment);
    setRequiresLink(resetDefaults.requiresLink);
  };

  const handleSubmit = async () => {
    if (!isPrepCohort && targetCount === 0) {
      toast({
        title: 'No scholars selected',
        description: 'Select at least one scholar before assigning a task.',
        variant: 'destructive',
      });
      return;
    }
    if (!taskTitle.trim() || !taskDescription.trim() || !dueDate) {
      toast({
        title: 'Missing information',
        description: 'Title, description, and due date are required.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createBulkTasks({
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        type: taskType,
        priority,
        dueDate,
        phase: phase.trim() || undefined,
        requiresResponse,
        requiresAttachment,
        requiresLink,
        ...(isPrepCohort
          ? { programStage: 'prep_year' as const }
          : { scholarIds: resolvedScholarIds }),
      });
      toast({
        title: 'Tasks assigned',
        description: `${result.created} task${result.created === 1 ? '' : 's'} created.`,
      });
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Failed to assign tasks',
        description: msg.replace(/^API Error:\s*\d+\s*-\s*/, ''),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Bulk Assign Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isPrepCohort ? 'Assign Task to Prep Year cohort' : 'Assign Task to Multiple Scholars'}
          </DialogTitle>
          <DialogDescription>
            {isPrepCohort
              ? 'Create and assign the same task to all active Prep Year candidates.'
              : `Create and assign the same task to ${targetCount} ${
                  selectedScholarIds && selectedScholarIds.length > 0
                    ? 'selected scholars'
                    : 'filtered scholars'
                }.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Target</CardTitle>
              <CardDescription>
                {isPrepCohort
                  ? 'This task will be assigned to every active Prep Year candidate.'
                  : `This task will be assigned to ${targetCount} scholar${targetCount === 1 ? '' : 's'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {isPrepCohort && cohortCount == null
                    ? 'Prep Year cohort'
                    : `${targetCount} ${isPrepCohort ? 'Candidate' : 'Scholar'}${targetCount === 1 ? '' : 's'}`}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {isPrepCohort
                    ? 'All active candidates with programStage = prep_year'
                    : selectedScholarIds && selectedScholarIds.length > 0
                      ? 'Selected from table'
                      : 'All currently filtered scholars'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Task Details */}
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
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
                  onValueChange={(v) => {
                    const nextType = v as TaskType;
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
              <div className="flex h-full min-h-0 flex-col space-y-2 md:row-span-2">
                <Label htmlFor="taskDescription">Task Description *</Label>
                <Textarea
                  id="taskDescription"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Provide detailed instructions for the scholars"
                  rows={3}
                  className="h-24 flex-1 resize-none overflow-y-auto md:h-0 md:min-h-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              (!isPrepCohort && targetCount === 0) ||
              !taskTitle ||
              !taskDescription ||
              !dueDate ||
              isSubmitting
            }
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting
              ? 'Assigning...'
              : isPrepCohort
                ? 'Assign to Prep Year cohort'
                : `Assign to ${targetCount} Scholar${targetCount === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
