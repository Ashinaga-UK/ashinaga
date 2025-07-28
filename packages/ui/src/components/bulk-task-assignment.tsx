'use client';

import type React from 'react';

import { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Plus, Send } from 'lucide-react';

interface BulkTaskAssignmentProps {
  trigger?: React.ReactNode;
  selectedStudentIds?: string[];
  filteredStudents?: any[];
}

export function BulkTaskAssignment({
  trigger,
  selectedStudentIds,
  filteredStudents,
}: BulkTaskAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('');
  const [taskType, setTaskType] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const targetCount = selectedStudentIds
      ? selectedStudentIds.length
      : filteredStudents?.length || 0;
    console.log('Bulk task assigned:', {
      selectedStudentIds,
      filteredStudents: filteredStudents?.map((s) => s.id),
      title: taskTitle,
      description: taskDescription,
      dueDate,
      priority,
      type: taskType,
      targetGroup,
      targetCount,
    });

    setOpen(false);
    setIsSubmitting(false);
    // Reset form
    setTaskTitle('');
    setTaskDescription('');
    setDueDate('');
    setPriority('');
    setTaskType('');
    setTargetGroup('');
  };

  const getTargetCount = () => {
    if (selectedStudentIds) return selectedStudentIds.length;
    if (filteredStudents) return filteredStudents.length;
    return 0;
  };

  const getTargetDescription = () => {
    if (selectedStudentIds) return 'selected students';
    if (filteredStudents) return 'filtered students';
    return 'students';
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
          <DialogTitle>Assign Task to Multiple Students</DialogTitle>
          <DialogDescription>
            Create and assign a task to {getTargetCount()} {getTargetDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Target</CardTitle>
              <CardDescription>
                This task will be assigned to {getTargetCount()} students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {getTargetCount()} Students
                </Badge>
                <span className="text-sm text-gray-600">
                  {selectedStudentIds ? 'Selected from table' : 'All currently filtered students'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Task Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <Label htmlFor="taskType">Task Type</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document-upload">Document Upload</SelectItem>
                    <SelectItem value="form-completion">Form Completion</SelectItem>
                    <SelectItem value="meeting-attendance">Meeting Attendance</SelectItem>
                    <SelectItem value="goal-update">Goal Update</SelectItem>
                    <SelectItem value="feedback-submission">Feedback Submission</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
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
                  placeholder="Provide detailed instructions for the students"
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
            disabled={!taskTitle || !taskDescription || isSubmitting}
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Assigning...' : `Assign to ${getTargetCount()} Students`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
