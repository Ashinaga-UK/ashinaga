'use client';

import {
  ArrowRight,
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  Plus,
  Target,
  TrendingUp,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { useSession } from '../../../lib/auth-client';
import { useMyAnnouncements, useMyRequests } from '../../../lib/hooks/use-queries';
import { NewRequestDialog } from '../../../components/new-request-dialog';
import { getMyTasks } from '../../../lib/api/tasks';
import { getMyGoals } from '../../../lib/api/goals';
import { getMyProfile, type ScholarProfile } from '../../../lib/api/profile';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: requests } = useMyRequests();
  const { data: announcements } = useMyAnnouncements();
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [profile, setProfile] = useState<ScholarProfile | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tasksData, goalsData, profileData] = await Promise.all([
          getMyTasks(),
          getMyGoals(),
          getMyProfile(),
        ]);
        setTasks(tasksData);
        setGoals(goalsData);
        setProfile(profileData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  // Calculate open requests (pending, reviewed, commented)
  const openRequests =
    requests?.filter(
      (r) => r.status === 'pending' || r.status === 'reviewed' || r.status === 'commented'
    ).length || 0;

  // Calculate pending tasks
  const pendingTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  ).length;
  const dueSoon = tasks.filter((t) => {
    if (t.status === 'completed') return false;
    const dueDate = new Date(t.dueDate);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return dueDate <= weekFromNow;
  }).length;

  // Calculate active goals
  const activeGoals = goals.filter((g) => g.status === 'in_progress').length;
  const goalsOnTrack = goals.filter((g) => {
    if (g.status === 'completed') return true;
    const targetDate = new Date(g.targetDate);
    const now = new Date();
    const totalTime = targetDate.getTime() - new Date(g.createdAt).getTime();
    const elapsedTime = now.getTime() - new Date(g.createdAt).getTime();
    const expectedProgress = (elapsedTime / totalTime) * 100;
    return g.progress >= expectedProgress - 10; // Within 10% of expected
  }).length;
  const onTrackPercentage = goals.length > 0 ? Math.round((goalsOnTrack / goals.length) * 100) : 0;

  // Get recent announcements count
  const recentAnnouncements = announcements?.length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session?.user?.name || 'Scholar'}!
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
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">
              {dueSoon === 0 ? 'None due this week' : `${dueSoon} due this week`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-ashinaga-teal-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active LDF Goals</CardTitle>
            <Target className="h-4 w-4 text-ashinaga-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals}</div>
            <p className="text-xs text-muted-foreground">{onTrackPercentage}% on track</p>
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
            <div className="text-2xl font-bold">{recentAnnouncements}</div>
            <p className="text-xs text-muted-foreground">
              {recentAnnouncements === 0
                ? 'No new'
                : recentAnnouncements === 1
                  ? 'New announcement'
                  : 'New announcements'}
            </p>
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
              <p className="font-medium">{session?.user?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{session?.user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Program</p>
              <p className="font-medium">{profile?.program || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">University</p>
              <p className="font-medium">{profile?.university || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Year</p>
              <p className="font-medium">{profile?.year || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                LDF Progress
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => router.push('/goals')}
              >
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingData ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Loading LDF...</p>
              </div>
            ) : goals.filter((g) => g.status === 'in_progress').slice(0, 3).length > 0 ? (
              goals
                .filter((g) => g.status === 'in_progress')
                .slice(0, 3)
                .map((goal) => (
                  <div key={goal.id}>
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium truncate">{goal.title}</p>
                      <span className="text-sm text-muted-foreground">{goal.progress}%</span>
                    </div>
                    <Progress
                      value={goal.progress}
                      className="h-2 bg-gray-200 [&>div]:bg-gradient-to-r [&>div]:from-ashinaga-teal-600 [&>div]:to-ashinaga-green-600"
                    />
                  </div>
                ))
            ) : (
              <div className="text-center py-4">
                <Target className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No active LDF goals</p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs mt-1"
                  onClick={() => router.push('/goals')}
                >
                  Set your first LDF goal
                </Button>
              </div>
            )}
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
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => router.push('/announcements')}
              >
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements && announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.slice(0, 2).map((announcement) => (
                  <div key={announcement.id} className="flex items-start gap-2">
                    <Badge className="mt-0.5 bg-ashinaga-teal-600 hover:bg-ashinaga-teal-700">
                      New
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">{announcement.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {announcements.length > 2 && (
                  <p className="text-xs text-gray-500 text-center pt-1">
                    +{announcements.length - 2} more
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No new announcements</p>
              </div>
            )}
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
              onClick={() => router.push('/tasks')}
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
              onClick={() => router.push('/announcements')}
            >
              <Bell className="h-5 w-5 mb-2" />
              <span className="text-sm">View Announcements</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4 border-ashinaga-teal-200 hover:bg-ashinaga-teal-50 bg-transparent"
              onClick={() => router.push('/goals')}
            >
              <Target className="h-5 w-5 mb-2" />
              <span className="text-sm">My LDF & Progress</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
