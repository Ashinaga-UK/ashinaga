'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { CheckCircle, MessageCircle, X, Send, Paperclip, Download } from 'lucide-react';

interface RequestManagementProps {
  request: {
    id: number;
    studentName: string;
    type: string;
    description: string;
    submittedDate: string;
    status: string;
    priority: string;
    attachments?: Array<{
      name: string;
      size: string;
    }>;
  };
  onStatusUpdate: (requestId: number, status: string, comment?: string) => void;
}

export function RequestManagement({ request, onStatusUpdate }: RequestManagementProps) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComment = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onStatusUpdate(request.id, 'commented', comment);
    setCommentOpen(false);
    setComment('');
    setIsSubmitting(false);
  };

  const handleApproval = async (approved: boolean) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onStatusUpdate(request.id, approved ? 'approved' : 'rejected', approvalComment);
    setApprovalOpen(false);
    setApprovalComment('');
    setIsSubmitting(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'commented':
        return 'text-blue-600';
      case 'pending':
        return 'text-orange-600';
      case 'reviewed':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
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
              <h4 className="font-medium text-gray-900">{request.studentName}</h4>
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
                  {request.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1"
                    >
                      <span className="text-xs text-gray-700">{attachment.name}</span>
                      <span className="text-xs text-gray-500">({attachment.size})</span>
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Type: {request.type}</span>
              <span>Submitted: {request.submittedDate}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Comment Dialog */}
            <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Comment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Comment</DialogTitle>
                  <DialogDescription>
                    Add a comment or request more information from {request.studentName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="comment">Your Comment</Label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add your comment or questions here..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCommentOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleComment} disabled={!comment || isSubmitting}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Sending...' : 'Send Comment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Approval Dialog */}
            {request.status === 'pending' && (
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
                      Approve or reject the request from {request.studentName}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Request Details</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Type:</strong> {request.type}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Description:</strong> {request.description}
                      </p>
                      {request.attachments && request.attachments.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            <strong>Attachments:</strong> {request.attachments.length} file(s)
                          </p>
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
