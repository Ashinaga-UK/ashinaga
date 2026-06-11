'use client';

import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  MessageSquare,
  Paperclip,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  archiveRequest,
  getFileDownloadUrl,
  type Request,
  restoreRequest,
  updateRequestStatus,
} from '../lib/api-client';
import { useSession } from '../lib/auth-client';
import { getFormDataDisplayItems, REQUEST_TYPE_LABELS } from '../lib/form-data-labels';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

interface RequestManagementProps {
  request: Request;
  onStatusUpdate: (requestId: string, status: string, comment?: string) => void;
}

type ReviewStatus = 'approved' | 'rejected' | 'reviewed' | 'commented';

export function RequestManagement({ request, onStatusUpdate }: RequestManagementProps) {
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [viewReviewOpen, setViewReviewOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const session = useSession();
  const user = session.data?.user;
  const isLoading = session.isPending;
  const { toast } = useToast();
  const isAuthenticated = !!user;

  // Debug logging
  console.log('Auth state:', { user, isLoading, isAuthenticated });

  const handleStatusUpdate = async (status: ReviewStatus) => {
    if (!user?.id) {
      console.error('User not authenticated. Auth state:', { user, isLoading, isAuthenticated });
      alert('Please log in to perform this action.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateRequestStatus(request.id, status, approvalComment, user.id);
      onStatusUpdate(request.id, status, approvalComment);
      setApprovalOpen(false);
      setApprovalComment('');
    } catch (error) {
      console.error('Error updating request status:', error);
      alert('Failed to update request status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    await handleStatusUpdate(approved ? 'approved' : 'rejected');
  };

  const handleRequestInfo = async () => {
    if (!approvalComment.trim()) {
      toast({
        title: 'Comment required',
        description: 'Please describe what additional information the scholar needs to provide.',
        variant: 'destructive',
      });
      return;
    }
    await handleStatusUpdate('commented');
  };

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      setIsDownloading(attachmentId);
      const { downloadUrl } = await getFileDownloadUrl(attachmentId);

      // Open the download URL in a new tab/window
      // This will trigger the browser's download dialog
      window.open(downloadUrl, '_blank');

      toast({
        title: 'Download started',
        description: `Downloading ${filename}`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download the file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDelete = async () => {
    const action = request.archived ? 'restore' : 'archive';

    if (!window.confirm(`Are you sure you want to ${action} this request?`)) {
      return;
    }

    try {
      if (request.archived) {
        await restoreRequest(request.id);
      } else {
        await archiveRequest(request.id);
      }

      toast({
        title: request.archived ? 'Request restored' : 'Request archived',
        description: request.archived
          ? 'The request has been successfully restored.'
          : 'The request has been successfully archived.',
      });
      // Notify parent to refresh
      onStatusUpdate(request.id, request.archived ? 'restored' : 'archived');
    } catch (error) {
      console.error(`Failed to ${request.archived ? 'restore' : 'archive'} request:`, error);
      toast({
        title: request.archived ? 'Restore failed' : 'Archive failed',
        description: `Failed to ${request.archived ? 'restore' : 'archive'} the request. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    window.open(`/print-request/${request.id}`, '_blank');
  };

  const getPriorityColor = (priority: string) => {
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'reviewed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'commented':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'reviewed') return 'reviewed';
    return status;
  };

  const applicationItems = getFormDataDisplayItems(request.type, request.formData);
  const requestTypeLabel = REQUEST_TYPE_LABELS[request.type] || request.type.replace(/_/g, ' ');
  const canMakeDecision = request.status === 'pending' || request.status === 'reviewed';

  const renderCompletedApplication = () => (
    <div className="bg-muted p-4 rounded-lg">
      <h4 className="font-medium mb-3">Completed Application</h4>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Request Type
          </p>
          <p className="text-sm text-foreground">{requestTypeLabel}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{request.description}</p>
        </div>
        {applicationItems.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Application Responses
            </p>
            <div className="space-y-3">
              {applicationItems.map((item, index) => (
                <div key={`${item.label}-${index}`}>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {request.attachments && request.attachments.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Attachments ({request.attachments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {request.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 bg-background rounded px-2 py-1"
                >
                  <span className="text-xs text-foreground">{attachment.name}</span>
                  <span className="text-xs text-muted-foreground">({attachment.size})</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0"
                    disabled={isDownloading === attachment.id}
                    onClick={() => handleDownload(attachment.id, attachment.name)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="rounded-lg border border-border p-4">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h4 className="min-w-0 font-medium text-foreground">{request.scholarName}</h4>
              <Badge variant={getPriorityColor(request.priority)}>{request.priority}</Badge>
              <Badge className={getStatusBadgeColor(request.status)}>
                {getStatusLabel(request.status)}
              </Badge>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{request.description}</p>

            {/* Attachments */}
            {request.attachments && request.attachments.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Attachments ({request.attachments.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.attachments.map((attachment) => (
                    <div
                      key={attachment.name}
                      className="flex max-w-full items-center gap-2 rounded bg-muted px-2 py-1"
                    >
                      <span className="min-w-0 truncate text-xs text-foreground">
                        {attachment.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        ({attachment.size})
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        disabled={isDownloading === attachment.id}
                        onClick={() => handleDownload(attachment.id, attachment.name)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <span>
                <span className="text-foreground">Type:</span> {requestTypeLabel}
              </span>
              <span>
                <span className="text-foreground">Submitted:</span>{' '}
                {new Date(request.submittedDate).toLocaleDateString()}
              </span>
            </div>

            {/* Show review details if already reviewed */}
            {(request.status === 'approved' ||
              request.status === 'rejected' ||
              request.status === 'reviewed' ||
              request.status === 'commented') &&
              request.reviewComment && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-foreground">Review:</span>
                    <Badge className={getStatusBadgeColor(request.status)}>
                      {getStatusLabel(request.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{request.reviewComment}</p>
                  {request.reviewDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reviewed on {new Date(request.reviewDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end lg:shrink-0">
            {/* Show different buttons based on status */}
            {canMakeDecision && (
              <>
                {/* Approval Dialog */}
                <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full sm:w-auto">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Review Request</DialogTitle>
                      <DialogDescription>
                        Review the completed application from {request.scholarName}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {renderCompletedApplication()}
                      <div>
                        <Label htmlFor="approvalComment">Comments (Optional)</Label>
                        <Textarea
                          id="approvalComment"
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          placeholder="Add any comments about your decision..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setApprovalOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleApproval(false)}
                        disabled={isSubmitting}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Processing...' : 'Reject'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRequestInfo}
                        disabled={isSubmitting}
                        className="text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Processing...' : 'Request More Information'}
                      </Button>
                      {request.status !== 'reviewed' && (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusUpdate('reviewed')}
                          disabled={isSubmitting}
                          className="text-purple-700 border-purple-200 hover:bg-purple-50"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {isSubmitting ? 'Processing...' : 'Reviewed'}
                        </Button>
                      )}
                      <Button
                        onClick={() => handleApproval(true)}
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Processing...' : 'Approve'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {/* Print Button for approved and rejected requests */}
            {(request.status === 'approved' || request.status === 'rejected') && (
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handlePrint}
              >
                <Download className="h-4 w-4 mr-1" />
                <span className="sm:hidden">Download</span>
                <span className="hidden sm:inline">Download Application</span>
              </Button>
            )}

            {/* View Review Button for already reviewed requests */}
            {(request.status === 'approved' ||
              request.status === 'rejected' ||
              request.status === 'reviewed' ||
              request.status === 'commented') && (
              <Dialog open={viewReviewOpen} onOpenChange={setViewReviewOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full sm:w-auto">
                    <Eye className="h-4 w-4 mr-1" />
                    View Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Review Details</DialogTitle>
                    <DialogDescription>
                      Review details for {request.scholarName}'s request
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {renderCompletedApplication()}
                    <div>
                      <Label>Review Decision</Label>
                      <div className="mt-2">
                        <Badge className={getStatusBadgeColor(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                      </div>
                    </div>
                    {request.reviewComment && (
                      <div>
                        <Label>Review Comment</Label>
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">{request.reviewComment}</p>
                        </div>
                      </div>
                    )}
                    {request.reviewDate && (
                      <div>
                        <Label>Review Date</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(request.reviewDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setViewReviewOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Button
              size="sm"
              variant="ghost"
              className={
                request.archived
                  ? 'text-ashinaga-teal-600 hover:text-ashinaga-teal-700 hover:bg-ashinaga-teal-50'
                  : 'text-red-500 hover:text-red-700 hover:bg-red-50'
              }
              onClick={handleDelete}
              aria-label={`Delete request from ${request.scholarName}`}
            >
              {request.archived ? 'Restore' : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
