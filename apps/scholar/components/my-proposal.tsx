'use client';

import { Download, Loader2, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getMyProposal,
  getProposalFileDownloadUrl,
  type ProposalComment,
  type ProposalResource,
  type ProposalTimeline,
  submitProposalStep,
  uploadProposalCompletedFile,
} from '../lib/api/proposals';
import { getResourceDownloadUrl } from '../lib/api-client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

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
        Download {resource.title}
      </a>
    );
  }
  if (resource.sourceType !== 'file') {
    return resource.title;
  }
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
      onClick={async () => {
        try {
          const { downloadUrl } = await getResourceDownloadUrl(resource.id, 'attachment');
          window.location.href = downloadUrl;
        } catch (error) {
          toast({
            title: 'Could not download material',
            description: error instanceof Error ? error.message : 'Please try again.',
            variant: 'destructive',
          });
        }
      }}
    >
      <Download className="h-3.5 w-3.5" />
      Download {resource.title}
    </button>
  );
}

function StepComments({ comments }: { comments: ProposalComment[] }) {
  if (comments.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Comments</p>
      {comments.map((item) => (
        <div key={item.id} className="rounded-md border p-3 text-sm">
          <p className="text-muted-foreground">
            {item.authorName} · {new Date(item.createdAt).toLocaleString()}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function statusLabel(status: string | null) {
  if (status === 'submitted') return 'Waiting for coordinator review';
  if (status === 'changes_requested') return 'Changes requested';
  if (status === 'approved') return 'Approved';
  if (status === 'draft') return 'Draft';
  return 'Not started';
}

function submissionCopy(stepKey: string, title: string) {
  if (stepKey === 'topic') {
    return {
      label: 'Topic, research question, and summary',
      hint: 'Write your topic and research question, plus a short summary of this submission.',
      placeholder: 'Topic and research question\n\nSummary of this submission',
    };
  }
  return {
    label: `${title} and summary`,
    hint: `Write your ${title.toLowerCase()}, plus a short summary of this submission.`,
    placeholder: `${title}\n\nSummary of this submission`,
  };
}

export function MyProposal() {
  const [timeline, setTimeline] = useState<ProposalTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [stageLabel, setStageLabel] = useState('');
  const [comment, setComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
        setStageLabel(step?.stageLabel ?? '');
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
    setStageLabel(step?.stageLabel ?? '');
  };

  const handleSubmit = async () => {
    if (!current || !current.available || current.status === 'submitted') return;
    const trimmed = body.trim();
    if (!trimmed || !stageLabel.trim()) return;
    if (!selectedFile && !current.fileName) return;
    setSaving(true);
    setError(null);
    try {
      const file = selectedFile ? await uploadProposalCompletedFile(selectedFile) : undefined;
      const next = await submitProposalStep(current.key, trimmed, stageLabel.trim(), comment, file);
      setComment('');
      setSelectedFile(null);
      applyTimeline(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save proposal');
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
  const submission = submissionCopy(current.key, current.title);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My Proposal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each step unlocks after your coordinator approves the previous one. Write the exact step
          you are on — 1, 1a, 1b, 1c, and so on.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {history.map((step) => (
        <Card key={step.key}>
          <CardHeader>
            <CardTitle className="text-base">{step.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Approved{step.stageLabel ? ` · marked ${step.stageLabel}` : ''}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-wrap text-sm">{step.body}</p>
            <StepComments comments={step.comments} />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>{current.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{statusLabel(current.status)}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {current.resources.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {current.resources.map((resource) => (
                <li key={resource.id}>
                  <ProposalResourceLink resource={resource} />
                </li>
              ))}
            </ul>
          ) : null}

          {writable ? (
            <>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="proposal-stage-label">Which step are you on?</Label>
                <Input
                  id="proposal-stage-label"
                  value={stageLabel}
                  onChange={(event) => setStageLabel(event.target.value)}
                  placeholder="e.g. 1a"
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Use the number of this step plus a letter if needed: 1, 1a, 1b, 1c, 2a…
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-ashinaga-teal-200 bg-ashinaga-teal-50/70 p-4 dark:border-border dark:bg-accent/30">
                <div className="space-y-1">
                  <Label htmlFor="proposal-submission" className="text-base font-semibold">
                    {submission.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{submission.hint}</p>
                </div>
                <Textarea
                  id="proposal-submission"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={12}
                  className="min-h-[16rem] bg-background text-base"
                  placeholder={submission.placeholder}
                />
                <div className="space-y-1">
                  <Label htmlFor="proposal-note">Note to your coordinator</Label>
                  <p className="text-xs text-muted-foreground">
                    Optional. Leave blank if you have nothing to add.
                  </p>
                </div>
                <Textarea
                  id="proposal-note"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  className="bg-background"
                  placeholder="Add a note, or leave this empty"
                />
                <div className="space-y-1">
                  <Label htmlFor="proposal-completed-file">Completed file</Label>
                </div>
                <Input
                  id="proposal-completed-file"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  className="bg-background"
                />
                {selectedFile ? (
                  <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>
                ) : current.fileName ? (
                  <p className="text-sm text-muted-foreground">
                    Already uploaded: {current.fileName}. Choose a new file only if you need to
                    replace it.
                  </p>
                ) : null}
                <Button
                  type="button"
                  disabled={
                    saving ||
                    !body.trim() ||
                    !stageLabel.trim() ||
                    (!selectedFile && !current.fileName)
                  }
                  onClick={() => void handleSubmit()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit for review
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 rounded-lg border border-ashinaga-teal-200 bg-ashinaga-teal-50/70 p-4 dark:border-border dark:bg-accent/30">
              <p className="text-base font-semibold">{submission.label}</p>
              {current.stageLabel ? (
                <p className="text-sm text-muted-foreground">Marked as step {current.stageLabel}</p>
              ) : null}
              <p className="whitespace-pre-wrap text-sm">
                {current.body || 'Waiting for coordinator approval.'}
              </p>
              {current.fileName ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
                  onClick={async () => {
                    try {
                      const { downloadUrl } = await getProposalFileDownloadUrl(
                        current.key,
                        'attachment'
                      );
                      window.location.href = downloadUrl;
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Could not download file');
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download {current.fileName}
                </button>
              ) : null}
            </div>
          )}

          <StepComments comments={current.comments} />
        </CardContent>
      </Card>
    </div>
  );
}
