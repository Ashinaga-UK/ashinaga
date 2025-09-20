'use client';

import { AlertCircle, FileText, Loader2, MessageSquare, Plus, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { AnnouncementCreator } from '../components/announcement-creator';
import { LoginPage } from '../components/login-page';
import { MyProfile } from '../components/my-profile';
import { RequestManagement } from '../components/request-management';
import { ScholarManagementTable } from '../components/scholar-management-table';
import { ScholarOnboarding } from '../components/scholar-onboarding';
import { ScholarProfilePage } from '../components/scholar-profile';
import { TaskAssignment } from '../components/task-assignment';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  type Announcement,
  getRequestStats,
  getRequests,
  getScholarStats,
  type Request,
  type RequestStats,
  type ScholarStats,
} from '../lib/api-client';
import { signOut, useSession } from '../lib/auth-client';
import { useAnnouncements } from '../lib/hooks/use-queries';

function StaffDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();

  // Get values from URL or use defaults
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const viewFromUrl = searchParams.get('view') || 'dashboard';
  const scholarIdFromUrl = searchParams.get('scholarId');
  const scholarTabFromUrl = searchParams.get('scholarTab') || 'goals';

  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [currentView, setCurrentView] = useState<
    'dashboard' | 'scholar-profile' | 'onboarding' | 'task-assignment' | 'my-profile'
  >(viewFromUrl as any);
  const [selectedScholarId, setSelectedScholarId] = useState<string | null>(scholarIdFromUrl);
  const [scholarProfileTab, setScholarProfileTab] = useState<'goals' | 'tasks' | 'documents'>(
    scholarTabFromUrl as any
  );
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requests, setRequests] = useState<Request[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [scholarStats, setScholarStats] = useState<ScholarStats | null>(null);
  const [scholarStatsLoading, setScholarStatsLoading] = useState(true);
  const [requestStats, setRequestStats] = useState<RequestStats | null>(null);
  const [requestStatsLoading, setRequestStatsLoading] = useState(true);

  // Get user data from session
  const user = session.data?.user;
  const isLoading = session.isPending;
  const isAuthenticated = !!user;
  const isStaff = user?.userType === 'staff';

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
  } = useAnnouncements(isAuthenticated);

  // Update state when URL changes
  useEffect(() => {
    const newTab = searchParams.get('tab') || 'overview';
    const newView = searchParams.get('view') || 'dashboard';
    const newScholarId = searchParams.get('scholarId');
    const newScholarTab = searchParams.get('scholarTab') || 'goals';

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
    setScholarProfileTab((newScholarTab || 'goals') as 'goals' | 'tasks' | 'documents');
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
        return 'text-green-600';
      case 'approved':
        return 'text-green-600';
      case 'in-progress':
        return 'text-blue-600';
      case 'pending':
        return 'text-orange-600';
      case 'reviewed':
        return 'text-purple-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const response = await getRequests({
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
      setRequests(response.data);
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : 'Failed to load requests');
      console.error('Error fetching requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, [requestStatusFilter]);

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

  // Announcements are now fetched via React Query

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (isAuthenticated) {
      fetchRequests();
      fetchScholarStats();
      fetchRequestStats();
      // Announcements are now auto-fetched by React Query
    }
  }, [isAuthenticated, fetchRequests, fetchScholarStats, fetchRequestStats]);

  const handleRequestStatusUpdate = (requestId: string, status: string, comment?: string) => {
    console.log('Request updated:', { requestId, status, comment });
    // In real app, update the request status in your state/API
    // For now, just refetch the data
    fetchRequests();
  };

  const navigateToScholars = () => {
    router.push('?tab=scholars');
  };

  const navigateToRequests = () => {
    router.push('?tab=requests');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50">
      {/* Header */}
      <header className="bg-white border-b border-ashinaga-teal-100 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Ashinaga Staff Portal</h1>
              <p className="text-sm text-gray-600">Supporting Scholar Success</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('?view=my-profile')}>
              My Profile
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Logout
            </Button>
            <Avatar>
              <AvatarFallback>
                {user?.name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentView === 'onboarding' ? (
          <ScholarOnboarding onBack={() => router.push('/')} />
        ) : currentView === 'my-profile' ? (
          <MyProfile onBack={() => router.push('/')} />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(tab) => router.push(tab === 'overview' ? '/' : `?tab=${tab}`)}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scholars">Scholars</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={navigateToScholars}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Total Scholars</p>
                        {scholarStatsLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-2xl font-bold text-gray-900">Loading...</span>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">
                            {scholarStats?.total || 0}
                          </p>
                        )}
                        <p className="text-xs text-green-600 mt-1">
                          {scholarStats?.active || 0} active
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-r from-ashinaga-teal-100 to-ashinaga-green-100 rounded-lg flex items-center justify-center">
                        <Users className="h-6 w-6 text-ashinaga-teal-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={navigateToRequests}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                        {requestStatsLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-2xl font-bold text-gray-900">Loading...</span>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">
                            {requestStats?.pending || 0}
                          </p>
                        )}
                        <p className="text-xs text-orange-600 mt-1">
                          {requestStats?.total || 0} total requests
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Common tasks to help you support scholars efficiently
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button
                      className="h-20 flex-col gap-2 bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
                      onClick={() => router.push('?view=onboarding')}
                    >
                      <Users className="h-6 w-6" />
                      Onboard Scholar
                    </Button>
                    <TaskAssignment
                      trigger={
                        <Button
                          variant="outline"
                          className="h-20 flex-col gap-2 border-ashinaga-teal-200 hover:bg-ashinaga-teal-50 bg-transparent w-full"
                        >
                          <FileText className="h-6 w-6" />
                          Assign Task to Scholar
                        </Button>
                      }
                      onSuccess={(scholarId) => {
                        // Navigate to scholar profile with tasks tab open
                        router.push(
                          `?tab=scholars&view=scholar-profile&scholarId=${scholarId}&scholarTab=tasks`
                        );
                      }}
                    />
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2 border-ashinaga-teal-200 hover:bg-ashinaga-teal-50 bg-transparent"
                      onClick={() => router.push('?tab=announcements')}
                    >
                      <MessageSquare className="h-6 w-6" />
                      Create Announcement
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2 border-ashinaga-teal-200 hover:bg-ashinaga-teal-50 bg-transparent"
                      onClick={() => router.push('?tab=requests')}
                    >
                      <FileText className="h-6 w-6" />
                      Review Requests
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                  <CardHeader>
                    <CardTitle>Scholar Management</CardTitle>
                    <CardDescription>View and manage your assigned scholars</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Scholar Requests</CardTitle>
                      <CardDescription>Review and respond to scholar submissions</CardDescription>
                    </div>
                    <Select value={requestStatusFilter} onValueChange={setRequestStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {requestsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading requests...</span>
                    </div>
                  ) : requestsError ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                      <p className="text-red-600">{requestsError}</p>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No requests found</p>
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

            <TabsContent value="announcements" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Announcements</CardTitle>
                      <CardDescription>
                        Create and manage announcements for scholars
                      </CardDescription>
                    </div>
                    <AnnouncementCreator />
                  </div>
                </CardHeader>
                <CardContent>
                  {announcementsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading announcements...</span>
                    </div>
                  ) : announcementsError ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                      <p className="text-red-600">
                        {announcementsError?.message || 'Failed to load announcements'}
                      </p>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No announcements yet. Create your first announcement to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-2">{announcement.title}</h3>
                              <p className="text-gray-600 mb-3 whitespace-pre-wrap">
                                {announcement.content}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-500">
                                  <span>By {announcement.createdBy}</span>
                                  <span className="mx-2">•</span>
                                  <span>
                                    {new Date(announcement.createdAt).toLocaleDateString()}
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span>
                                    Sent to {announcement.recipientCount} scholar
                                    {announcement.recipientCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {announcement.filters.length > 0 && (
                                  <div className="flex gap-1">
                                    {announcement.filters.map((filter, index) => (
                                      <Badge
                                        key={`${filter.type}-${filter.value}-${index}`}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {filter.type}: {filter.value}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
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
