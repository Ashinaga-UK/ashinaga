'use client';

import { Loader2, Save, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  addProposalComment,
  getMyProposal,
  type ProposalResource,
  type ProposalTimeline,
  saveProposalDraft,
  submitProposalStep,
} from '../lib/api/proposals';
import { getResourceDownloadUrl } from '../lib/api-client';
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
  if (status === 'submitted') return 'Waiting for coordinator review';
  if (status === 'changes_requested') return 'Changes requested';
  if (status === 'approved') return 'Approved';
  if (status === 'draft') return 'Draft';
  return 'Not started';
}

export function MyProposal() {
  const [timeline, setTimeline] = useState<ProposalTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const current = timeline?.steps.find((step) => step.key === timeline.currentStepKey);
  const history =
    timeline?.steps.filter(
      (step) => step.status === 'approved' && step.key !== timeline.currentStepKey
    ) ?? [];

  useEffect(() => {
    let cancelled = false;
    getMyProposal()
      .then((next) => {
        if (cancelled) return;
        setTimeline(next);
        const step = next.steps.find((item) => item.key === next.currentStepKey);
        setBody(step?.body ?? '');
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load proposal');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyTimeline = (next: ProposalTimeline) => {
    setTimeline(next);
    const step = next.steps.find((item) => item.key === next.currentStepKey);
    setBody(step?.body ?? '');
  };

  const handleWrite = async (action: 'draft' | 'submit') => {
    if (!current || !current.available || current.status === 'submitted') return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const next =
        action === 'draft'
          ? await saveProposalDraft(current.key, trimmed)
          : await submitProposalStep(current.key, trimmed);
      applyTimeline(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save proposal');
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async () => {
    if (!current || !current.status || current.status === 'approved') return;
    const trimmed = comment.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await addProposalComment(current.key, trimmed);
      setComment('');
      applyTimeline(await getMyProposal());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add comment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading proposal...
      </div>
    );
  }

  if (!timeline || !current) {
    return <p className="text-sm text-muted-foreground">{error ?? 'Proposal is unavailable.'}</p>;
  }

  const writable =
    current.available && current.status !== 'submitted' && current.status !== 'approved';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My Proposal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each step unlocks after your coordinator approves the previous one.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {history.map((step) => (
        <Card key={step.key}>
          <CardHeader>
            <CardTitle className="text-base">{step.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{step.body}</CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>{current.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{statusLabel(current.status)}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {current.resources.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Resources for this step</p>
              <ul className="space-y-1 text-sm">
                {current.resources.map((resource) => (
                  <li key={resource.id}>
                    <ProposalResourceLink resource={resource} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No proposal resources attached yet.</p>
          )}

          {writable ? (
            <>
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                placeholder="Write this step here."
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || !body.trim()}
                  onClick={() => void handleWrite('draft')}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save draft
                </Button>
                <Button
                  type="button"
                  disabled={saving || !body.trim()}
                  onClick={() => void handleWrite('submit')}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit for review
                </Button>
              </div>
            </>
          ) : (
            <p className="whitespace-pre-wrap text-sm">
              {current.body || 'Waiting for coordinator approval.'}
            </p>
          )}

          {current.comments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Comments</p>
              {current.comments.map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground">
                    {item.authorName} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
                </div>
              ))}
            </div>
          ) : null}

          {current.status && current.status !== 'approved' ? (
            <div className="space-y-2">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                placeholder="Add a comment"
              />
              <Button
                type="button"
                variant="outline"
                disabled={saving || !comment.trim()}
                onClick={() => void handleComment()}
              >
                Add comment
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
