'use client';

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Download,
  Edit,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  type AnnualUpdate,
  type CreateTaskData,
  downloadScholarAnnualReviewsCSV,
  getFileDownloadUrl,
  getFilterOptions,
  getRequiredDocumentDownloadUrl,
  type ScholarFilterOptions,
  type UpdateScholarProfileData,
} from '../lib/api-client';
import { useSession } from '../lib/auth-client';
import {
  ACADEMIC_YEAR_OPTIONS,
  COUNTRY_OPTIONS,
  DEFAULT_UNIVERSITY_OPTIONS,
  DEGREE_PATHWAY_OPTIONS,
  GENDER_OPTIONS,
  type Gender,
  isPlaceholderAcademicValue,
  normalizeLocation,
  normalizeNationality,
} from '../lib/constants';
import {
  useDeleteTask,
  useScholarAnnualUpdates,
  useScholarProfile,
  useScholarRequiredDocuments,
  useUpdateScholarPlatformSetup,
  useUpdateScholarProfile,
} from '../lib/hooks/use-queries';
import { CommentThread } from './comment-thread';
import { PlatformSetupCard } from './platform-setup-card';
import { TaskAssignment } from './task-assignment';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
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

type ScholarProfileTab = 'goals' | 'tasks' | 'documents' | 'profile' | 'annual-reviews';

interface ScholarProfileProps {
  scholarId: string;
  onBack: () => void;
  initialTab?: ScholarProfileTab;
}

export function ScholarProfilePage({
  scholarId,
  onBack,
  initialTab = 'profile',
}: ScholarProfileProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ScholarProfileTab>(initialTab);
  const { data: scholar, isLoading, error } = useScholarProfile(scholarId);
  const { data: annualUpdates = [], isLoading: annualUpdatesLoading } = useScholarAnnualUpdates(
    scholarId,
    activeTab === 'annual-reviews'
  );
  const { data: requiredDocuments, isLoading: requiredDocumentsLoading } =
    useScholarRequiredDocuments(scholarId, scholar?.programStage === 'prep_year');
  const updateProfile = useUpdateScholarProfile(scholarId);
  const updatePlatformSetup = useUpdateScholarPlatformSetup(scholarId);
  const [editOpen, setEditOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ university: '', year: '' });
  const [editForm, setEditForm] = useState<UpdateScholarProfileData>({});
  const [filterOptions, setFilterOptions] = useState<ScholarFilterOptions>({
    programs: [],
    years: [],
    universities: [],
    intendedUniversities: [],
    intendedCourses: [],
  });

  useEffect(() => {
    getFilterOptions()
      .then(setFilterOptions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'in-progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'pending':
        return 'text-orange-600';
      default:
        return 'text-muted-foreground';
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

  const handleDownloadAnnualReviews = async () => {
    if (!scholar) return;

    try {
      await downloadScholarAnnualReviewsCSV(scholar.id, scholar.name);
    } catch (error) {
      console.error('Error downloading annual review report:', error);
      alert('Failed to download annual review report. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" className="w-fit" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Dialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (open && scholar) {
                setEditForm({
                  phone: scholar.phone ?? '',
                  dateOfBirth: scholar.dateOfBirth ?? '',
                  gender: scholar.gender ?? undefined,
                  nationality: normalizeNationality(scholar.nationality ?? ''),
                  location: normalizeLocation(scholar.location ?? ''),
                  addressHomeCountry: scholar.addressHomeCountry ?? '',
                  passportExpirationDate: scholar.passportExpirationDate ?? '',
                  visaExpirationDate: scholar.visaExpirationDate ?? '',
                  emergencyContactCountryOfStudy: scholar.emergencyContactCountryOfStudy ?? '',
                  emergencyContactHomeCountry: scholar.emergencyContactHomeCountry ?? '',
                  program: scholar.program ?? '',
                  university: scholar.university ?? '',
                  year: scholar.year ?? '',
                  startDate: scholar.startDate
                    ? new Date(scholar.startDate).toISOString().split('T')[0]
                    : '',
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
                  programStage: scholar.programStage,
                  intendedUniversity: scholar.intendedUniversity ?? '',
                  intendedCourse: scholar.intendedCourse ?? '',
                  degreePathway: scholar.degreePathway ?? '',
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
                          gender: value === '_none' ? undefined : (value as Gender),
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
                      value={editForm.nationality || '_none'}
                      onValueChange={(value) =>
                        setEditForm((f) => ({ ...f, nationality: value === '_none' ? '' : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select nationality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select nationality</SelectItem>
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
                      value={editForm.location || '_none'}
                      onValueChange={(value) =>
                        setEditForm((f) => ({ ...f, location: value === '_none' ? '' : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select country</SelectItem>
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
                          ...new Set(
                            [editForm.program, ...filterOptions.programs].filter(
                              (x): x is string => typeof x === 'string' && x !== ''
                            )
                          ),
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
                          ...new Set(
                            [
                              editForm.year,
                              ...filterOptions.years,
                              ...ACADEMIC_YEAR_OPTIONS,
                            ].filter(
                              (x): x is string =>
                                typeof x === 'string' && !isPlaceholderAcademicValue(x)
                            )
                          ),
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
                          ...new Set(
                            [
                              editForm.university,
                              ...filterOptions.universities,
                              ...filterOptions.intendedUniversities,
                              ...DEFAULT_UNIVERSITY_OPTIONS,
                            ].filter(
                              (x): x is string =>
                                typeof x === 'string' && !isPlaceholderAcademicValue(x)
                            )
                          ),
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
                    <Label>Program stage</Label>
                    <Select
                      value={editForm.programStage ?? 'scholar'}
                      onValueChange={(value) =>
                        setEditForm((f) => ({
                          ...f,
                          programStage: value as 'prep_year' | 'scholar',
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prep_year">Prep Year</SelectItem>
                        <SelectItem value="scholar">Scholar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editForm.programStage === 'prep_year' && (
                    <>
                      <div>
                        <Label>Intended university</Label>
                        <Input
                          value={editForm.intendedUniversity ?? ''}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, intendedUniversity: e.target.value }))
                          }
                          placeholder="Intended university"
                        />
                      </div>
                      <div>
                        <Label>Intended course</Label>
                        <Input
                          value={editForm.intendedCourse ?? ''}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, intendedCourse: e.target.value }))
                          }
                          placeholder="Intended course"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Degree pathway</Label>
                        <Select
                          value={editForm.degreePathway || '_none'}
                          onValueChange={(value) =>
                            setEditForm((f) => ({
                              ...f,
                              degreePathway: value === '_none' ? '' : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select degree pathway" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Not specified</SelectItem>
                            {DEGREE_PATHWAY_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
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
                      if (
                        scholar.programStage === 'prep_year' &&
                        editForm.programStage === 'scholar' &&
                        (isPlaceholderAcademicValue(editForm.university) ||
                          isPlaceholderAcademicValue(editForm.year) ||
                          !(ACADEMIC_YEAR_OPTIONS as readonly string[]).includes(
                            editForm.year ?? ''
                          ))
                      ) {
                        return;
                      }
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
          {scholar.programStage === 'prep_year' && (
            <Dialog
              open={enrollOpen}
              onOpenChange={(open) => {
                setEnrollOpen(open);
                if (open) {
                  const intended = scholar.intendedUniversity ?? '';
                  const liveUniversity = scholar.university ?? '';
                  setEnrollForm({
                    university: !isPlaceholderAcademicValue(intended)
                      ? intended
                      : !isPlaceholderAcademicValue(liveUniversity)
                        ? liveUniversity
                        : '',
                    year: (ACADEMIC_YEAR_OPTIONS as readonly string[]).includes(scholar.year ?? '')
                      ? scholar.year
                      : 'Year 1',
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline">Flip to scholar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark as enrolled scholar</DialogTitle>
                  <DialogDescription>
                    This sets program stage to Scholar. Confirm university and academic year for the
                    live academic record.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div>
                    <Label>University</Label>
                    <Select
                      value={enrollForm.university}
                      onValueChange={(value) => setEnrollForm((f) => ({ ...f, university: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select university" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          ...new Set(
                            [
                              enrollForm.university,
                              scholar.intendedUniversity ?? '',
                              ...filterOptions.universities,
                              ...filterOptions.intendedUniversities,
                              ...DEFAULT_UNIVERSITY_OPTIONS,
                            ].filter(
                              (x): x is string =>
                                typeof x === 'string' && !isPlaceholderAcademicValue(x)
                            )
                          ),
                        ].map((uni) => (
                          <SelectItem key={uni} value={uni}>
                            {uni}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Academic year</Label>
                    <Select
                      value={enrollForm.year}
                      onValueChange={(value) => setEnrollForm((f) => ({ ...f, year: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACADEMIC_YEAR_OPTIONS.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEnrollOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        await updateProfile.mutateAsync({
                          programStage: 'scholar',
                          university: enrollForm.university,
                          year: enrollForm.year,
                        });
                        setEnrollOpen(false);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    disabled={
                      updateProfile.isPending ||
                      isPlaceholderAcademicValue(enrollForm.university) ||
                      !(ACADEMIC_YEAR_OPTIONS as readonly string[]).includes(enrollForm.year)
                    }
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Confirm enrollment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button
            onClick={handleDownloadLDF}
            className="bg-ashinaga-teal-600 hover:bg-ashinaga-teal-700"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Download LDF</span>
            <span className="hidden sm:inline">Download LDF Report</span>
          </Button>
        </div>
      </div>

      {/* Student Info Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start lg:flex-1">
              <Avatar className="h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                <AvatarImage src={scholar.image || '/placeholder.svg'} />
                <AvatarFallback className="text-lg">
                  {scholar.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="min-w-0 text-2xl font-bold leading-tight">{scholar.name}</h1>
                  <Badge
                    className={
                      scholar.status === 'archived'
                        ? 'bg-muted text-foreground'
                        : scholar.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800'
                    }
                  >
                    {scholar.status}
                  </Badge>
                </div>
                <p className="mb-4 text-muted-foreground">{scholar.bio || 'No bio available'}</p>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate">{scholar.email}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate">{scholar.phone || 'No phone number'}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-label="Country of study"
                    />
                    <span className="min-w-0 truncate">
                      {normalizeLocation(scholar.location ?? '') || 'No location'}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate">
                      Started {new Date(scholar.startDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 border-t pt-4 text-sm sm:grid-cols-3 lg:w-56 lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div className="min-w-0">
                <p className="text-muted-foreground">Program</p>
                <p className="font-medium">{scholar.program}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Year</p>
                <Badge variant="outline">{scholar.year}</Badge>
              </div>
              <div className="min-w-0 sm:col-span-3 lg:col-span-1">
                <p className="text-muted-foreground">University</p>
                <p className="font-medium">{scholar.university}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ScholarProfileTab)}
        className="space-y-4"
      >
        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="goals">LDF Goals</TabsTrigger>
            <TabsTrigger value="annual-reviews">Annual Reviews</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
        </div>

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
                  <p className="font-medium">
                    {normalizeNationality(scholar.nationality ?? '') || '—'}
                  </p>
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
              <CardDescription>
                Contact person (name, email, phone) for country of study and home country
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Emergency contact (country of study)</span>
                <p className="font-medium whitespace-pre-wrap mt-0.5">
                  {scholar.emergencyContactCountryOfStudy || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Emergency contact (home country)</span>
                <p className="font-medium whitespace-pre-wrap mt-0.5">
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
                  <span className="text-muted-foreground">Program Stage</span>
                  <Badge variant={scholar.programStage === 'prep_year' ? 'default' : 'secondary'}>
                    {scholar.programStage === 'prep_year' ? 'Prep Year Candidate' : 'Scholar'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Start date</span>
                  <p className="font-medium">{new Date(scholar.startDate).toLocaleDateString()}</p>
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
              {scholar.programStage === 'prep_year' && (
                <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <span className="text-muted-foreground">Intended University</span>
                    <p className="font-medium">{scholar.intendedUniversity || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Intended Course</span>
                    <p className="font-medium">{scholar.intendedCourse || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Degree Pathway</span>
                    <p className="font-medium">{scholar.degreePathway || '—'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {scholar.programStage === 'prep_year' && (scholar.platformSetups?.length ?? 0) > 0 && (
            <PlatformSetupCard
              setups={scholar.platformSetups ?? []}
              updatingSlug={
                updatePlatformSetup.isPending ? (updatePlatformSetup.variables?.slug ?? null) : null
              }
              onStatusChange={(slug, status) => {
                updatePlatformSetup.mutate({ slug, status });
              }}
            />
          )}
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
                  <p className="text-muted-foreground text-center py-4">No LDF goals set yet</p>
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
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-xs font-semibold text-foreground mb-1">
                              Related LDF Skills & Qualities
                            </p>
                            <p className="text-sm text-muted-foreground">{goal.relatedSkills}</p>
                          </div>
                        )}

                        {/* Action Plan */}
                        {goal.actionPlan && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-xs font-semibold text-foreground mb-1">
                              Action Plan
                            </p>
                            <p className="text-sm text-muted-foreground">{goal.actionPlan}</p>
                          </div>
                        )}

                        {/* Review Notes */}
                        {goal.reviewNotes && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-xs font-semibold text-foreground mb-1">
                              Goal Review & Self-Reflection
                            </p>
                            <p className="text-sm text-muted-foreground">{goal.reviewNotes}</p>
                          </div>
                        )}

                        {/* Completion Scale */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Completion Scale</span>
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

        <TabsContent value="annual-reviews" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">Annual Reviews</h3>
            <Button
              variant="outline"
              className="w-fit"
              onClick={handleDownloadAnnualReviews}
              disabled={annualUpdatesLoading || annualUpdates.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <AnnualReviewsPanel annualUpdates={annualUpdates} isLoading={annualUpdatesLoading} />
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
                  <p className="text-muted-foreground text-center py-4">No tasks assigned yet</p>
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
                        <p className="text-sm text-muted-foreground mb-2">
                          {task.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                                <span className="text-sm text-muted-foreground">
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
                                      className="cursor-pointer hover:bg-muted"
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
                      <div className="flex items-center gap-2">
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
                        <DeleteTaskButton scholarId={scholar.id} taskId={task.id} />
                      </div>
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
          {scholar.programStage === 'prep_year' ? (
            <div className="space-y-3">
              {requiredDocumentsLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading required documents...
                  </CardContent>
                </Card>
              ) : (
                (requiredDocuments?.items ?? []).map((item) => (
                  <Card key={item.type.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <h4 className="font-medium">{item.type.label}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.status === 'submitted' && item.file
                                ? `${item.file.fileName} · ${new Date(item.file.uploadedAt).toLocaleDateString()}`
                                : 'Missing'}
                            </p>
                          </div>
                        </div>
                        {item.file ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const { downloadUrl } = await getRequiredDocumentDownloadUrl(
                                item.file!.id
                              );
                              window.open(downloadUrl, '_blank');
                            }}
                          >
                            <Download className="mr-1 h-4 w-4" />
                            Download
                          </Button>
                        ) : (
                          <Badge variant="secondary">Missing</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {scholar.documents.length === 0 ? (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground text-center py-4">
                      No documents uploaded yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                scholar.documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{doc.name}</h4>
                            <p className="text-sm text-muted-foreground">
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AnnualReviewsPanel({
  annualUpdates,
  isLoading,
}: {
  annualUpdates: AnnualUpdate[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading annual reviews...</span>
        </CardContent>
      </Card>
    );
  }

  if (annualUpdates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border bg-muted/40">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No annual reviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted and draft annual reviews for this scholar will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Accordion type="single" collapsible defaultValue={annualUpdates[0]?.id} className="space-y-3">
      {annualUpdates.map((annualUpdate) => (
        <AccordionItem
          key={annualUpdate.id}
          value={annualUpdate.id}
          className="overflow-hidden rounded-lg border bg-card shadow-sm"
        >
          <AccordionTrigger className="px-4 py-4 text-left hover:no-underline sm:px-6">
            <div className="flex min-w-0 flex-1 flex-col gap-3 pr-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 shrink-0 text-ashinaga-teal-600" />
                  <span className="truncate text-base font-semibold">
                    {annualUpdate.academicYear} Annual Review
                  </span>
                </div>
                <p className="mt-1 text-sm font-normal text-muted-foreground">
                  {getAnnualReviewDateLabel(annualUpdate)}
                </p>
              </div>
              <Badge variant={annualUpdate.status === 'submitted' ? 'default' : 'secondary'}>
                {annualUpdate.status === 'submitted' ? 'Submitted' : 'Draft in progress'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-5 pt-0 sm:px-6">
            <div className="space-y-5 border-t pt-5">
              {annualUpdate.status === 'submitted' ? (
                <>
                  <div className="grid gap-3 text-sm md:grid-cols-4">
                    <AnnualReviewMetric
                      label="Leadership roles"
                      value={formatCount(annualUpdate.leadershipRolesCount)}
                    />
                    <AnnualReviewMetric
                      label="Pay it forward"
                      value={formatCount(annualUpdate.payItForwardCount)}
                    />
                    <AnnualReviewMetric
                      label="Africa activities"
                      value={formatCount(annualUpdate.subSaharanAfricaActivitiesCount)}
                    />
                    <AnnualReviewMetric
                      label="Internships"
                      value={formatCount(annualUpdate.independentInternshipsCount)}
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <AnnualReviewAnswer label="Highlights" value={annualUpdate.highlights} />
                    <AnnualReviewAnswer label="Part-time jobs" value={annualUpdate.partTimeJobs} />
                    <AnnualReviewAnswer
                      label="Extracurriculars"
                      value={annualUpdate.extracurriculars}
                    />
                    <AnnualReviewAnswer
                      label="Leadership roles"
                      value={annualUpdate.leadershipRolesDescription}
                    />
                    <AnnualReviewAnswer
                      label="Pay it forward"
                      value={annualUpdate.payItForwardDescription}
                    />
                    <AnnualReviewAnswer
                      label="Sub-Saharan Africa activities"
                      value={annualUpdate.subSaharanAfricaActivitiesDescription}
                    />
                    <AnnualReviewAnswer
                      label="Internships in Africa"
                      value={annualUpdate.internshipsInAfricaSummary}
                    />
                    <AnnualReviewAnswer
                      label="Internships outside Africa"
                      value={annualUpdate.internshipsElsewhereSummary}
                    />
                    <AnnualReviewAnswer
                      label="Ashinaga 8-week internship"
                      value={formatBoolean(annualUpdate.completedAshinagaAfricaInternship)}
                    />
                    <AnnualReviewAnswer
                      label="Academic classification"
                      value={annualUpdate.academicYearAverageClassification}
                    />
                    <AnnualReviewAnswer
                      label="Weighted grade"
                      value={annualUpdate.academicYearWeightedGrade}
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Draft in progress</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This scholar has started their annual review, but answers will only be visible
                    after final submission.
                  </p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function AnnualReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function AnnualReviewAnswer({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{value || '—'}</p>
    </div>
  );
}

function formatCount(value: number | null) {
  return value === null ? '—' : String(value);
}

function formatBoolean(value: boolean | null) {
  if (value === null) return null;
  return value ? 'Yes' : 'No';
}

function getAnnualReviewDateLabel(annualUpdate: AnnualUpdate) {
  if (annualUpdate.status === 'submitted' && annualUpdate.submittedAt) {
    return `Submitted ${formatAnnualReviewDateTime(annualUpdate.submittedAt)}`;
  }

  return `Draft updated ${formatAnnualReviewDateTime(annualUpdate.updatedAt)}`;
}

function formatAnnualReviewDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(new Date(value));
}

function DeleteTaskButton({ scholarId, taskId }: { scholarId: string; taskId: string }) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteTask(scholarId);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(taskId);
      setOpen(false);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete task?</DialogTitle>
          <DialogDescription>
            The task will be archived and hidden from both staff and scholar views. This can be
            undone by a developer if needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
