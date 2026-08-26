'use client';

import { useQueryClient } from '@tanstack/react-query';
import { getFormDataDisplayItems } from '@workspace/ui/lib/form-data-labels';
import { Calendar, ChevronDown, ChevronUp, Download, Loader2, Paperclip, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Request } from '../lib/api-client';
import { respondToRequest } from '../lib/api-client';
import { useFileUpload } from '../lib/hooks/use-file-upload';
import { queryKeys } from '../lib/hooks/use-queries';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

interface RequestCardProps {
  request: Request;
}

export function RequestCard({ request }: RequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRespondForm, setShowRespondForm] = useState(false);
  const [responseComment, setResponseComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { uploadFiles, uploadProgress, isUploading } = useFileUpload();

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
        return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 dark:border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 dark:border-red-500/30';
      case 'pending':
        return 'bg-amber-500/20 text-amber-800 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/30';
      case 'reviewed':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/30';
      case 'commented':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatRequestType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formDataItems = getFormDataDisplayItems(request.type, request.formData);

  const renderFormData = () => {
    if (formDataItems.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-foreground">Form Details</h4>
        <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-[minmax(10rem,18rem)_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-2">
          {formDataItems.map((item, index) => (
            <div key={`${item.label}-${index}`} className="contents">
              <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
              <dd className="m-0 text-sm text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitResponse = async () => {
    const trimmed = responseComment.trim();
    if (!trimmed) {
      toast({
        title: 'Add a note',
        description: 'Tell staff what additional information you are providing.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      let attachmentIds: string[] = [];
      if (selectedFiles.length > 0) {
        const uploaded = await uploadFiles(selectedFiles, request.id);
        attachmentIds = uploaded.map((f) => f.attachmentId);
      }

      await respondToRequest(request.id, {
        comment: trimmed,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      toast({
        title: 'Response submitted',
        description: 'Staff will review your additional information shortly.',
      });
      setResponseComment('');
      setSelectedFiles([]);
      setShowRespondForm(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.myRequests });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Could not submit response',
        description: msg.replace(/^API Error:\s*\d+\s*-\s*/, ''),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formDetails = renderFormData();
  const attachments = request.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const hasExpandedDetails = Boolean(formDetails) || hasAttachments;

  return (
    <Card className="border-ashinaga-teal-100 dark:border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{formatRequestType(request.type)}</CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={getPriorityColor(request.priority)}>
                {request.priority} priority
              </Badge>
              <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
            </div>
          </div>
          {hasExpandedDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Hide extra details' : 'Show extra details'}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-foreground">{request.description}</p>
        </div>

        {/* Submitted Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Submitted on{' '}
            {new Date(request.submittedDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Expanded details */}
        {isExpanded && hasExpandedDetails && (
          <div className="space-y-4 pt-2 border-t">
            {formDetails}
            {hasAttachments && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Attachments ({attachments.length})
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-sm hover:bg-muted/80 transition-colors text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <span>{attachment.name}</span>
                        <span className="text-muted-foreground">({attachment.size})</span>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsed view: just show attachment count */}
        {!isExpanded && hasAttachments && (
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Review Details */}
        {request.status !== 'pending' && request.reviewComment && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Staff Review</span>
              <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
            </div>
            <p className="text-sm text-foreground">{request.reviewComment}</p>
            {request.reviewDate && (
              <p className="text-xs text-muted-foreground">
                Reviewed on{' '}
                {new Date(request.reviewDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        )}

        {/* Respond to commented request */}
        {request.status === 'commented' && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
            {!showRespondForm ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-foreground">
                  Staff have asked for more information. Reply on this same request — no need to
                  submit a new one.
                </p>
                <Button
                  type="button"
                  onClick={() => setShowRespondForm(true)}
                  className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700 shrink-0"
                >
                  Respond with more info
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label
                    htmlFor={`respond-${request.id}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Your response
                  </label>
                  <Textarea
                    id={`respond-${request.id}`}
                    value={responseComment}
                    onChange={(e) => setResponseComment(e.target.value)}
                    placeholder="Provide the additional information staff asked for…"
                    rows={4}
                    disabled={submitting || isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Add files (optional)
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting || isUploading}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Choose files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                  {selectedFiles.length > 0 && (
                    <ul className="space-y-1">
                      {selectedFiles.map((file, idx) => {
                        const progress = uploadProgress[idx];
                        return (
                          <li
                            key={`${file.name}-${idx}`}
                            className="flex items-center justify-between bg-muted rounded-md px-3 py-2 text-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-foreground">{file.name}</p>
                              {progress?.status === 'uploading' && (
                                <Progress value={progress.progress} className="h-1 mt-1" />
                              )}
                              {progress?.status === 'error' && (
                                <p className="text-xs text-destructive mt-0.5">
                                  {progress.error || 'Upload failed'}
                                </p>
                              )}
                            </div>
                            {!submitting && !isUploading && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFile(idx)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowRespondForm(false);
                      setResponseComment('');
                      setSelectedFiles([]);
                    }}
                    disabled={submitting || isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmitResponse}
                    disabled={submitting || isUploading}
                    className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
                  >
                    {submitting || isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isUploading ? 'Uploading…' : 'Submitting…'}
                      </>
                    ) : (
                      'Send response'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
