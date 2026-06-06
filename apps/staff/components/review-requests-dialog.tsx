'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { RequestManagement } from './request-management';
import { getRequests, type Request } from '../lib/api-client';

interface ReviewRequestsDialogProps {
  trigger: React.ReactNode;
  onUpdate?: () => void;
}

export function ReviewRequestsDialog({ trigger, onUpdate }: ReviewRequestsDialogProps) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRequests({
        status: 'pending',
        sortBy: 'submittedDate',
        sortOrder: 'desc',
      });
      setRequests(response?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
      console.error('Error fetching pending requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPendingRequests();
    }
  }, [open, fetchPendingRequests]);

  const handleStatusUpdate = (requestId: string, status: string, comment?: string) => {
    // Remove the reviewed/approved/rejected request from the local list
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>Review Pending Requests</DialogTitle>
          <DialogDescription>
            Triage and respond to funding and requirement submissions from scholars.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground">Couldn't load requests</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No pending requests</p>
              <p className="mt-1 text-sm text-muted-foreground">
                All scholar submissions have been triaged.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {requests.map((request) => (
                <RequestManagement
                  key={request.id}
                  request={request}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
