'use client';

import { Loader2, Pencil } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import {
  type AnnualReviewCopyResponse,
  getAnnualReviewCopy,
  updateAnnualReviewCopy,
} from '../lib/api-client';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

type CopyField = {
  key: string;
  label: string;
  short?: boolean;
};

type CopyGroup = {
  title: string;
  fields: CopyField[];
};

const COPY_GROUPS: CopyGroup[] = [
  {
    title: 'Shared helper text',
    fields: [{ key: 'helpers.numberHint', label: 'Number field hint', short: true }],
  },
  {
    title: 'Year Overview',
    fields: [
      { key: 'sections.yearOverview.title', label: 'Section title', short: true },
      { key: 'sections.yearOverview.description', label: 'Section description' },
      { key: 'questions.academicYear.prompt', label: 'Academic year label', short: true },
      { key: 'questions.highlights.prompt', label: 'Highlights question' },
    ],
  },
  {
    title: 'Work And Activities',
    fields: [
      { key: 'sections.workAndActivities.title', label: 'Section title', short: true },
      { key: 'sections.workAndActivities.description', label: 'Section description' },
      { key: 'questions.partTimeJobs.prompt', label: 'Part-time jobs question' },
      { key: 'questions.extracurriculars.prompt', label: 'Extracurriculars question' },
    ],
  },
  {
    title: 'Leadership and Impact',
    fields: [
      { key: 'sections.leadershipAndImpact.title', label: 'Section title', short: true },
      { key: 'sections.leadershipAndImpact.description', label: 'Section description' },
      { key: 'questions.leadershipRolesCount.prompt', label: 'Leadership count question' },
      {
        key: 'questions.leadershipRolesDescription.prompt',
        label: 'Leadership description question',
      },
      { key: 'questions.payItForwardCount.prompt', label: 'Pay-it-forward count question' },
      {
        key: 'questions.payItForwardDescription.prompt',
        label: 'Pay-it-forward description question',
      },
    ],
  },
  {
    title: 'Africa Engagement And Internships',
    fields: [
      {
        key: 'sections.africaEngagementAndInternships.title',
        label: 'Section title',
        short: true,
      },
      {
        key: 'sections.africaEngagementAndInternships.description',
        label: 'Section description',
      },
      {
        key: 'questions.subSaharanAfricaActivitiesCount.prompt',
        label: 'Africa activities count question',
      },
      {
        key: 'questions.subSaharanAfricaActivitiesDescription.prompt',
        label: 'Africa activities description question',
      },
      {
        key: 'questions.independentInternshipsCount.prompt',
        label: 'Independent internships count question',
      },
      {
        key: 'questions.internshipsInAfricaSummary.prompt',
        label: 'Internships in Africa question',
      },
      {
        key: 'questions.internshipsElsewhereSummary.prompt',
        label: 'Internships outside Africa question',
      },
      {
        key: 'questions.completedAshinagaAfricaInternship.prompt',
        label: 'Ashinaga internship question',
      },
    ],
  },
  {
    title: 'Academic Results',
    fields: [
      { key: 'sections.academicResults.title', label: 'Section title', short: true },
      { key: 'sections.academicResults.description', label: 'Section description' },
      {
        key: 'questions.academicYearAverageClassification.prompt',
        label: 'Classification question',
      },
      {
        key: 'questions.academicYearWeightedGrade.prompt',
        label: 'Weighted grade question',
      },
    ],
  },
];

export function AnnualReviewCopyEditor() {
  const [copy, setCopy] = useState<AnnualReviewCopyResponse | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getAnnualReviewCopy()
      .then((response) => {
        setCopy(response);
        setForm(response.strings);
      })
      .catch((loadError) => {
        console.error('Failed to load annual review copy:', loadError);
      });
  }, []);

  if (!copy?.canEdit) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setError(null);
    if (nextOpen) {
      setForm(copy.strings);
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateAnnualReviewCopy(copy.version, form);
      setCopy(updated);
      setForm(updated.strings);
      setOpen(false);
      setMessage('Annual Review copy published.');
    } catch (saveError) {
      console.error('Failed to update annual review copy:', saveError);
      if (saveError instanceof Error && saveError.message.includes('409')) {
        try {
          const latest = await getAnnualReviewCopy();
          setCopy(latest);
          setForm(latest.strings);
          setError(
            'Another admin changed this copy. Their latest version is loaded; review it before publishing again.'
          );
        } catch (reloadError) {
          console.error('Failed to reload annual review copy:', reloadError);
          setError('Another admin changed this copy. Close this editor and reload the page.');
        }
      } else {
        setError('Could not publish the Annual Review copy.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="font-medium">Annual Review form copy</p>
          <p className="text-sm text-muted-foreground">
            Edit section headings, descriptions, questions, and the number hint.
          </p>
          {message && <p className="mt-2 text-sm text-ashinaga-teal-700">{message}</p>}
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit form copy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <form onSubmit={handleSave} className="space-y-6">
              <DialogHeader>
                <DialogTitle>Edit Annual Review form copy</DialogTitle>
                <DialogDescription>
                  Publishing changes the wording scholars see the next time they open the form,
                  including drafts and reviews they have already submitted.
                </DialogDescription>
              </DialogHeader>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {COPY_GROUPS.map((group) => (
                <fieldset key={group.title} className="space-y-4 rounded-lg border p-4">
                  <legend className="px-1 text-sm font-semibold">{group.title}</legend>
                  {group.fields.map((field) => {
                    const id = `annual-review-copy-${field.key.replaceAll('.', '-')}`;
                    const value = form[field.key] ?? '';
                    const maxLength =
                      field.key.endsWith('.title') || field.key === 'helpers.numberHint'
                        ? 120
                        : 500;
                    return (
                      <div key={field.key} className="grid gap-2">
                        <Label htmlFor={id}>{field.label}</Label>
                        {field.short ? (
                          <Input
                            id={id}
                            value={value}
                            required
                            maxLength={maxLength}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                [field.key]: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <Textarea
                            id={id}
                            value={value}
                            required
                            maxLength={maxLength}
                            rows={3}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                [field.key]: event.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              ))}

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={saving}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publish copy
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
