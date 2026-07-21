'use client';

import {
  AlertCircle,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle,
  ClipboardCheck,
  Globe2,
  HandHeart,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AnnualUpdate,
  type AnnualUpdatePayload,
  getMyAnnualUpdate,
  saveAnnualUpdateDraft,
  submitAnnualUpdate,
} from '../lib/api/annual-updates';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

type FormState = {
  academicYear: string;
  highlights: string;
  partTimeJobs: string;
  extracurriculars: string;
  leadershipRolesDescription: string;
  leadershipRolesCount: string;
  payItForwardDescription: string;
  payItForwardCount: string;
  subSaharanAfricaActivitiesDescription: string;
  subSaharanAfricaActivitiesCount: string;
  independentInternshipsCount: string;
  internshipsInAfricaSummary: string;
  internshipsElsewhereSummary: string;
  completedAshinagaAfricaInternship: 'yes' | 'no' | 'not_answered';
  academicYearAverageClassification: string;
  academicYearWeightedGrade: string;
};

const WORD_LIMIT = 150;

const REQUIRED_FIELD_LABELS: Record<keyof FormState, string> = {
  academicYear: 'Academic year',
  highlights: 'Highlights',
  partTimeJobs: 'Part-time jobs',
  extracurriculars: 'Extracurriculars',
  leadershipRolesDescription: 'Leadership roles description',
  leadershipRolesCount: 'Number of leadership roles',
  payItForwardDescription: 'Pay-it-forward description',
  payItForwardCount: 'Number of pay-it-forward activities',
  subSaharanAfricaActivitiesDescription: 'Sub-Saharan Africa-related activities',
  subSaharanAfricaActivitiesCount: 'Number of sub-Saharan Africa-related activities',
  independentInternshipsCount: 'Number of independently secured internships',
  internshipsInAfricaSummary: 'Internships in Africa summary',
  internshipsElsewhereSummary: 'Internships outside Africa summary',
  completedAshinagaAfricaInternship: 'Ashinaga 8-week internship answer',
  academicYearAverageClassification: 'Academic year average classification',
  academicYearWeightedGrade: 'Academic year weighted grade',
};

function getDefaultAcademicYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

const emptyForm: FormState = {
  academicYear: getDefaultAcademicYear(),
  highlights: '',
  partTimeJobs: '',
  extracurriculars: '',
  leadershipRolesDescription: '',
  leadershipRolesCount: '',
  payItForwardDescription: '',
  payItForwardCount: '',
  subSaharanAfricaActivitiesDescription: '',
  subSaharanAfricaActivitiesCount: '',
  independentInternshipsCount: '',
  internshipsInAfricaSummary: '',
  internshipsElsewhereSummary: '',
  completedAshinagaAfricaInternship: 'not_answered',
  academicYearAverageClassification: '',
  academicYearWeightedGrade: '',
};

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function toFormState(update: AnnualUpdate | null, academicYear: string): FormState {
  if (!update) {
    return { ...emptyForm, academicYear };
  }

  return {
    academicYear: update.academicYear,
    highlights: update.highlights ?? '',
    partTimeJobs: update.partTimeJobs ?? '',
    extracurriculars: update.extracurriculars ?? '',
    leadershipRolesDescription: update.leadershipRolesDescription ?? '',
    leadershipRolesCount: update.leadershipRolesCount?.toString() ?? '',
    payItForwardDescription: update.payItForwardDescription ?? '',
    payItForwardCount: update.payItForwardCount?.toString() ?? '',
    subSaharanAfricaActivitiesDescription: update.subSaharanAfricaActivitiesDescription ?? '',
    subSaharanAfricaActivitiesCount: update.subSaharanAfricaActivitiesCount?.toString() ?? '',
    independentInternshipsCount: update.independentInternshipsCount?.toString() ?? '',
    internshipsInAfricaSummary: update.internshipsInAfricaSummary ?? '',
    internshipsElsewhereSummary: update.internshipsElsewhereSummary ?? '',
    completedAshinagaAfricaInternship:
      update.completedAshinagaAfricaInternship === null
        ? 'not_answered'
        : update.completedAshinagaAfricaInternship
          ? 'yes'
          : 'no',
    academicYearAverageClassification: update.academicYearAverageClassification ?? '',
    academicYearWeightedGrade: update.academicYearWeightedGrade ?? '',
  };
}

function numberOrUndefined(value: string) {
  if (value.trim() === '') {
    return undefined;
  }

  return Number(value);
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function toPayload(form: FormState): AnnualUpdatePayload {
  return {
    academicYear: form.academicYear.trim(),
    highlights: optionalText(form.highlights),
    partTimeJobs: optionalText(form.partTimeJobs),
    extracurriculars: optionalText(form.extracurriculars),
    leadershipRolesDescription: optionalText(form.leadershipRolesDescription),
    leadershipRolesCount: numberOrUndefined(form.leadershipRolesCount),
    payItForwardDescription: optionalText(form.payItForwardDescription),
    payItForwardCount: numberOrUndefined(form.payItForwardCount),
    subSaharanAfricaActivitiesDescription: optionalText(form.subSaharanAfricaActivitiesDescription),
    subSaharanAfricaActivitiesCount: numberOrUndefined(form.subSaharanAfricaActivitiesCount),
    independentInternshipsCount: numberOrUndefined(form.independentInternshipsCount),
    internshipsInAfricaSummary: optionalText(form.internshipsInAfricaSummary),
    internshipsElsewhereSummary: optionalText(form.internshipsElsewhereSummary),
    completedAshinagaAfricaInternship:
      form.completedAshinagaAfricaInternship === 'not_answered'
        ? undefined
        : form.completedAshinagaAfricaInternship === 'yes',
    academicYearAverageClassification: optionalText(form.academicYearAverageClassification),
    academicYearWeightedGrade: optionalText(form.academicYearWeightedGrade),
  };
}

function getMissingRequiredFields(form: FormState) {
  const missingFields: string[] = [];

  const requireText = (field: keyof FormState) => {
    const value = form[field];
    if (typeof value !== 'string' || value.trim() === '') {
      missingFields.push(REQUIRED_FIELD_LABELS[field]);
    }
  };

  const requireNumber = (field: keyof FormState) => {
    const value = form[field];
    if (typeof value !== 'string' || value.trim() === '' || !Number.isFinite(Number(value))) {
      missingFields.push(REQUIRED_FIELD_LABELS[field]);
    }
  };

  requireText('academicYear');
  requireText('highlights');
  requireText('partTimeJobs');
  requireText('extracurriculars');
  requireText('leadershipRolesDescription');
  requireNumber('leadershipRolesCount');
  requireText('payItForwardDescription');
  requireNumber('payItForwardCount');
  requireText('subSaharanAfricaActivitiesDescription');
  requireNumber('subSaharanAfricaActivitiesCount');
  requireNumber('independentInternshipsCount');
  requireText('internshipsInAfricaSummary');
  requireText('internshipsElsewhereSummary');
  if (form.completedAshinagaAfricaInternship === 'not_answered') {
    missingFields.push(REQUIRED_FIELD_LABELS.completedAshinagaAfricaInternship);
  }
  requireText('academicYearAverageClassification');
  requireText('academicYearWeightedGrade');

  return missingFields;
}

export function MyAnnualReview() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [annualUpdate, setAnnualUpdate] = useState<AnnualUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [initialAcademicYear] = useState(emptyForm.academicYear);

  const isSubmitted = annualUpdate?.status === 'submitted';
  const wordLimitExceeded = useMemo(
    () =>
      countWords(form.leadershipRolesDescription) > WORD_LIMIT ||
      countWords(form.payItForwardDescription) > WORD_LIMIT ||
      countWords(form.subSaharanAfricaActivitiesDescription) > WORD_LIMIT,
    [
      form.leadershipRolesDescription,
      form.payItForwardDescription,
      form.subSaharanAfricaActivitiesDescription,
    ]
  );

  const loadAnnualUpdate = useCallback(async (academicYear: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyAnnualUpdate(academicYear);
      setAnnualUpdate(data);
      setForm(toFormState(data, academicYear));
    } catch (loadError) {
      console.error('Failed to load annual review:', loadError);
      setError('Could not load your annual review.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnualUpdate(initialAcademicYear);
  }, [initialAcademicYear, loadAnnualUpdate]);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
    setError(null);
    setMissingFields([]);
  };

  const handleSaveDraft = async () => {
    if (wordLimitExceeded) {
      setError('Please keep each limited response within 150 words.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await saveAnnualUpdateDraft(toPayload(form));
      setAnnualUpdate(saved);
      setMessage('Draft saved.');
    } catch (saveError) {
      console.error('Failed to save annual review draft:', saveError);
      setError('Could not save this draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (wordLimitExceeded) {
      setError('Please keep each limited response within 150 words.');
      return;
    }

    const nextMissingFields = getMissingRequiredFields(form);
    if (nextMissingFields.length > 0) {
      setMissingFields(nextMissingFields);
      setError('Please complete all required fields before submitting.');
      return;
    }

    const confirmed = window.confirm(
      'Submit your annual review? Once submitted, your answers are final.'
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const submitted = await submitAnnualUpdate(toPayload(form));
      setAnnualUpdate(submitted);
      setMissingFields([]);
      setMessage('Annual review submitted.');
    } catch (submitError) {
      console.error('Failed to submit annual review:', submitError);
      setError('Could not submit this annual review.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ashinaga-teal-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading annual review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm dark:border-sidebar-border dark:bg-sidebar">
        <div className="border-b bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 px-6 py-6 text-white dark:border-sidebar-border">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/85">
                <ClipboardCheck className="h-4 w-4" />
                Annual scholar reflection
              </div>
              <h1 className="text-3xl font-bold">My Annual Review</h1>
              <p className="mt-2 text-sm leading-6 text-white/85">
                Capture your highlights, leadership, internships, Africa-related work, and academic
                progress for this programme year.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <span
                className={
                  isSubmitted
                    ? 'rounded-full bg-white px-3 py-1 text-sm font-medium text-ashinaga-teal-700'
                    : 'rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/30'
                }
              >
                {isSubmitted ? 'Submitted' : annualUpdate ? 'Draft in progress' : 'Not started'}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={saving || isSubmitted}
                  className="bg-white text-ashinaga-teal-700 hover:bg-white/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || isSubmitted}
                  className="bg-ashinaga-green-900 text-white hover:bg-ashinaga-green-950"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Final
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 px-6 py-4 text-sm text-muted-foreground md:grid-cols-3">
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4 text-ashinaga-teal-600" />
            Drafts can be saved anytime
          </div>
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-ashinaga-teal-600" />
            Submission is final
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-ashinaga-teal-600" />
            One review per academic year
          </div>
        </div>
      </div>

      {isSubmitted && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            This annual review has been submitted and can no longer be edited.
          </AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>{error}</div>
            {missingFields.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      <ReviewSection
        icon={Sparkles}
        title="Year Overview"
        description="Start with the year you are reporting on and the moments you want Ashinaga to know about."
      >
        <div className="space-y-6">
          <div className="grid gap-2">
            <RequiredLabel htmlFor="academicYear">Academic year</RequiredLabel>
            <Input
              id="academicYear"
              value={form.academicYear}
              readOnly
              disabled
              className="md:max-w-xs bg-muted"
            />
          </div>

          <LongTextField
            id="highlights"
            label="Please describe any highlights; such as distinctions, awards, accomplishments, projects, or anything you are particularly proud of."
            required
            value={form.highlights}
            disabled={saving || isSubmitted}
            onChange={(value) => updateField('highlights', value)}
          />
        </div>
      </ReviewSection>

      <ReviewSection
        icon={BriefcaseBusiness}
        title="Work And Activities"
        description="Share employment, extracurriculars, personal projects, clubs, and other activities from the year."
      >
        <div className="space-y-6">
          <LongTextField
            id="partTimeJobs"
            label="Over the last year, have you had any part-time job(s)? Please briefly describe them."
            required
            value={form.partTimeJobs}
            disabled={saving || isSubmitted}
            onChange={(value) => updateField('partTimeJobs', value)}
          />

          <LongTextField
            id="extracurriculars"
            label="Extracurriculars: What activities did you get involved in, such as hobbies, personal projects, clubs, etc.?"
            required
            value={form.extracurriculars}
            disabled={saving || isSubmitted}
            onChange={(value) => updateField('extracurriculars', value)}
          />
        </div>
      </ReviewSection>

      <ReviewSection
        icon={HandHeart}
        title="Leadership And Pay It Forward"
        description="Summarise leadership roles and ways you passed kindness forward this year."
      >
        <div className="space-y-6">
          <LongTextField
            id="leadershipRolesDescription"
            label="Leadership roles description: Describe the roles, organisations, events, etc."
            required
            value={form.leadershipRolesDescription}
            disabled={saving || isSubmitted}
            wordLimit={WORD_LIMIT}
            onChange={(value) => updateField('leadershipRolesDescription', value)}
          />

          <NumberField
            id="leadershipRolesCount"
            label="How many leadership roles this year?"
            required
            value={form.leadershipRolesCount}
            disabled={saving || isSubmitted}
            onChange={(value) => updateField('leadershipRolesCount', value)}
          />

          <LongTextField
            id="payItForwardDescription"
            label="How have you paid it forward this year? Defined as passing on the kindness you have received, above and beyond everyday kindness, with no expectation of return."
            required
            value={form.payItForwardDescription}
            disabled={saving || isSubmitted}
            wordLimit={WORD_LIMIT}
            onChange={(value) => updateField('payItForwardDescription', value)}
          />

          <NumberField
            id="payItForwardCount"
            label="How many pay-it-forward activities this year?"
            required
            value={form.payItForwardCount}
            disabled={saving || isSubmitted}
            onChange={(value) => updateField('payItForwardCount', value)}
          />
        </div>
      </ReviewSection>

      <ReviewSection
        icon={Globe2}
        title="Africa Engagement And Internships"
        description="Capture sub-Saharan Africa-related activities and internship experience."
      >
        <div className="space-y-6">
          <LongTextField
            id="subSaharanAfricaActivitiesDescription"
            label="What activities connected to sub-Saharan Africa have you been involved in? Describe the role, organisation, event, etc."
            required
            value={form.subSaharanAfricaActivitiesDescription}
            disabled={saving || isSubmitted}
            wordLimit={WORD_LIMIT}
            onChange={(value) => updateField('subSaharanAfricaActivitiesDescription', value)}
          />

          <NumberField
            id="subSaharanAfricaActivitiesCount"
            label="How many sub-Saharan Africa-related activities this year?"
            required
            value={form.subSaharanAfricaActivitiesCount}
            disabled={saving || isSubmitted}
            onChange={(value) => updateField('subSaharanAfricaActivitiesCount', value)}
          />

          <NumberField
            id="independentInternshipsCount"
            label="How many independently secured internships did you complete this year? Total number anywhere in the world."
            required
            value={form.independentInternshipsCount}
            disabled={saving || isSubmitted}
            onChange={(value) => updateField('independentInternshipsCount', value)}
          />

          <LongTextField
            id="internshipsInAfricaSummary"
            label="Internships in Africa summary: Describe the positions, roles, etc."
            required
            value={form.internshipsInAfricaSummary}
            disabled={saving || isSubmitted}
            onChange={(value) => updateField('internshipsInAfricaSummary', value)}
          />

          <LongTextField
            id="internshipsElsewhereSummary"
            label="Internships in UK, or elsewhere except Africa summary: Describe the positions, roles, etc."
            required
            value={form.internshipsElsewhereSummary}
            disabled={saving || isSubmitted}
            onChange={(value) => updateField('internshipsElsewhereSummary', value)}
          />

          <div className="grid gap-2">
            <RequiredLabel>
              Did you complete your Ashinaga 8-week internship in sub-Saharan Africa this year?
            </RequiredLabel>
            <Select
              value={form.completedAshinagaAfricaInternship}
              onValueChange={(value: FormState['completedAshinagaAfricaInternship']) =>
                updateField('completedAshinagaAfricaInternship', value)
              }
              disabled={saving || isSubmitted}
            >
              <SelectTrigger className="md:max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_answered">Not answered</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ReviewSection>

      <ReviewSection
        icon={BookOpen}
        title="Academic Results"
        description="Record your classification and weighted grade for the academic year."
      >
        <div className="space-y-6">
          <div className="grid gap-2">
            <RequiredLabel htmlFor="academicYearAverageClassification">
              What was your academic year average? Please input according to classification, e.g.
              1st, 2:1, 2:2, 3rd.
            </RequiredLabel>
            <Input
              id="academicYearAverageClassification"
              value={form.academicYearAverageClassification}
              onChange={(event) =>
                updateField('academicYearAverageClassification', event.target.value)
              }
              disabled={saving || isSubmitted}
              className="md:max-w-md"
            />
          </div>

          <div className="grid gap-2">
            <RequiredLabel htmlFor="academicYearWeightedGrade">
              What is your year average weighted grade for the academic year? For example, 70% /
              64%.
            </RequiredLabel>
            <Input
              id="academicYearWeightedGrade"
              value={form.academicYearWeightedGrade}
              onChange={(event) => updateField('academicYearWeightedGrade', event.target.value)}
              disabled={saving || isSubmitted}
              className="md:max-w-md"
            />
          </div>
        </div>
      </ReviewSection>
    </div>
  );
}

function ReviewSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border bg-white shadow-sm dark:border-sidebar-border dark:bg-sidebar">
      <CardHeader className="border-b bg-ashinaga-teal-50/70 dark:border-sidebar-border dark:bg-accent/30">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ashinaga-teal-600 text-white">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

function RequiredLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-red-600">*</span>
    </Label>
  );
}

function LongTextField({
  id,
  label,
  required,
  value,
  disabled,
  wordLimit,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  disabled: boolean;
  wordLimit?: number;
  onChange: (value: string) => void;
}) {
  const words = countWords(value);
  const isOverLimit = wordLimit !== undefined && words > wordLimit;

  return (
    <div className="grid gap-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        {required ? (
          <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
        ) : (
          <Label htmlFor={id}>{label}</Label>
        )}
        {wordLimit !== undefined && (
          <span
            className={
              isOverLimit
                ? 'shrink-0 text-sm text-red-600'
                : 'shrink-0 text-sm text-muted-foreground'
            }
          >
            {words}/{wordLimit} words
          </span>
        )}
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        disabled={disabled}
        className={isOverLimit ? 'border-red-500 focus-visible:ring-red-500' : undefined}
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  required,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {required ? (
        <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      <Input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="md:max-w-xs"
      />
    </div>
  );
}
