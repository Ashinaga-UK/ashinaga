'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AnnouncementCreator } from '../components/announcement-creator';
import { AnnualReviewCopyEditor } from '../components/annual-review-copy-editor';
import { AnnualReviewsReport } from '../components/annual-reviews-report';
import { InvitationsManagement } from '../components/invitations-management';
import { LoginPage } from '../components/login-page';
import { MyProfile } from '../components/my-profile';
import { OverviewDashboard } from '../components/overview-dashboard';
import { PlatformLinksEditor } from '../components/platform-links-editor';
import { PrepCohortReport } from '../components/prep-cohort-report';
import { PrepDocumentsTracker } from '../components/prep-documents-tracker';
import { PrepTasksTracker } from '../components/prep-tasks-tracker';
import { RequestsQueue } from '../components/requests-queue';
import { ResourcesManagement } from '../components/resources-management';
import { ScholarActivityReport } from '../components/scholar-activity-report';
import { ScholarManagementTable } from '../components/scholar-management-table';
import { ScholarOnboarding } from '../components/scholar-onboarding';
import {
  isScholarProfileTab,
  ScholarProfilePage,
  type ScholarProfileTab,
} from '../components/scholar-profile';
import { StaffLayout } from '../components/staff-layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import {
  type AnnouncementFilterOptions,
  deleteAnnouncement,
  getAnnouncementFilterOptions,
} from '../lib/api-client';
import { signOut, useSession } from '../lib/auth-client';
import { queryKeys, useAnnouncements } from '../lib/hooks/use-queries';
import { cn } from '../lib/utils';

function programStageParam(searchParams: { get: (key: string) => string | null }): string | null {
  const stage = searchParams.get('programStage');
  return stage === 'prep_year' || stage === 'scholar' ? stage : null;
}

function scholarsListHref(searchParams: { get: (key: string) => string | null }): string {
  const params = new URLSearchParams({ tab: 'scholars', view: 'dashboard' });
  const stage = programStageParam(searchParams);
  if (stage) params.set('programStage', stage);
  return `?${params.toString()}`;
}

function scholarProfileHref(
  searchParams: { get: (key: string) => string | null },
  scholarId: string
): string {
  const params = new URLSearchParams({
    tab: 'scholars',
    view: 'scholar-profile',
    scholarId,
  });
  const stage = programStageParam(searchParams);
  if (stage) params.set('programStage', stage);
  return `?${params.toString()}`;
}

type StaffDashboardView =
  | 'dashboard'
  | 'scholar-profile'
  | 'onboarding'
  | 'task-assignment'
  | 'my-profile';

function StaffDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const queryClient = useQueryClient();

  // Get values from URL or use defaults
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const viewFromUrl = searchParams.get('view') || 'dashboard';
  const scholarIdFromUrl = searchParams.get('scholarId');
  const scholarTabFromUrl = searchParams.get('scholarTab') || 'profile';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [currentView, setCurrentView] = useState<StaffDashboardView>(
    viewFromUrl as StaffDashboardView
  );
  const [selectedScholarId, setSelectedScholarId] = useState<string | null>(scholarIdFromUrl);
  const [scholarProfileTab, setScholarProfileTab] = useState<ScholarProfileTab>(
    isScholarProfileTab(scholarTabFromUrl) ? scholarTabFromUrl : 'profile'
  );
  const [announcementYearFilter, setAnnouncementYearFilter] = useState('all');
  const [announcementProgramFilter, setAnnouncementProgramFilter] = useState('all');
  const [announcementUniversityFilter, setAnnouncementUniversityFilter] = useState('all');
  const [announcementStatusFilter, setAnnouncementStatusFilter] = useState<
    'active' | 'archived' | 'all'
  >('active');
  const [announcementSortOrder, setAnnouncementSortOrder] = useState<'asc' | 'desc'>('desc');
  const [announcementFilterOptions, setAnnouncementFilterOptions] =
    useState<AnnouncementFilterOptions>({
      programs: [],
      years: [],
      universities: [],
      locations: [],
      statuses: [],
    });
  // Get user data from session
  const user = session.data?.user;
  const isLoading = session.isPending;
  const isAuthenticated = !!user;
  const isStaff = user?.userType === 'staff';
  const announcementParams = useMemo(
    () => ({
      year: announcementYearFilter !== 'all' ? announcementYearFilter : undefined,
      program: announcementProgramFilter !== 'all' ? announcementProgramFilter : undefined,
      university: announcementUniversityFilter !== 'all' ? announcementUniversityFilter : undefined,
      status: announcementStatusFilter,
      sortOrder: announcementSortOrder,
    }),
    [
      announcementYearFilter,
      announcementProgramFilter,
      announcementUniversityFilter,
      announcementStatusFilter,
      announcementSortOrder,
    ]
  );

  // Handle non-staff users
  useEffect(() => {
    if (isAuthenticated && !isStaff) {
      // Sign out and redirect to login with access denied message
      void signOut();
      router.push('/login?accessDenied=true');
    }
  }, [isAuthenticated, isStaff, router]);

  // Use React Query for announcements (only when authenticated)
  const {
    data: announcements = [],
    isLoading: announcementsLoading,
    error: announcementsError,
    refetch: refetchAnnouncements,
  } = useAnnouncements(announcementParams, isStaff);

  // Update state when URL changes
  useEffect(() => {
    const newTab = searchParams.get('tab') || 'overview';
    const newView = searchParams.get('view') || 'dashboard';
    const newScholarId = searchParams.get('scholarId');
    const newScholarTab = searchParams.get('scholarTab') || 'profile';
    setActiveTab(newTab);
    setCurrentView(
      (newView || 'dashboard') as
        | 'dashboard'
        | 'scholar-profile'
        | 'onboarding'
        | 'task-assignment'
        | 'my-profile'
    );
    setSelectedScholarId(newScholarId);
    setScholarProfileTab(isScholarProfileTab(newScholarTab) ? newScholarTab : 'profile');
  }, [searchParams]);

  const fetchAnnouncementFilterOptions = useCallback(async () => {
    try {
      const options = await getAnnouncementFilterOptions();
      setAnnouncementFilterOptions(options);
    } catch (err) {
      console.error('Error fetching announcement filter options:', err);
    }
  }, []);

  // Announcements are now fetched via React Query

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnnouncementFilterOptions();
    }
  }, [isAuthenticated, fetchAnnouncementFilterOptions]);

  const clearAnnouncementFilters = () => {
    setAnnouncementYearFilter('all');
    setAnnouncementProgramFilter('all');
    setAnnouncementUniversityFilter('all');
    setAnnouncementStatusFilter('active');
    setAnnouncementSortOrder('desc');
  };

  const handleRequestQueueReviewed = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.requestStats });
    void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-brand flex items-center justify-center">
            <span className="text-brand-foreground font-semibold text-base">A</span>
          </div>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Never render staff-only screens while a non-staff session is being cleared.
  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand">
            <span className="font-semibold text-base text-brand-foreground">A</span>
          </div>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <StaffLayout
      activeTab={activeTab}
      onLogout={handleSignOut}
      onOpenProfile={() => router.push('?view=my-profile')}
      user={user}
    >
      <div className="mx-auto min-w-0 max-w-7xl px-3 py-5 animate-fade-in sm:px-6 sm:py-8 print:max-w-none print:px-0 print:py-0">
        {currentView === 'onboarding' ? (
          <ScholarOnboarding onBack={() => router.push('/')} />
        ) : currentView === 'my-profile' ? (
          <MyProfile onBack={() => router.push('/')} />
        ) : (
          <div className="space-y-6">
            <div className="min-w-0">
              <h2
                className={cn(
                  'text-2xl font-semibold tracking-tight text-foreground',
                  activeTab !== 'overview' && 'hidden md:block print:block'
                )}
              >
                {activeTab === 'overview' && 'Overview'}
                {activeTab === 'scholars' && 'Scholars'}
                {activeTab === 'scholar-activity' && 'Scholar activity'}
                {activeTab === 'prep-documents' && 'Prep documents'}
                {activeTab === 'prep-tasks' && 'Prep tasks'}
                {activeTab === 'prep-reports' && 'Prep reports'}
                {activeTab === 'annual-reviews' && 'Annual Reviews'}
                {activeTab === 'requests' && 'Requests'}
                {activeTab === 'announcements' && 'Announcements'}
                {activeTab === 'resources' && 'Resources'}
                {activeTab === 'invitations' && 'Invitations'}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground print:hidden">
                {activeTab === 'overview' && 'What needs attention right now.'}
                {activeTab === 'scholars' && 'View and manage your assigned scholars.'}
                {activeTab === 'scholar-activity' &&
                  'See who has gone quiet, who is behind on tasks, and which cohorts are least active.'}
                {activeTab === 'prep-documents' &&
                  'See submitted and missing Prep Year documents without opening each profile.'}
                {activeTab === 'prep-tasks' &&
                  'See Prep Year task completion without opening each profile.'}
                {activeTab === 'prep-reports' &&
                  'Generate a Prep Year cohort overview for internal and board reviews.'}
                {activeTab === 'annual-reviews' &&
                  'Track annual review submissions by scholar and academic year.'}
                {activeTab === 'requests' && 'Review and respond to scholar submissions.'}
                {activeTab === 'announcements' && 'Create and manage announcements.'}
                {activeTab === 'resources' && 'Review scholar-facing handbooks and guides.'}
                {activeTab === 'invitations' && 'Invite scholars and staff to the portal.'}
              </p>
            </div>

            {activeTab === 'overview' && <OverviewDashboard />}

            {activeTab === 'scholars' && (
              <div className="space-y-6">
                {currentView === 'scholar-profile' && selectedScholarId ? (
                  <ScholarProfilePage
                    scholarId={selectedScholarId}
                    initialTab={scholarProfileTab}
                    onBack={() => {
                      router.push(scholarsListHref(searchParams));
                    }}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-4 sm:p-5">
                      <ScholarManagementTable
                        onViewProfile={(scholarId) => {
                          router.push(scholarProfileHref(searchParams, scholarId));
                        }}
                        onOnboardScholar={() => router.push('?view=onboarding')}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'scholar-activity' && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <ScholarActivityReport
                    onViewScholar={(scholarId) => {
                      router.push(
                        `?tab=scholars&view=scholar-profile&scholarId=${scholarId}&scholarTab=profile`
                      );
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === 'prep-documents' && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-4 sm:p-5">
                    <PrepDocumentsTracker
                      onViewScholar={(scholarId) => {
                        router.push(
                          `?tab=scholars&view=scholar-profile&scholarId=${scholarId}&scholarTab=documents`
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'prep-tasks' && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-4 sm:p-5">
                    <PrepTasksTracker
                      onViewScholar={(scholarId) => {
                        router.push(
                          `?tab=scholars&view=scholar-profile&scholarId=${scholarId}&scholarTab=tasks`
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'prep-reports' && (
              <div className="space-y-6">
                <PlatformLinksEditor />
                <Card className="print:border-0 print:shadow-none">
                  <CardContent className="p-4 sm:p-5 print:p-0">
                    <PrepCohortReport
                      onViewScholar={(scholarId) => {
                        router.push(
                          `?tab=scholars&view=scholar-profile&scholarId=${scholarId}&scholarTab=profile`
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'annual-reviews' && (
              <div className="space-y-6">
                <AnnualReviewCopyEditor />
                <Card>
                  <CardContent className="p-4 sm:p-5">
                    <AnnualReviewsReport
                      onViewScholarAnnualReviews={(scholarId) => {
                        router.push(
                          `?tab=scholars&view=scholar-profile&scholarId=${scholarId}&scholarTab=annual-reviews`
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'requests' && <RequestsQueue onReviewed={handleRequestQueueReviewed} />}

            {activeTab === 'invitations' && (
              <div className="space-y-6">
                <InvitationsManagement onOnboardScholar={() => router.push('?view=onboarding')} />
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-6">
                <ResourcesManagement />
              </div>
            )}

            {activeTab === 'announcements' && (
              <div className="space-y-6">
                <div className="flex items-center justify-end">
                  <AnnouncementCreator />
                </div>
                <Card>
                  <CardContent className="p-4 sm:p-5">
                    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        <Select
                          value={announcementStatusFilter}
                          onValueChange={(value) =>
                            setAnnouncementStatusFilter(value as 'active' | 'archived' | 'all')
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                            <SelectItem value="all">All Statuses</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={announcementYearFilter}
                          onValueChange={setAnnouncementYearFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {announcementFilterOptions.years.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={announcementProgramFilter}
                          onValueChange={setAnnouncementProgramFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Program" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Programs</SelectItem>
                            {announcementFilterOptions.programs.map((program) => (
                              <SelectItem key={program} value={program}>
                                {program}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={announcementUniversityFilter}
                          onValueChange={setAnnouncementUniversityFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="University" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Universities</SelectItem>
                            {announcementFilterOptions.universities.map((university) => (
                              <SelectItem key={university} value={university}>
                                {university}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={announcementSortOrder}
                          onValueChange={(value) =>
                            setAnnouncementSortOrder(value as 'asc' | 'desc')
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sort" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Most Recent</SelectItem>
                            <SelectItem value="asc">Oldest First</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" onClick={clearAnnouncementFilters}>
                        Reset
                      </Button>
                    </div>
                    {announcementsLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                      </div>
                    ) : announcementsError ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          Couldn't load announcements
                        </p>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                          {announcementsError?.message || 'Please try again.'}
                        </p>
                      </div>
                    ) : announcements.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No announcements</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Nothing matches the current filters.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y border-t -mx-5">
                        {announcements.map((announcement) => (
                          <div
                            key={announcement.id}
                            className="group flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-semibold text-foreground truncate">
                                  {announcement.title}
                                </h3>
                                <Badge
                                  variant={announcement.archived ? 'muted' : 'success'}
                                  className="shrink-0"
                                >
                                  {announcement.archived ? 'Archived' : 'Active'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap mb-2">
                                {announcement.content}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>By {announcement.createdBy}</span>
                                <span className="text-border">·</span>
                                <span className="tabular-nums">
                                  {new Date(announcement.createdAt).toLocaleDateString()}
                                </span>
                                <span className="text-border">·</span>
                                <span className="tabular-nums">
                                  {announcement.recipientCount} scholar
                                  {announcement.recipientCount !== 1 ? 's' : ''}
                                </span>
                                {announcement.filters.length > 0 && (
                                  <div className="flex gap-1 ml-1">
                                    {announcement.filters.map((filter, index) => (
                                      <Badge
                                        key={`${filter.type}-${filter.value}-${index}`}
                                        variant="outline"
                                        className="text-[10px] font-normal"
                                      >
                                        {filter.type}: {filter.value}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    'Are you sure you want to delete this announcement? This action cannot be undone.'
                                  )
                                ) {
                                  try {
                                    await deleteAnnouncement(announcement.id);
                                    refetchAnnouncements();
                                  } catch (error) {
                                    console.error('Failed to delete announcement:', error);
                                    alert('Failed to delete announcement. Please try again.');
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}

export default function StaffDashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StaffDashboardContent />
    </Suspense>
  );
}
