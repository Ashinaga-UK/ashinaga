'use client';

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getFileDownloadUrl,
  getFilterOptions,
  type CreateTaskData,
  type ScholarFilterOptions,
  type UpdateScholarProfileData,
} from '../lib/api-client';
import {
  ACADEMIC_YEAR_OPTIONS,
  COUNTRY_OPTIONS,
  DEFAULT_UNIVERSITY_OPTIONS,
  GENDER_OPTIONS,
} from '../lib/constants';
import { useSession } from '../lib/auth-client';
import { useScholarProfile, useUpdateScholarProfile } from '../lib/hooks/use-queries';
import { CommentThread } from './comment-thread';
import { TaskAssignment } from './task-assignment';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
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
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';

interface ScholarProfileProps {
  scholarId: string;
  onBack: () => void;
  initialTab?: 'goals' | 'tasks' | 'documents' | 'profile';
}

export function ScholarProfilePage({
  scholarId,
  onBack,
  initialTab = 'profile',
}: ScholarProfileProps) {
  const { data: session } = useSession();
  const { data: scholar, isLoading, error } = useScholarProfile(scholarId);
  const updateProfile = useUpdateScholarProfile(scholarId);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateScholarProfileData>({});
  const [filterOptions, setFilterOptions] = useState<ScholarFilterOptions>({
    programs: [],
    years: [],
    universities: [],
  });

  useEffect(() => {
    getFilterOptions()
      .then(setFilterOptions)
      .catch(() => {});
  }, []);

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'academic_development':
        return '🎓';
      case 'personal_development':
        return '🌟';
      case 'professional_development':
        return '💼';
      default:
        return '📌';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'academic_development':
        return 'Academic Development';
      case 'personal_development':
        return 'Personal Development';
      case 'professional_development':
        return 'Professional Development';
      default:
        return category;
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

  const handleDownloadLDF = async () => {
    if (!scholar) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const downloadUrl = `${baseUrl}/api/scholars/${scholarId}/export-ldf`;

      // Fetch with credentials
      const response = await fetch(downloadUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download LDF report');
      }

      // Get the CSV content
      const csvContent = await response.text();

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${scholar.name.replace(/\s+/g, '_')}_LDF_Export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading LDF report:', error);
      alert('Failed to download LDF report. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <div className="flex items-center gap-2">
          <Dialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (open && scholar) {
                setEditForm({
                  phone: scholar.phone ?? '',
                  dateOfBirth: scholar.dateOfBirth ?? '',
                  gender: scholar.gender ?? undefined,
                  nationality: scholar.nationality ?? '',
                  location: scholar.location ?? '',
                  addressHomeCountry: scholar.addressHomeCountry ?? '',
                  passportExpirationDate: scholar.passportExpirationDate ?? '',
                  visaExpirationDate: scholar.visaExpirationDate ?? '',
                  emergencyContactCountryOfStudy: scholar.emergencyContactCountryOfStudy ?? '',
                  emergencyContactHomeCountry: scholar.emergencyContactHomeCountry ?? '',
                  program: scholar.program ?? '',
                  university: scholar.university ?? '',
                  year: scholar.year ?? '',
                  startDate: scholar.startDate ? new Date(scholar.startDate).toISOString().split('T')[0] : '',
                  graduationDate: scholar.graduationDate
                    ? new Date(scholar.graduationDate).toISOString().split('T')[0]
                    : '',
                  universityId: scholar.universityId ?? '',
                  dietaryInformation: scholar.dietaryInformation ?? '',
                  kokorozashi: scholar.kokorozashi ?? '',
                  longTermCareerPlan: scholar.longTermCareerPlan ?? '',
                  postGraduationPlan: scholar.postGraduationPlan ?? '',
                  bio: scholar.bio ?? '',
                  majorCategory: scholar.majorCategory ?? '',
                  fieldOfStudy: scholar.fieldOfStudy ?? '',
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit scholar profile</DialogTitle>
                <DialogDescription>
                  Update basic info, contact details, and academic information.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editForm.phone ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone"
                    />
                  </div>
                  <div>
                    <Label>Date of birth</Label>
                    <Input
                      type="date"
                      value={editForm.dateOfBirth ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={editForm.gender ?? '_none'}
                      onValueChange={(value) =>
                        setEditForm((f) => ({
                          ...f,
                          gender:
                            value === '_none'
                              ? undefined
                              : (value as 'male' | 'female' | 'other' | 'prefer_not_to_say'),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Not specified</SelectItem>
                        {GENDER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nationality</Label>
                    <Select
                      value={editForm.nationality ?? ''}
                      onValueChange={(value) => setEditForm((f) => ({ ...f, nationality: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select nationality" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Location (country of study)</Label>
                    <Select
                      value={editForm.location ?? ''}
                      onValueChange={(value) => setEditForm((f) => ({ ...f, location: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Address (home country)</Label>
                    <Input
                      value={editForm.addressHomeCountry ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, addressHomeCountry: e.target.value }))
                      }
                      placeholder="Street, city, region (home country)"
                    />
                  </div>
                  <div>
                    <Label>Program</Label>
                    <Select
                      value={editForm.program ?? ''}
                      onValueChange={(value) => setEditForm((f) => ({ ...f, program: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          ...new Set([editForm.program, ...filterOptions.programs].filter(Boolean)),
                        ].map((program) => (
                          <SelectItem key={program} value={program}>
                            {program}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select
                      value={editForm.year ?? ''}
                      onValueChange={(value) => setEditForm((f) => ({ ...f, year: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          ...new Set([
                            editForm.year,
                            ...filterOptions.years,
                            ...ACADEMIC_YEAR_OPTIONS,
                          ].filter(Boolean)),
                        ].map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>University</Label>
                    <Select
                      value={editForm.university ?? ''}
                      onValueChange={(value) => setEditForm((f) => ({ ...f, university: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select university" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          ...new Set([
                            editForm.university,
                            ...filterOptions.universities,
                            ...DEFAULT_UNIVERSITY_OPTIONS,
                          ].filter(Boolean)),
                        ].map((uni) => (
                          <SelectItem key={uni} value={uni}>
                            {uni}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start date</Label>
                    <Input
                      type="date"
                      value={editForm.startDate ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Graduation date</Label>
                    <Input
                      type="date"
                      value={editForm.graduationDate ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, graduationDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={editForm.bio ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                      placeholder="Short bio"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await updateProfile.mutateAsync(editForm);
                      setEditOpen(false);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            onClick={handleDownloadLDF}
            className="bg-ashinaga-teal-600 hover:bg-ashinaga-teal-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download LDF Report
          </Button>
        </div>
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
                <Badge
                  className={
                    scholar.status === 'archived'
                      ? 'bg-gray-200 text-gray-800'
                      : scholar.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                  }
                >
                  {scholar.status}
                </Badge>
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
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="goals">LDF Goals</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">AAI Scholar ID</span>
                  <p className="font-medium">{scholar.aaiScholarId || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date of birth</span>
                  <p className="font-medium">
                    {scholar.dateOfBirth ? new Date(scholar.dateOfBirth).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gender</span>
                  <p className="font-medium capitalize">{scholar.gender ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Nationality</span>
                  <p className="font-medium">{scholar.nationality || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Passport expiration</span>
                  <p className="font-medium">
                    {scholar.passportExpirationDate
                      ? new Date(scholar.passportExpirationDate).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Visa expiration</span>
                  <p className="font-medium">
                    {scholar.visaExpirationDate
                      ? new Date(scholar.visaExpirationDate).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Emergency contacts</CardTitle>
              <CardDescription>Country of study and home country</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Country of study</span>
                <p className="font-medium whitespace-pre-wrap">
                  {scholar.emergencyContactCountryOfStudy || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Home country</span>
                <p className="font-medium whitespace-pre-wrap">
                  {scholar.emergencyContactHomeCountry || '—'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Academic information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Program</span>
                  <p className="font-medium">{scholar.program}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Year</span>
                  <p className="font-medium">{scholar.year}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">University</span>
                  <p className="font-medium">{scholar.university}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">University ID</span>
                  <p className="font-medium">{scholar.universityId || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Major category</span>
                  <p className="font-medium">{scholar.majorCategory || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Field of study</span>
                  <p className="font-medium">{scholar.fieldOfStudy || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Start date</span>
                  <p className="font-medium">
                    {new Date(scholar.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Graduation date</span>
                  <p className="font-medium">
                    {scholar.graduationDate
                      ? new Date(scholar.graduationDate).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Additional information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {scholar.dietaryInformation && (
                <div>
                  <span className="text-muted-foreground">Dietary information</span>
                  <p className="font-medium whitespace-pre-wrap">{scholar.dietaryInformation}</p>
                </div>
              )}
              {scholar.kokorozashi && (
                <div>
                  <span className="text-muted-foreground">Kokorozashi</span>
                  <p className="font-medium whitespace-pre-wrap">{scholar.kokorozashi}</p>
                </div>
              )}
              {scholar.longTermCareerPlan && (
                <div>
                  <span className="text-muted-foreground">Long-term career plan</span>
                  <p className="font-medium whitespace-pre-wrap">{scholar.longTermCareerPlan}</p>
                </div>
              )}
              {scholar.postGraduationPlan && (
                <div>
                  <span className="text-muted-foreground">Post-graduation plan</span>
                  <p className="font-medium whitespace-pre-wrap">{scholar.postGraduationPlan}</p>
                </div>
              )}
              {scholar.bio && (
                <div>
                  <span className="text-muted-foreground">Bio</span>
                  <p className="font-medium whitespace-pre-wrap">{scholar.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Student LDF Goals</h3>
          </div>
          <div className="grid gap-4">
            {scholar.goals.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-gray-500 text-center py-4">No LDF goals set yet</p>
                </CardContent>
              </Card>
            ) : (
              scholar.goals.map((goal) => (
                <Card key={goal.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                          <div>
                            <h4 className="font-semibold text-lg">{goal.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{getCategoryLabel(goal.category)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Target: {new Date(goal.targetDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Related Skills */}
                        {goal.relatedSkills && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs font-semibold text-blue-900 mb-1">
                              Related LDF Skills & Qualities
                            </p>
                            <p className="text-sm text-blue-800">{goal.relatedSkills}</p>
                          </div>
                        )}

                        {/* Action Plan */}
                        {goal.actionPlan && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-xs font-semibold text-green-900 mb-1">Action Plan</p>
                            <p className="text-sm text-green-800">{goal.actionPlan}</p>
                          </div>
                        )}

                        {/* Review Notes */}
                        {goal.reviewNotes && (
                          <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                            <p className="text-xs font-semibold text-purple-900 mb-1">
                              Goal Review & Self-Reflection
                            </p>
                            <p className="text-sm text-purple-800">{goal.reviewNotes}</p>
                          </div>
                        )}

                        {/* Completion Scale */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Completion Scale</span>
                            <span className="text-sm font-medium">{goal.completionScale}/10</span>
                          </div>
                          <Progress value={(goal.completionScale / 10) * 100} className="h-2" />
                        </div>

                        {goal.completedAt && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-green-600">
                              ✅ Completed on {new Date(goal.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {goal.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-blue-600" />
                        )}
                        <span className={`text-sm capitalize ${getStatusColor(goal.status)}`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Comment Thread */}
                    {session?.user?.id && (
                      <div className="mt-4">
                        <CommentThread goalId={goal.id} currentUserId={session.user.id} />
                      </div>
                    )}
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
                                <span className="text-sm text-gray-600">
                                  {task.response.responseText}
                                </span>
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
                                          const { downloadUrl } = await getFileDownloadUrl(
                                            attachment.id
                                          );
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
