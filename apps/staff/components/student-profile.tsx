'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Plus,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { GoalSetting } from './goal-setting';
import { TaskAssignment } from './task-assignment';

// Mock student data
const mockStudent = {
  id: 'SC001',
  name: 'Sarah Chen',
  email: 'sarah.chen@student.ac.uk',
  phone: '+44 7123 456789',
  program: 'Computer Science',
  year: 'Year 2',
  university: 'Imperial College London',
  location: 'London, UK',
  startDate: 'September 2023',
  status: 'Active',
  avatar: '/placeholder.svg?height=80&width=80',
  bio: 'Passionate about AI and machine learning. Aspiring to develop technology solutions for healthcare in Africa.',
  goals: [
    {
      id: 1,
      title: 'Graduate with First Class Honours',
      description: 'Maintain high academic performance throughout degree',
      progress: 65,
      status: 'in-progress',
      dueDate: 'June 2026',
    },
    {
      id: 2,
      title: 'Complete Summer Internship',
      description: 'Secure and complete internship at tech company',
      progress: 100,
      status: 'completed',
      dueDate: 'August 2024',
    },
    {
      id: 3,
      title: 'Develop Leadership Skills',
      description: 'Take on leadership role in student society',
      progress: 30,
      status: 'in-progress',
      dueDate: 'May 2025',
    },
  ],
  tasks: [
    {
      id: 1,
      title: 'Submit scholarship renewal documents',
      description: 'Upload academic transcripts and personal statement',
      dueDate: '2025-01-15',
      status: 'pending',
      priority: 'high',
    },
    {
      id: 2,
      title: 'Complete leadership development workshop',
      description: 'Attend online workshop and submit reflection',
      dueDate: '2025-01-20',
      status: 'in-progress',
      priority: 'medium',
    },
  ],
  documents: [
    { name: 'Academic Transcript 2024', uploadDate: '2024-12-15', type: 'PDF' },
    { name: 'Personal Statement', uploadDate: '2024-11-20', type: 'PDF' },
    { name: 'Passport Copy', uploadDate: '2024-09-10', type: 'PDF' },
  ],
};

interface StudentProfileProps {
  studentId: string;
  onBack: () => void;
}

export function StudentProfile({ studentId, onBack }: StudentProfileProps) {
  const [student] = useState(mockStudent); // In real app, fetch by studentId

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in-progress':
        return 'text-blue-600';
      case 'pending':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
      </div>

      {/* Student Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={student.avatar || '/placeholder.svg'} />
              <AvatarFallback className="text-lg">
                {student.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{student.name}</h1>
                <Badge className="bg-green-100 text-green-800">{student.status}</Badge>
              </div>
              <p className="text-gray-600 mb-4">{student.bio}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{student.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{student.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{student.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Started {student.startDate}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Program</p>
              <p className="font-medium">{student.program}</p>
              <p className="text-sm text-gray-500 mt-2">Year</p>
              <Badge variant="outline">{student.year}</Badge>
              <p className="text-sm text-gray-500 mt-2">University</p>
              <p className="font-medium text-sm">{student.university}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="goals">Goals & Progress</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Student Goals</h3>
            <GoalSetting
              trigger={
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              }
              preselectedStudentId={student.id}
            />
          </div>
          <div className="grid gap-4">
            {student.goals.map((goal) => (
              <Card key={goal.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{goal.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Progress</span>
                            <span className="text-sm font-medium">{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                        <div className="text-sm text-gray-500">Due: {goal.dueDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {goal.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-600" />
                      )}
                      <span className={`text-sm ${getStatusColor(goal.status)}`}>
                        {goal.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Assigned Tasks</h3>
            <TaskAssignment
              trigger={
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              }
              preselectedStudentId={student.id}
            />
          </div>
          <div className="space-y-4">
            {student.tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Due: {task.dueDate}</span>
                        <span className={getStatusColor(task.status)}>Status: {task.status}</span>
                      </div>
                    </div>
                    <TaskAssignment
                      trigger={
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      }
                      preselectedStudentId={student.id}
                      editMode={true}
                      taskData={task}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Documents</h3>
          </div>
          <div className="space-y-4">
            {student.documents.map((doc, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <h4 className="font-medium">{doc.name}</h4>
                        <p className="text-sm text-gray-500">
                          Uploaded {doc.uploadDate} • {doc.type}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
