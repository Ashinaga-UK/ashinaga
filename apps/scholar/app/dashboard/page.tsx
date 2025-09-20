'use client';

import {
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  MapPin,
  Plus,
  School,
  Target,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarLayout } from '../../components/sidebar-layout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { signOut, useSession } from '../../lib/auth-client';
import { useMyAnnouncements, useMyRequests } from '../../lib/hooks/use-queries';
import { RequestCard } from '../../components/request-card';
import { NewRequestDialog } from '../../components/new-request-dialog';

export default function ScholarDashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState('overview');

  // Get user data from session
  const user = session?.user;
  const isAuthenticated = !!user;
  const isScholar = user?.userType === 'scholar';

  // Handle non-scholar users
  useEffect(() => {
    if (isAuthenticated && !isScholar) {
      // Sign out and redirect to login with access denied message
      signOut();
      router.push('/?accessDenied=true');
    }
  }, [isAuthenticated, isScholar, router]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/');
    }
  }, [session, isPending, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewContent session={session} />;
      case 'goals':
        return <GoalsContent />;
      case 'tasks':
        return <TasksContent />;
      case 'requests':
        return <RequestsContent />;
      case 'announcements':
        return <AnnouncementsContent />;
      default:
        return <OverviewContent session={session} />;
    }
  };

  return (
    <SidebarLayout activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}>
      {renderContent()}
    </SidebarLayout>
  );
}

function OverviewContent({ session }: { session: any }) {
  const { data: requests } = useMyRequests();
  const { data: announcements } = useMyAnnouncements();

  // Calculate open requests (pending, reviewed, commented)
  const openRequests =
    requests?.filter(
      (r) => r.status === 'pending' || r.status === 'reviewed' || r.status === 'commented'
    ).length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session.user.name || 'Scholar'}!
        </h1>
        <p className="text-gray-600 mt-1">Here's your overview for today</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-ashinaga-teal-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-ashinaga-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">2 due this week</p>
          </CardContent>
        </Card>

        <Card className="border-ashinaga-teal-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-ashinaga-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">80% on track</p>
          </CardContent>
        </Card>

        <Card className="border-ashinaga-teal-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRequests}</div>
            <p className="text-xs text-muted-foreground">
              {openRequests === 0
                ? 'All clear'
                : openRequests === 1
                  ? 'Awaiting response'
                  : `${openRequests} awaiting response`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-ashinaga-teal-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Announcements</CardTitle>
            <Bell className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Since last login</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{session.user.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Program</p>
              <p className="font-medium">Computer Science</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">University</p>
              <p className="font-medium">Tokyo University</p>
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goals Progress
              </span>
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm font-medium">Academic Excellence</p>
                <span className="text-sm text-muted-foreground">75%</span>
              </div>
              <Progress
                value={75}
                className="h-2 bg-gray-200 [&>div]:bg-gradient-to-r [&>div]:from-ashinaga-teal-600 [&>div]:to-ashinaga-green-600"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm font-medium">Research Project</p>
                <span className="text-sm text-muted-foreground">60%</span>
              </div>
              <Progress
                value={60}
                className="h-2 bg-gray-200 [&>div]:bg-gradient-to-r [&>div]:from-ashinaga-teal-600 [&>div]:to-ashinaga-green-600"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm font-medium">Community Service</p>
                <span className="text-sm text-muted-foreground">90%</span>
              </div>
              <Progress
                value={90}
                className="h-2 bg-gray-200 [&>div]:bg-gradient-to-r [&>div]:from-ashinaga-teal-600 [&>div]:to-ashinaga-green-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Announcements
              </span>
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge className="mt-0.5 bg-ashinaga-teal-600 hover:bg-ashinaga-teal-700">
                  New
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Scholarship Renewal</p>
                  <p className="text-xs text-gray-500">Submit documents by Dec 15</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="mt-0.5 bg-ashinaga-teal-600 hover:bg-ashinaga-teal-700">
                  New
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Monthly Meeting</p>
                  <p className="text-xs text-gray-500">Virtual meeting on Dec 20</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-ashinaga-teal-100">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto flex-col py-4 border-ashinaga-teal-200 hover:bg-ashinaga-teal-50 bg-transparent"
            >
              <CheckSquare className="h-5 w-5 mb-2" />
              <span className="text-sm">View My Tasks</span>
            </Button>
            <NewRequestDialog
              trigger={
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4 border-ashinaga-teal-200 hover:bg-ashinaga-teal-50 bg-transparent"
                >
                  <Plus className="h-5 w-5 mb-2" />
                  <span className="text-sm">Create Request</span>
                </Button>
              }
            />
            <Button
              variant="outline"
              className="h-auto flex-col py-4 border-ashinaga-teal-200 hover:bg-ashinaga-teal-50 bg-transparent"
            >
              <Bell className="h-5 w-5 mb-2" />
              <span className="text-sm">View Announcements</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4 border-ashinaga-teal-200 hover:bg-ashinaga-teal-50 bg-transparent"
            >
              <Target className="h-5 w-5 mb-2" />
              <span className="text-sm">My Goals & Progress</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GoalsContent() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">My Goals</h2>
      <Card className="border-ashinaga-teal-100">
        <CardContent className="pt-6">
          <p className="text-gray-600">Your goals and progress tracking will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function TasksContent() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">My Tasks</h2>
      <Card className="border-ashinaga-teal-100">
        <CardContent className="pt-6">
          <p className="text-gray-600">Your assigned tasks will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RequestsContent() {
  const { data: requests, isLoading, error, refetch } = useMyRequests();

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">My Requests</h2>
        <NewRequestDialog
          trigger={
            <Button className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          }
          onSuccess={() => refetch()}
        />
      </div>

      {isLoading ? (
        <Card className="border-ashinaga-teal-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4">
                  <div className="w-full h-full rounded-full border-4 border-ashinaga-teal-200 border-t-ashinaga-teal-600 animate-spin" />
                </div>
                <p className="text-gray-600">Loading requests...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-600">Failed to load requests. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : !requests || requests.length === 0 ? (
        <Card className="border-ashinaga-teal-100">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No requests yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Click "New Request" to submit your first request
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsContent() {
  const { data: announcements, isLoading, error } = useMyAnnouncements();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>

      {isLoading ? (
        <Card className="border-ashinaga-teal-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4">
                  <div className="w-full h-full rounded-full border-4 border-ashinaga-teal-200 border-t-ashinaga-teal-600 animate-spin" />
                </div>
                <p className="text-gray-600">Loading announcements...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-600">Failed to load announcements. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : !announcements || announcements.length === 0 ? (
        <Card className="border-ashinaga-teal-100">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No announcements yet</p>
              <p className="text-sm text-gray-500 mt-2">Check back later for updates from staff</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="border-ashinaga-teal-100">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <span>From {announcement.createdBy}</span>
                      <span>•</span>
                      <span>
                        {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
