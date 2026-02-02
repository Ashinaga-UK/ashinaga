'use client';

import { AlertCircle, FileText, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { useMyRequests } from '../../../lib/hooks/use-queries';
import { RequestCard } from '../../../components/request-card';
import { NewRequestDialog } from '../../../components/new-request-dialog';

export default function RequestsPage() {
  const { data: requests, isLoading, error, refetch } = useMyRequests();

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">My Requests</h2>
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
        <Card className="border-ashinaga-teal-100 dark:border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4">
                  <div className="w-full h-full rounded-full border-4 border-ashinaga-teal-200 border-t-ashinaga-teal-600 animate-spin" />
                </div>
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-600 dark:text-red-400">Failed to load requests. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : !requests || requests.length === 0 ? (
        <Card className="border-ashinaga-teal-100 dark:border-border">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No requests yet</p>
              <p className="text-sm text-muted-foreground mt-2">
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
