'use client';

import { AlertCircle, ArrowRight, Inbox } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getRequests, type Request } from '../lib/api-client';
import { RequestManagement } from './request-management';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';

interface ActionableInboxProps {
  onNavigateToRequests: () => void;
  onRequestReviewed: () => void;
  height?: number | null;
}

export function ActionableInbox({
  onNavigateToRequests,
  onRequestReviewed,
  height,
}: ActionableInboxProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRequests({
        status: 'pending',
        limit: 3,
        sortBy: 'submittedDate',
        sortOrder: 'desc',
      });
      setRequests(response?.data || []);
    } catch (err) {
      console.error('Error fetching pending requests for dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleStatusUpdate = (requestId: string, status: string, comment?: string) => {
    // Refresh local list
    fetchPendingRequests();
    // Notify parent to refresh stats
    onRequestReviewed();
  };

  return (
    <Card
      className="border border-border/40 bg-card/40 backdrop-blur-sm flex flex-col"
      style={height ? { height: `${height}px` } : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold">Actionable Inbox</CardTitle>
          <CardDescription className="text-xs">
            Review and respond to pending scholar submissions.
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onNavigateToRequests} className="text-xs h-8">
          View all
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-start overflow-hidden">
        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-[120px] w-full rounded-lg" />
            <Skeleton className="h-[120px] w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-4.5 w-4.5 text-destructive" />
            </div>
            <p className="text-xs font-medium text-foreground">Couldn't load pending inbox</p>
            <p className="mt-1 text-[11px] text-muted-foreground max-w-[250px]">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center flex-1 border border-dashed rounded-lg border-border/60">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted/40">
              <Inbox className="h-5 w-5 text-muted-foreground/80" />
            </div>
            <p className="text-xs font-semibold text-foreground">Inbox completely clear</p>
            <p className="mt-1 text-[11px] text-muted-foreground max-w-[200px]">
              Outstanding submissions will appear here as scholars submit their requirements.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {requests.map((request) => (
              <RequestManagement
                key={request.id}
                request={request}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
