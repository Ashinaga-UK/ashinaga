'use client';

import { CheckCircle, Download, Eye, Paperclip, X } from 'lucide-react';
import { useState } from 'react';
import { getFileDownloadUrl, type Request, updateRequestStatus } from '../lib/api-client';
import { useSession } from '../lib/auth-client';
import { useToast } from './ui/use-toast';
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

interface RequestManagementProps {
  request: Request;
  onStatusUpdate: (requestId: string, status: string, comment?: string) => void;
}

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

  const handleApproval = async (approved: boolean) => {
    if (!user?.id) {
      console.error('User not authenticated. Auth state:', { user, isLoading, isAuthenticated });
      alert('Please log in to perform this action.');
      return;
    }

    setIsSubmitting(true);
    try {
      const status = approved ? 'approved' : 'rejected';
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
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'reviewed':
        return 'bg-purple-100 text-purple-800';
      case 'commented':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-4 border border-ashinaga-teal-100 rounded-lg">
      <CardContent className="p-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium text-gray-900">{request.scholarName}</h4>
              <Badge variant={getPriorityColor(request.priority)}>{request.priority}</Badge>
              <Badge className={getStatusBadgeColor(request.status)}>{request.status}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{request.description}</p>

            {/* Attachments */}
            {request.attachments && request.attachments.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <Paperclip className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Attachments ({request.attachments.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.attachments.map((attachment) => (
                    <div
                      key={attachment.name}
                      className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1"
                    >
                      <span className="text-xs text-gray-700">{attachment.name}</span>
                      <span className="text-xs text-gray-500">({attachment.size})</span>
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

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Type: {request.type.replace('_', ' ')}</span>
              <span>Submitted: {new Date(request.submittedDate).toLocaleDateString()}</span>
            </div>

            {/* Show review details if already reviewed */}
            {(request.status === 'approved' ||
              request.status === 'rejected' ||
              request.status === 'commented') &&
              request.reviewComment && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">Review:</span>
                    <Badge className={getStatusBadgeColor(request.status)}>{request.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{request.reviewComment}</p>
                  {request.reviewDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Reviewed on {new Date(request.reviewDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
          </div>

          <div className="flex gap-2">
            {/* Show different buttons based on status */}
            {request.status === 'pending' && (
              <>
                {/* Approval Dialog */}
                <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Review Request</DialogTitle>
                      <DialogDescription>
                        Approve or reject the request from {request.scholarName}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Request Details</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Type:</strong> {request.type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Description:</strong> {request.description}
                        </p>
                        {request.attachments && request.attachments.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Attachments:</strong> {request.attachments.length} file(s)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {request.attachments.map((attachment) => (
                                <div
                                  key={attachment.name}
                                  className="flex items-center gap-2 bg-white rounded px-2 py-1"
                                >
                                  <span className="text-xs text-gray-700">{attachment.name}</span>
                                  <span className="text-xs text-gray-500">({attachment.size})</span>
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

            {/* View Review Button for already reviewed requests */}
            {(request.status === 'approved' ||
              request.status === 'rejected' ||
              request.status === 'commented') && (
              <Dialog open={viewReviewOpen} onOpenChange={setViewReviewOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    View Review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Review Details</DialogTitle>
                    <DialogDescription>
                      Review details for {request.scholarName}'s request
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Request Details</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Type:</strong> {request.type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Description:</strong> {request.description}
                      </p>
                      {request.attachments && request.attachments.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Attachments:</strong> {request.attachments.length} file(s)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {request.attachments.map((attachment) => (
                              <div
                                key={attachment.name}
                                className="flex items-center gap-2 bg-white rounded px-2 py-1"
                              >
                                <span className="text-xs text-gray-700">{attachment.name}</span>
                                <span className="text-xs text-gray-500">({attachment.size})</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0"
                                  onClick={() => handleDownload(attachment.url, attachment.name)}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Review Decision</Label>
                      <div className="mt-2">
                        <Badge className={getStatusBadgeColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                    {request.reviewComment && (
                      <div>
                        <Label>Review Comment</Label>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">{request.reviewComment}</p>
                        </div>
                      </div>
                    )}
                    {request.reviewDate && (
                      <div>
                        <Label>Review Date</Label>
                        <p className="text-sm text-gray-600 mt-1">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
