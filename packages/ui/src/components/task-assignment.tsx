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
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Plus } from 'lucide-react';

interface TaskAssignmentProps {
  trigger?: React.ReactNode;
  preselectedStudentId?: string;
}

// Mock students data
const mockStudents = [
  {
    id: 'SC001',
    name: 'Sarah Chen',
    program: 'Computer Science',
    year: 'Year 2',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: 'MJ002',
    name: 'Marcus Johnson',
    program: 'Medicine',
    year: 'Year 4',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: 'AO003',
    name: 'Amara Okafor',
    program: 'International Relations',
    year: 'Year 1',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: 'DK004',
    name: 'David Kim',
    program: 'Engineering',
    year: 'Year 3',
    avatar: '/placeholder.svg?height=32&width=32',
  },
];

export function TaskAssignment({ trigger, preselectedStudentId }: TaskAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId || '');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('');
  const [taskType, setTaskType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStudent = mockStudents.find((s) => s.id === selectedStudentId);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Task assigned:', {
      studentId: selectedStudentId,
      title: taskTitle,
      description: taskDescription,
      dueDate,
      priority,
      type: taskType,
    });
    setOpen(false);
    setIsSubmitting(false);
    // Reset form
    setTaskTitle('');
    setTaskDescription('');
    setDueDate('');
    setPriority('');
    setTaskType('');
    if (!preselectedStudentId) {
      setSelectedStudentId('');
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
          <DialogTitle>Assign Task to Student</DialogTitle>
          <DialogDescription>Create and assign a new task to a student</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Selection */}
          {!preselectedStudentId && (
            <div className="space-y-2">
              <Label>Select Student *</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {mockStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={student.avatar || '/placeholder.svg'} />
                          <AvatarFallback>
                            {student.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{student.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {student.year}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Student Display */}
          {selectedStudent && (
            <div className="bg-ashinaga-teal-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedStudent.avatar || '/placeholder.svg'} />
                  <AvatarFallback>
                    {selectedStudent.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{selectedStudent.name}</h4>
                  <p className="text-sm text-gray-600">
                    {selectedStudent.program} • {selectedStudent.year}
                  </p>
                </div>
              </div>
            </div>
          )}

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
            disabled={!selectedStudentId || !taskTitle || !taskDescription || isSubmitting}
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            {isSubmitting ? 'Assigning...' : 'Assign Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
