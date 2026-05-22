'use client';

import { ArrowRight, Bell, CheckSquare, FileText, Plus, Target, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NewRequestDialog } from '../../../components/new-request-dialog';
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
import { type Goal, getMyGoals } from '../../../lib/api/goals';
import { getMyProfile, type ScholarProfile } from '../../../lib/api/profile';
import { getMyTasks, type Task } from '../../../lib/api/tasks';
import { useSession } from '../../../lib/auth-client';
import { useMyAnnouncements, useMyRequests } from '../../../lib/hooks/use-queries';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: requests } = useMyRequests();
  const { data: announcements } = useMyAnnouncements();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
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
    const actualProgress = g.completionScale * 10;
    return actualProgress >= expectedProgress - 10; // Within 10% of expected
  }).length;
  const onTrackPercentage = goals.length > 0 ? Math.round((goalsOnTrack / goals.length) * 100) : 0;

  // Get recent announcements count
  const recentAnnouncements = announcements?.length || 0;
  const statCards = [
    {
      href: '/tasks',
      title: 'Pending Tasks',
      icon: <CheckSquare className="h-4 w-4 text-ashinaga-teal-600" />,
      value: pendingTasks,
      description: dueSoon === 0 ? 'None due this week' : `${dueSoon} due this week`,
    },
    {
      href: '/goals',
      title: 'Active LDF Goals',
      icon: <Target className="h-4 w-4 text-ashinaga-green-600" />,
      value: activeGoals,
      description: `${onTrackPercentage}% on track`,
    },
    {
      href: '/requests',
      title: 'Open Requests',
      icon: <FileText className="h-4 w-4 text-orange-600" />,
      value: openRequests,
      description:
        openRequests === 0
          ? 'All clear'
          : openRequests === 1
            ? 'Awaiting response'
            : `${openRequests} awaiting response`,
    },
    {
      href: '/announcements',
      title: 'New Announcements',
      icon: <Bell className="h-4 w-4 text-blue-600" />,
      value: recentAnnouncements,
      description:
        recentAnnouncements === 0
          ? 'No new'
          : recentAnnouncements === 1
            ? 'New announcement'
            : 'New announcements',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {session?.user?.name || 'Scholar'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Here's your overview for today</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            aria-label={`${stat.title}: ${stat.value}. ${stat.description}`}
            className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ashinaga-teal-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background"
          >
            <Card className="h-full border-ashinaga-teal-100 dark:border-gray-700 transition-colors duration-200 group-hover:border-ashinaga-teal-300 group-hover:bg-ashinaga-teal-50/60 dark:group-hover:border-gray-600 dark:group-hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <Card className="border-ashinaga-teal-100 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
              <p className="font-medium">{session?.user?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-medium">{session?.user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Program</p>
              <p className="font-medium">{profile?.program || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">University</p>
              <p className="font-medium">{profile?.university || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Year</p>
              <p className="font-medium">{profile?.year || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="border-ashinaga-teal-100 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                LDF Progress
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs shrink-0"
                onClick={() => router.push('/goals')}
              >
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingData ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading LDF...</p>
              </div>
            ) : goals.filter((g) => g.status === 'in_progress').slice(0, 3).length > 0 ? (
              <>
                {goals
                  .filter((g) => g.status === 'in_progress')
                  .slice(0, 3)
                  .map((goal) => (
                    <div key={goal.id}>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm font-medium truncate">{goal.title}</p>
                        <span className="text-sm text-muted-foreground">
                          {goal.completionScale * 10}%
                        </span>
                      </div>
                      <Progress
                        value={goal.completionScale * 10}
                        className="h-2 bg-gray-200 dark:bg-gray-700 [&>div]:bg-gradient-to-r [&>div]:from-ashinaga-teal-600 [&>div]:to-ashinaga-green-600 dark:[&>div]:from-ashinaga-teal-800 dark:[&>div]:to-ashinaga-green-800"
                      />
                    </div>
                  ))}
                <Button
                  onClick={() => router.push('/goals')}
                  className="w-full mt-2 bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700 dark:from-ashinaga-teal-800 dark:to-ashinaga-green-800 dark:hover:from-ashinaga-teal-900 dark:hover:to-ashinaga-green-900"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Update My Progress
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <Target className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No active LDF goals</p>
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
        <Card className="border-ashinaga-teal-100 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Announcements
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs shrink-0"
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
                    <Badge className="mt-0.5 bg-ashinaga-teal-600 hover:bg-ashinaga-teal-700 dark:bg-ashinaga-teal-800 dark:hover:bg-ashinaga-teal-900">
                      New
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">{announcement.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {announcements.length > 2 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                    +{announcements.length - 2} more
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Bell className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No new announcements</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-ashinaga-teal-100 dark:border-gray-700">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto flex-col py-4 border-ashinaga-teal-200 dark:border-border hover:bg-ashinaga-teal-50 dark:hover:bg-muted bg-transparent"
              onClick={() => router.push('/tasks')}
            >
              <CheckSquare className="h-5 w-5 mb-2" />
              <span className="text-sm">View My Tasks</span>
            </Button>
            <NewRequestDialog
              trigger={
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4 border-ashinaga-teal-200 dark:border-border hover:bg-ashinaga-teal-50 dark:hover:bg-muted bg-transparent"
                >
                  <Plus className="h-5 w-5 mb-2" />
                  <span className="text-sm">Create Request</span>
                </Button>
              }
            />
            <Button
              variant="outline"
              className="h-auto flex-col py-4 border-ashinaga-teal-200 dark:border-border hover:bg-ashinaga-teal-50 dark:hover:bg-muted bg-transparent"
              onClick={() => router.push('/announcements')}
            >
              <Bell className="h-5 w-5 mb-2" />
              <span className="text-sm">View Announcements</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4 border-ashinaga-teal-200 dark:border-border hover:bg-ashinaga-teal-50 dark:hover:bg-muted bg-transparent"
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
