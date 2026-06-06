'use client';

import {
  AlertCircle,
  FileText,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { forwardRef, Suspense, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActionableInbox } from '../components/actionable-inbox';
import { AnnouncementCreator } from '../components/announcement-creator';
import { DashboardCharts } from '../components/dashboard-charts';
import { InvitationsManagement } from '../components/invitations-management';
import { LoginPage } from '../components/login-page';
import { MyProfile } from '../components/my-profile';
import { OnboardScholarDialog } from '../components/onboard-scholar-dialog';
import { OnboardingTracker } from '../components/onboarding-tracker';
import { RecentActivity } from '../components/recent-activity';
import { RequestManagement } from '../components/request-management';
import { ReviewRequestsDialog } from '../components/review-requests-dialog';
import { ScholarManagementTable } from '../components/scholar-management-table';
import { ScholarOnboarding } from '../components/scholar-onboarding';
import { ScholarProfilePage } from '../components/scholar-profile';
import { StaffInviteDialog } from '../components/staff-invite-dialog';
import { TaskAssignment } from '../components/task-assignment';
import { TaskMonitor } from '../components/task-monitor';
import { ThemeToggle } from '../components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  type AnnouncementFilterOptions,
  deleteAnnouncement,
  getAnnouncementFilterOptions,
  getInvitations,
  getRequestStats,
  getRequests,
  getScholarStats,
  getScholarYearStats,
  type Request,
  type RequestStats,
  type Scholar,
  type ScholarStats,
} from '../lib/api-client';
import { signOut, useSession } from '../lib/auth-client';
import { useAnnouncements } from '../lib/hooks/use-queries';
import { cn } from '../lib/utils';

type StaffDashboardView =
  | 'dashboard'
  | 'scholar-profile'
  | 'onboarding'
  | 'task-assignment'
  | 'my-profile';

const STAFF_NAV_ITEMS = [
  { value: 'overview', label: 'Overview' },
  { value: 'scholars', label: 'Scholars' },
  { value: 'requests', label: 'Requests' },
  { value: 'announcements', label: 'Announcements' },
  { value: 'invitations', label: 'Invitations' },
];

interface QuickActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  description?: string;
  primary?: boolean;
}

const QuickActionButton = forwardRef<HTMLButtonElement, QuickActionButtonProps>(
  ({ icon, label, description, primary, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'group relative flex min-w-0 items-center gap-3 bg-card px-4 py-4 text-left text-sm transition-colors sm:px-5',
        'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:z-10',
        'lg:flex-col lg:items-start lg:justify-between lg:rounded-lg lg:border lg:border-border lg:p-4 lg:hover:border-foreground/20',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background transition-colors',
          primary && 'border-transparent bg-brand text-brand-foreground'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{label}</span>
        {description && (
          <span className="mt-1 hidden text-xs leading-5 text-muted-foreground lg:block">
            {description}
          </span>
        )}
      </span>
    </button>
  )
);
QuickActionButton.displayName = 'QuickActionButton';

function StaffDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();

  const quickActionsRef = useRef<HTMLDivElement>(null);
  const [quickActionsHeight, setQuickActionsHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!quickActionsRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setQuickActionsHeight(entry.target.getBoundingClientRect().height);
      }
    });
    observer.observe(quickActionsRef.current);
    return () => observer.disconnect();
  }, []);

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
  const [scholarProfileTab, setScholarProfileTab] = useState<
    'profile' | 'goals' | 'tasks' | 'documents'
  >((scholarTabFromUrl as 'profile' | 'goals' | 'tasks' | 'documents') || 'profile');
  const [requestCategoryFilter, setRequestCategoryFilter] = useState('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
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
  const [requests, setRequests] = useState<Request[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [scholarStats, setScholarStats] = useState<ScholarStats | null>(null);
  const [scholarStatsLoading, setScholarStatsLoading] = useState(true);
  const [requestStats, setRequestStats] = useState<RequestStats | null>(null);
  const [requestStatsLoading, setRequestStatsLoading] = useState(true);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [pendingInvitesLoading, setPendingInvitesLoading] = useState(true);
  const [dashboardRefreshTrigger, setDashboardRefreshTrigger] = useState(0);
  const [scholarYearStats, setScholarYearStats] = useState<{year: string, count: number}[]>([]);
  const [scholarYearStatsLoading, setScholarYearStatsLoading] = useState(true);

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
      signOut();
      router.push('/login?accessDenied=true');
    }
  }, [isAuthenticated, isStaff, router]);

  // Use React Query for announcements (only when authenticated)
  const {
    data: announcements = [],
    isLoading: announcementsLoading,
    error: announcementsError,
    refetch: refetchAnnouncements,
  } = useAnnouncements(announcementParams, isAuthenticated);

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
    setScholarProfileTab(
      (newScholarTab || 'profile') as 'profile' | 'goals' | 'tasks' | 'documents'
    );
  }, [searchParams]);

  const _getPriorityColor = (priority: string) => {
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

  const _getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'approved':
        return 'text-green-600 dark:text-green-400';
      case 'in-progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'pending':
        return 'text-orange-600';
      case 'reviewed':
        return 'text-purple-600 dark:text-purple-400';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const response = await getRequests({
        type:
          requestCategoryFilter !== 'all'
            ? (requestCategoryFilter as
                | 'extenuating_circumstances'
                | 'summer_funding_request'
                | 'summer_funding_report'
                | 'requirement_submission')
            : undefined,
        status:
          requestStatusFilter !== 'all'
            ? (requestStatusFilter as
                | 'pending'
                | 'approved'
                | 'rejected'
                | 'reviewed'
                | 'commented')
            : undefined,
        sortBy: 'submittedDate',
        sortOrder: 'desc',
      });
      setRequests(response?.data || []);
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : 'Failed to load requests');
      console.error('Error fetching requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, [requestCategoryFilter, requestStatusFilter]);

  const fetchScholarStats = useCallback(async () => {
    setScholarStatsLoading(true);
    try {
      const stats = await getScholarStats();
      setScholarStats(stats);
    } catch (err) {
      console.error('Error fetching scholar stats:', err);
    } finally {
      setScholarStatsLoading(false);
    }
  }, []);

  const fetchRequestStats = useCallback(async () => {
    setRequestStatsLoading(true);
    try {
      const stats = await getRequestStats();
      setRequestStats(stats);
    } catch (err) {
      console.error('Error fetching request stats:', err);
    } finally {
      setRequestStatsLoading(false);
    }
  }, []);

  const fetchAnnouncementFilterOptions = useCallback(async () => {
    try {
      const options = await getAnnouncementFilterOptions();
      setAnnouncementFilterOptions(options);
    } catch (err) {
      console.error('Error fetching announcement filter options:', err);
    }
  }, []);

  // Announcements are now fetched via React Query

  const fetchPendingInvitesCount = useCallback(async () => {
    setPendingInvitesLoading(true);
    try {
      const list = await getInvitations('pending');
      setPendingInvitesCount(Array.isArray(list) ? list.length : 0);
    } catch (err) {
      console.error('Error fetching pending invitations:', err);
    } finally {
      setPendingInvitesLoading(false);
    }
  }, []);

  const fetchScholarYearStats = useCallback(async () => {
    setScholarYearStatsLoading(true);
    try {
      const response = await getScholarYearStats();
      setScholarYearStats(response || []);
    } catch (err) {
      console.error('Error fetching scholars year stats:', err);
    } finally {
      setScholarYearStatsLoading(false);
    }
  }, []);

  const handleDashboardDataRefresh = useCallback(() => {
    fetchScholarStats();
    fetchRequestStats();
    fetchPendingInvitesCount();
    fetchScholarYearStats();
    setDashboardRefreshTrigger((prev) => prev + 1);
  }, [fetchScholarStats, fetchRequestStats, fetchPendingInvitesCount, fetchScholarYearStats]);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (isAuthenticated) {
      fetchRequests();
      fetchScholarStats();
      fetchRequestStats();
      fetchPendingInvitesCount();
      fetchScholarYearStats();
      fetchAnnouncementFilterOptions();
      // Announcements are now auto-fetched by React Query
    }
  }, [
    isAuthenticated,
    fetchRequests,
    fetchScholarStats,
    fetchRequestStats,
    fetchPendingInvitesCount,
    fetchScholarYearStats,
    fetchAnnouncementFilterOptions,
  ]);

  const clearAnnouncementFilters = () => {
    setAnnouncementYearFilter('all');
    setAnnouncementProgramFilter('all');
    setAnnouncementUniversityFilter('all');
    setAnnouncementStatusFilter('active');
    setAnnouncementSortOrder('desc');
  };

  const handleRequestStatusUpdate = (requestId: string, status: string, comment?: string) => {
    console.log('Request updated:', { requestId, status, comment });
    fetchRequests();
    fetchRequestStats();
  };

  const navigateToScholars = () => {
    setActiveTab('scholars');
    setCurrentView('dashboard');
    router.push('?tab=scholars');
  };

  const navigateToRequests = () => {
    setActiveTab('requests');
    setCurrentView('dashboard');
    router.push('?tab=requests');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentView('dashboard');
    router.push(tab === 'overview' ? '/' : `?tab=${tab}`);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header — sticky, glassy, sleek */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand">
              <span className="text-brand-foreground font-semibold text-sm">A</span>
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <h1 className="truncate text-sm font-medium text-foreground">Ashinaga Staff</h1>
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                Supporting Scholar Success
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-0 sm:w-auto sm:px-3"
              onClick={handleSignOut}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <button
              type="button"
              className="ml-2 rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={() => router.push('?view=my-profile')}
              aria-label="Open my profile"
            >
              <Avatar className="h-8 w-8 cursor-pointer max-[380px]:hidden">
                {user?.image && <AvatarImage src={user.image} alt={user.name || 'User'} />}
                <AvatarFallback className="text-xs">
                  {user?.name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-5 animate-fade-in sm:px-6 sm:py-8">
        {currentView === 'onboarding' ? (
          <ScholarOnboarding onBack={() => router.push('/')} />
        ) : currentView === 'my-profile' ? (
          <MyProfile onBack={() => router.push('/')} />
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {activeTab === 'overview' && 'Overview'}
                  {activeTab === 'scholars' && 'Scholars'}
                  {activeTab === 'requests' && 'Requests'}
                  {activeTab === 'announcements' && 'Announcements'}
                  {activeTab === 'invitations' && 'Invitations'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeTab === 'overview' && 'Your dashboard at a glance.'}
                  {activeTab === 'scholars' && 'View and manage your assigned scholars.'}
                  {activeTab === 'requests' && 'Review and respond to scholar submissions.'}
                  {activeTab === 'announcements' && 'Create and manage announcements.'}
                  {activeTab === 'invitations' && 'Invite scholars and staff to the portal.'}
                </p>
              </div>
              <div className="sm:hidden">
                <Select value={activeTab} onValueChange={handleTabChange}>
                  <SelectTrigger aria-label="Section" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_NAV_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TabsList className="hidden h-auto flex-wrap sm:inline-flex">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scholars">Scholars</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Overview — flatter, tabular numerals, brand chip rather than gradient tile */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={navigateToScholars}
                  className="group text-left rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Total Scholars
                      </p>
                      {scholarStatsLoading ? (
                        <Skeleton className="h-9 w-20" />
                      ) : (
                        <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                          {scholarStats?.total || 0}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))] mr-1.5 align-middle" />
                        {scholarStats?.active || 0} active
                      </p>
                    </div>
                    <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 transition-colors group-hover:bg-muted min-[430px]:flex sm:h-9 sm:w-9">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={navigateToRequests}
                  className="group text-left rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Pending Requests
                      </p>
                      {requestStatsLoading ? (
                        <Skeleton className="h-9 w-20" />
                      ) : (
                        <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                          {requestStats?.pending || 0}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground tabular-nums">
                        of {requestStats?.total || 0} total
                      </p>
                    </div>
                    <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 transition-colors group-hover:bg-muted min-[430px]:flex sm:h-9 sm:w-9">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('invitations')}
                  className="group text-left rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Pending Invitations
                      </p>
                      {pendingInvitesLoading ? (
                        <Skeleton className="h-9 w-20" />
                      ) : (
                        <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                          {pendingInvitesCount}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">Awaiting registration</p>
                    </div>
                    <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 transition-colors group-hover:bg-muted min-[430px]:flex sm:h-9 sm:w-9">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Charts Section */}
              <DashboardCharts
                scholarStats={scholarStats}
                requestStats={requestStats}
                scholarYearStats={scholarYearStats}
                scholarLoading={scholarStatsLoading}
                requestLoading={requestStatsLoading}
                scholarsLoading={scholarYearStatsLoading}
              />

              {/* Two-Column Stack Layout for Dashboard Elements */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Column Stack (Span 2) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <ActionableInbox
                    onNavigateToRequests={() => handleTabChange('requests')}
                    onRequestReviewed={handleDashboardDataRefresh}
                    height={quickActionsHeight}
                    refreshTrigger={dashboardRefreshTrigger}
                  />
                  
                  <TaskMonitor refreshTrigger={dashboardRefreshTrigger} />
                  
                  <OnboardingTracker
                    onNavigateToInvitations={() => handleTabChange('invitations')}
                    onInviteUpdate={handleDashboardDataRefresh}
                  />
                </div>

                {/* Right Column Stack (Span 1) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  {/* Quick Actions Card */}
                  <Card className="border border-border bg-card shadow-sm flex flex-col" ref={quickActionsRef}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
                      <CardDescription className="text-xs">
                        Common portal management tasks.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2 flex-1 justify-center">
                      <OnboardScholarDialog
                        trigger={
                          <QuickActionButton
                            icon={<Users className="h-4 w-4" />}
                            label="Onboard Scholar"
                            primary
                            className="rounded-lg border border-border w-full py-3"
                          />
                        }
                      />
                      <TaskAssignment
                        trigger={
                          <QuickActionButton
                            icon={<FileText className="h-4 w-4" />}
                            label="Assign Task"
                            className="rounded-lg border border-border w-full py-3"
                          />
                        }
                        onSuccess={(scholarId) => {
                          router.push(
                            `?tab=scholars&view=scholar-profile&scholarId=${scholarId}&scholarTab=tasks`
                          );
                        }}
                      />
                      <AnnouncementCreator
                        trigger={
                          <QuickActionButton
                            icon={<MessageSquare className="h-4 w-4" />}
                            label="Create Announcement"
                            className="rounded-lg border border-border w-full py-3"
                          />
                        }
                      />
                      <ReviewRequestsDialog
                        trigger={
                          <QuickActionButton
                            icon={<FileText className="h-4 w-4" />}
                            label="Review Requests"
                            className="rounded-lg border border-border w-full py-3"
                          />
                        }
                        onUpdate={handleDashboardDataRefresh}
                      />
                      <StaffInviteDialog
                        trigger={
                          <QuickActionButton
                            icon={<UserPlus className="h-4 w-4" />}
                            label="Invite Staff"
                            className="rounded-lg border border-border w-full py-3"
                          />
                        }
                      />
                    </CardContent>
                  </Card>
                  <RecentActivity
                    onNavigateToRequests={() => handleTabChange('requests')}
                    refreshTrigger={dashboardRefreshTrigger}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scholars" className="space-y-6">
              {currentView === 'scholar-profile' && selectedScholarId ? (
                <ScholarProfilePage
                  scholarId={selectedScholarId}
                  initialTab={scholarProfileTab}
                  onBack={() => {
                    router.push('?tab=scholars&view=dashboard');
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-4 sm:p-5">
                    <ScholarManagementTable
                      onViewProfile={(scholarId) => {
                        router.push(`?tab=scholars&view=scholar-profile&scholarId=${scholarId}`);
                      }}
                      onOnboardScholar={() => router.push('?view=onboarding')}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-6">
              <Card>
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={requestCategoryFilter} onValueChange={setRequestCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="extenuating_circumstances">
                          Extenuating Circumstances
                        </SelectItem>
                        <SelectItem value="summer_funding_request">
                          Summer Funding Request
                        </SelectItem>
                        <SelectItem value="summer_funding_report">Summer Funding Report</SelectItem>
                        <SelectItem value="requirement_submission">
                          Requirement Submission
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={requestStatusFilter} onValueChange={setRequestStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="commented">Commented</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CardContent className="p-4 sm:p-5">
                  {requestsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : requestsError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Couldn't load requests</p>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{requestsError}</p>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No requests</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Scholar submissions will show up here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request) => (
                        <RequestManagement
                          key={request.id}
                          request={request}
                          onStatusUpdate={handleRequestStatusUpdate}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invitations" className="space-y-6">
              <InvitationsManagement />
            </TabsContent>

            <TabsContent value="announcements" className="space-y-6">
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
                        onValueChange={(value) => setAnnouncementSortOrder(value as 'asc' | 'desc')}
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
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StaffDashboardContent />
    </Suspense>
  );
}
