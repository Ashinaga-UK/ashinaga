'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { getResourceDownloadUrl, type ProposalResource } from '../lib/api-client';
import {
  useAddStaffProposalComment,
  useReviewProposalStep,
  useScholarProposal,
} from '../lib/hooks/use-queries';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

async function openProposalResourceFile(resourceId: string) {
  const viewTab = window.open('about:blank', '_blank');
  if (viewTab) {
    viewTab.opener = null;
  }
  try {
    const { downloadUrl } = await getResourceDownloadUrl(resourceId, 'inline');
    if (!viewTab) {
      throw new Error('Allow pop-ups to view this file.');
    }
    viewTab.location.href = downloadUrl;
  } catch (error) {
    viewTab?.close();
    throw error;
  }
}

function ProposalResourceLink({ resource }: { resource: ProposalResource }) {
  const { toast } = useToast();
  if (resource.url) {
    return (
      <a
        href={resource.url}
        className="text-primary underline-offset-2 hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        {resource.title}
      </a>
    );
  }
  if (resource.sourceType !== 'file') {
    return resource.title;
  }
  return (
    <button
      type="button"
      className="text-primary underline-offset-2 hover:underline"
      onClick={async () => {
        try {
          await openProposalResourceFile(resource.id);
        } catch (error) {
          toast({
            title: 'Could not open resource',
            description: error instanceof Error ? error.message : 'Please try again.',
            variant: 'destructive',
          });
        }
      }}
    >
      {resource.title}
    </button>
  );
}

function statusLabel(status: string | null) {
  if (status === 'submitted') return 'Submitted';
  if (status === 'changes_requested') return 'Changes requested';
  if (status === 'approved') return 'Approved';
  if (status === 'draft') return 'Draft';
  return 'Not started';
}

export function ProposalPanel({ scholarId }: { scholarId: string }) {
  const { toast } = useToast();
  const { data, isLoading, error } = useScholarProposal(scholarId);
  const review = useReviewProposalStep(scholarId);
  const addComment = useAddStaffProposalComment(scholarId);
  const [commentByStep, setCommentByStep] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading proposal...
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-muted-foreground">Could not load this proposal.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Current step: {data.steps.find((step) => step.key === data.currentStepKey)?.title}
      </p>
      {data.steps.map((step) => {
        const comment = commentByStep[step.key] ?? '';
        const canReview = step.status === 'submitted';
        return (
          <Card key={step.key}>
            <CardHeader>
              <CardTitle className="text-base">{step.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{statusLabel(step.status)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {step.resources.length > 0 ? (
                <ul className="text-sm">
                  {step.resources.map((resource) => (
                    <li key={resource.id}>
                      <ProposalResourceLink resource={resource} />
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="whitespace-pre-wrap text-sm">
                {step.body ||
                  (step.available ? 'No text yet.' : 'Locked until the previous step is approved.')}
              </p>
              {step.comments.map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground">
                    {item.authorName} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
                </div>
              ))}
              {step.status ? (
                <Textarea
                  value={comment}
                  onChange={(event) =>
                    setCommentByStep((current) => ({ ...current, [step.key]: event.target.value }))
                  }
                  rows={3}
                  placeholder={
                    canReview ? 'Comment (required to request changes)' : 'Add a comment'
                  }
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canReview ? (
                  <>
                    <Button
                      type="button"
                      disabled={review.isPending}
                      onClick={async () => {
                        try {
                          await review.mutateAsync({
                            stepKey: step.key,
                            action: 'approve',
                            comment: comment.trim() || undefined,
                          });
                          setCommentByStep((current) => ({ ...current, [step.key]: '' }));
                        } catch (err) {
                          toast({
                            title: 'Could not approve',
                            description: err instanceof Error ? err.message : 'Please try again.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={review.isPending || !comment.trim()}
                      onClick={async () => {
                        try {
                          await review.mutateAsync({
                            stepKey: step.key,
                            action: 'request_changes',
                            comment: comment.trim(),
                          });
                          setCommentByStep((current) => ({ ...current, [step.key]: '' }));
                        } catch (err) {
                          toast({
                            title: 'Could not request changes',
                            description: err instanceof Error ? err.message : 'Please try again.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      Request changes
                    </Button>
                  </>
                ) : null}
                {step.status && !canReview ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={addComment.isPending || !comment.trim()}
                    onClick={async () => {
                      try {
                        await addComment.mutateAsync({ stepKey: step.key, body: comment.trim() });
                        setCommentByStep((current) => ({ ...current, [step.key]: '' }));
                      } catch (err) {
                        toast({
                          title: 'Could not add comment',
                          description: err instanceof Error ? err.message : 'Please try again.',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    Add comment
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
