'use client';

import { Activity, AlertCircle, Clock, FileCheck, FileText, MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getRequests, type Request } from '../lib/api-client';
import { REQUEST_TYPE_LABELS } from '../lib/form-data-labels';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';

interface RecentActivityProps {
  onNavigateToRequests: () => void;
  refreshTrigger: number;
}

export function RecentActivity({ onNavigateToRequests, refreshTrigger }: RecentActivityProps) {
  const [activities, setActivities] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRequests({
        limit: 5,
        sortBy: 'submittedDate',
        sortOrder: 'desc',
      });
      setActivities(response?.data || []);
    } catch (err) {
      console.error('Error fetching recent activities for dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity, refreshTrigger]);

  const getActivityIcon = (type: Request['type']) => {
    switch (type) {
      case 'extenuating_circumstances':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'summer_funding_request':
        return <FileText className="h-4 w-4 text-emerald-500" />;
      case 'summer_funding_report':
        return <FileCheck className="h-4 w-4 text-blue-500" />;
      case 'requirement_submission':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusStyle = (status: Request['status']) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 border-green-200/50 bg-green-50 dark:bg-green-950/20';
      case 'rejected':
        return 'text-red-600 border-red-200/50 bg-red-50 dark:bg-red-950/20';
      case 'pending':
        return 'text-orange-600 border-orange-200/50 bg-orange-50 dark:bg-orange-950/20';
      case 'reviewed':
        return 'text-purple-600 border-purple-200/50 bg-purple-50 dark:bg-purple-950/20';
      case 'commented':
        return 'text-blue-600 border-blue-200/50 bg-blue-50 dark:bg-blue-950/20';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="border border-border/40 bg-card/40 backdrop-blur-sm flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Activity className="h-4.5 w-4.5 text-muted-foreground" />
          Recent Activity Feed
        </CardTitle>
        <CardDescription className="text-xs">
          Latest updates and scholar submissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-start">
        {loading ? (
          <div className="space-y-3 py-1">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center flex-1">
            <p className="text-xs font-medium text-foreground">Activity feed unavailable</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center flex-1 border border-dashed rounded-lg border-border/60">
            <p className="text-xs font-semibold text-foreground">No recent activity</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              New updates will populate here.
            </p>
          </div>
        ) : (
          <div className="relative border-l border-border/40 pl-3.5 space-y-4 py-1.5 ml-1">
            {activities.map((act) => {
              const label = REQUEST_TYPE_LABELS[act.type] || act.type.replace(/_/g, ' ');
              return (
                <div key={act.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[23.5px] top-0.5 rounded-full border border-background bg-card flex h-5 w-5 items-center justify-center shadow-sm">
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground block truncate">
                        {act.scholarName}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(act.submittedDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground truncate flex-1">
                        Submitted {label}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-medium tracking-wide uppercase px-1 py-0 h-3.5 shrink-0 ${getStatusStyle(
                          act.status
                        )}`}
                      >
                        {act.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
