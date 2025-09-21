'use client';

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
} from 'lucide-react';
import { getFileDownloadUrl, type CreateTaskData } from '../lib/api-client';
import { useScholarProfile } from '../lib/hooks/use-queries';
import { TaskAssignment } from './task-assignment';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface ScholarProfileProps {
  scholarId: string;
  onBack: () => void;
  initialTab?: 'goals' | 'tasks' | 'documents';
}

export function ScholarProfilePage({
  scholarId,
  onBack,
  initialTab = 'goals',
}: ScholarProfileProps) {
  const { data: scholar, isLoading, error } = useScholarProfile(scholarId);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading scholar profile...</span>
        </div>
      </div>
    );
  }

  if (error || !scholar) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
        </div>
        <Alert>
          <AlertDescription>
            {error
              ? error.message || 'Failed to load scholar profile'
              : 'Failed to load scholar profile'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
              <AvatarImage src={scholar.image || '/placeholder.svg'} />
              <AvatarFallback className="text-lg">
                {scholar.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{scholar.name}</h1>
                <Badge className="bg-green-100 text-green-800">{scholar.status}</Badge>
              </div>
              <p className="text-gray-600 mb-4">{scholar.bio || 'No bio available'}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{scholar.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{scholar.phone || 'No phone number'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{scholar.location || 'No location'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Started {new Date(scholar.startDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Program</p>
              <p className="font-medium">{scholar.program}</p>
              <p className="text-sm text-gray-500 mt-2">Year</p>
              <Badge variant="outline">{scholar.year}</Badge>
              <p className="text-sm text-gray-500 mt-2">University</p>
              <p className="font-medium text-sm">{scholar.university}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="goals">Goals & Progress</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Student Goals</h3>
          </div>
          <div className="grid gap-4">
            {scholar.goals.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-gray-500 text-center py-4">No goals set yet</p>
                </CardContent>
              </Card>
            ) : (
              scholar.goals.map((goal) => (
                <Card key={goal.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{goal.title}</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {goal.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600">Progress</span>
                              <span className="text-sm font-medium">{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-2" />
                          </div>
                          <div className="text-sm text-gray-500">
                            Due: {new Date(goal.targetDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {goal.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-blue-600" />
                        )}
                        <span className={`text-sm ${getStatusColor(goal.status)}`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
              preselectedScholarId={scholar.id}
            />
          </div>
          <div className="space-y-4">
            {scholar.tasks.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-gray-500 text-center py-4">No tasks assigned yet</p>
                </CardContent>
              </Card>
            ) : (
              scholar.tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {task.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          <span className={getStatusColor(task.status)}>
                            Status: {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        {/* Show task response and attachments if task is completed */}
                        {task.status === 'completed' && task.response && (
                          <div className="mt-3 pt-3 border-t">
                            {task.response.responseText && (
                              <div className="mb-2">
                                <span className="text-sm font-medium">Response: </span>
                                <span className="text-sm text-gray-600">{task.response.responseText}</span>
                              </div>
                            )}
                            {task.response.attachments && task.response.attachments.length > 0 && (
                              <div>
                                <span className="text-sm font-medium">Attachments: </span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {task.response.attachments.map((attachment) => (
                                    <Badge
                                      key={attachment.id}
                                      variant="secondary"
                                      className="cursor-pointer hover:bg-gray-200"
                                      onClick={async () => {
                                        try {
                                          // Use the attachment ID to get the download URL
                                          const { downloadUrl } = await getFileDownloadUrl(attachment.id);
                                          window.open(downloadUrl, '_blank');
                                        } catch (error) {
                                          console.error('Failed to download file:', error);
                                        }
                                      }}
                                    >
                                      📎 {attachment.fileName}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <TaskAssignment
                        trigger={
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                        }
                        preselectedScholarId={scholar.id}
                        existingTask={{
                          id: task.id,
                          title: task.title,
                          description: task.description,
                          type: task.type as CreateTaskData['type'],
                          priority: task.priority,
                          dueDate: task.dueDate,
                          status: task.status,
                        }}
                        mode="edit"
                        onSuccess={() => {
                          // Tasks will be refetched automatically via React Query
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Documents</h3>
          </div>
          <div className="space-y-4">
            {scholar.documents.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
                </CardContent>
              </Card>
            ) : (
              scholar.documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <div>
                          <h4 className="font-medium">{doc.name}</h4>
                          <p className="text-sm text-gray-500">
                            Uploaded {new Date(doc.uploadDate).toLocaleDateString()} • {doc.type}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
