'use client';

import {
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

export default function ScholarDashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState('overview');

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
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {session.user.name || 'Scholar'}!</h1>
        <p className="text-muted-foreground mt-1">Here's your overview for today</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">2 due this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">80% on track</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Announcements</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Since last login</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{session.user.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Program</p>
              <p className="font-medium">Computer Science</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">University</p>
              <p className="font-medium">Tokyo University</p>
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card>
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
              <Progress value={75} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm font-medium">Research Project</p>
                <span className="text-sm text-muted-foreground">60%</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm font-medium">Community Service</p>
                <span className="text-sm text-muted-foreground">90%</span>
              </div>
              <Progress value={90} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
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
                <Badge variant="default" className="mt-0.5">
                  New
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Scholarship Renewal</p>
                  <p className="text-xs text-muted-foreground">Submit documents by Dec 15</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="default" className="mt-0.5">
                  New
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Monthly Meeting</p>
                  <p className="text-xs text-muted-foreground">Virtual meeting on Dec 20</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto flex-col py-4">
              <CheckSquare className="h-5 w-5 mb-2" />
              <span className="text-sm">View My Tasks</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Plus className="h-5 w-5 mb-2" />
              <span className="text-sm">Create Request</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Bell className="h-5 w-5 mb-2" />
              <span className="text-sm">View Announcements</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
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
      <h2 className="text-2xl font-bold mb-4">My Goals</h2>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Your goals and progress tracking will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function TasksContent() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Tasks</h2>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Your assigned tasks will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RequestsContent() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">My Requests</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Your requests to staff will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AnnouncementsContent() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Announcements</h2>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Announcements from staff will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
