'use client';

import {
  AlertCircle,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Globe2,
  HandHeart,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  type AnnualUpdate,
  type AnnualUpdatePayload,
  getMyAnnualUpdate,
  getMyDraftAnnualUpdate,
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
const COUNT_MAX = 1000;

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

function isValidCountValue(value: string) {
  if (value.trim() === '') {
    return false;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue >= 0 && numberValue <= COUNT_MAX;
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
    if (typeof value !== 'string' || !isValidCountValue(value)) {
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

function getInvalidOptionalNumberFields(form: FormState) {
  const invalidFields: string[] = [];
  const numberFields: Array<keyof FormState> = [
    'leadershipRolesCount',
    'payItForwardCount',
    'subSaharanAfricaActivitiesCount',
    'independentInternshipsCount',
  ];

  for (const field of numberFields) {
    const value = form[field];
    if (typeof value === 'string' && value.trim() !== '' && !isValidCountValue(value)) {
      invalidFields.push(REQUIRED_FIELD_LABELS[field]);
    }
  }

  return invalidFields;
}

type FormValidation = { ok: true } | { ok: false; error: string; missingFields?: string[] };

function validateForm(form: FormState, requireComplete: boolean): FormValidation {
  const limitedFields = [
    'leadershipRolesDescription',
    'payItForwardDescription',
    'subSaharanAfricaActivitiesDescription',
  ] as const;

  if (limitedFields.some((field) => countWords(form[field]) > WORD_LIMIT)) {
    return {
      ok: false,
      error: `Please keep each limited response within ${WORD_LIMIT} words.`,
    };
  }

  const invalidNumberFields = getInvalidOptionalNumberFields(form);
  if (invalidNumberFields.length > 0) {
    return {
      ok: false,
      error: `Please enter whole numbers between 0 and ${COUNT_MAX}.`,
      missingFields: invalidNumberFields,
    };
  }

  if (requireComplete) {
    const missingFields = getMissingRequiredFields(form);
    if (missingFields.length > 0) {
      return {
        ok: false,
        error: 'Please complete all required fields before submitting.',
        missingFields,
      };
    }
  }

  return { ok: true };
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
  const [isFormOpen, setIsFormOpen] = useState(true);

  const isSubmitted = annualUpdate?.status === 'submitted';

  const foldForm = () => {
    setIsFormOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadAnnualUpdate = useCallback(async (academicYear: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyAnnualUpdate(academicYear);
      if (data) {
        setAnnualUpdate(data);
        setForm(toFormState(data, academicYear));
        setMessage(null);
        setIsFormOpen(data.status !== 'submitted');
        return;
      }

      const draft = await getMyDraftAnnualUpdate();
      setAnnualUpdate(draft);
      setForm(toFormState(draft, draft?.academicYear ?? academicYear));
      setIsFormOpen(true);
      setMessage(
        draft && draft.academicYear !== academicYear
          ? `Resumed your draft for ${draft.academicYear}.`
          : null
      );
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
    const validation = validateForm(form, false);
    if (!validation.ok) {
      setMissingFields(validation.missingFields ?? []);
      setError(validation.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await saveAnnualUpdateDraft(toPayload(form));
      setAnnualUpdate(saved);
      setMessage('Draft saved.');
      foldForm();
    } catch (saveError) {
      console.error('Failed to save annual review draft:', saveError);
      setError('Could not save this draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const validation = validateForm(form, true);
    if (!validation.ok) {
      setMissingFields(validation.missingFields ?? []);
      setError(validation.error);
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
      setMessage(null);
      foldForm();
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
                {isFormOpen && !isSubmitted ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="bg-white text-ashinaga-teal-700 hover:bg-white/90"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Draft
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={saving}
                      className="bg-ashinaga-green-900 text-white hover:bg-ashinaga-green-950"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit Final
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setIsFormOpen((open) => !open)}
                    className="bg-white text-ashinaga-teal-700 hover:bg-white/90"
                  >
                    {isFormOpen ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Hide responses
                      </>
                    ) : isSubmitted ? (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        View responses
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Continue editing
                      </>
                    )}
                  </Button>
                )}
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
            Your annual review has been submitted and can no longer be edited.
          </AlertDescription>
        </Alert>
      )}

      {message && !isSubmitted && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert
          variant="destructive"
          className="border-destructive bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-100"
        >
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

      {!isFormOpen && (
        <Card className="overflow-hidden border bg-white shadow-sm dark:border-sidebar-border dark:bg-sidebar">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold">{form.academicYear} Annual Review</p>
              {!isSubmitted && (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Your draft is saved. Continue editing whenever you are ready.
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsFormOpen(true)}>
              <ChevronDown className="h-4 w-4 mr-2" />
              {isSubmitted ? 'View responses' : 'Continue editing'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isFormOpen && (
        <>
          <ReviewSection
            icon={Sparkles}
            title="Year Overview"
            description="This review is for the academic year shown below. Share important moments you would like Ashinaga to know about."
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
            title="Leadership and Impact"
            description="Summarise your leadership roles and the ways you have passed kindness forward this year."
          >
            <div className="space-y-6">
              <NumberField
                id="leadershipRolesCount"
                label="How many leadership roles have you held this year?"
                required
                value={form.leadershipRolesCount}
                disabled={saving || isSubmitted}
                onChange={(value) => updateField('leadershipRolesCount', value)}
              />

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
                id="payItForwardCount"
                label="How many pay-it-forward activities have you taken part in this year? (Defined as passing on the kindness you have received, above and beyond everyday kindness, with no expectation of return.)"
                required
                value={form.payItForwardCount}
                disabled={saving || isSubmitted}
                onChange={(value) => updateField('payItForwardCount', value)}
              />

              <LongTextField
                id="payItForwardDescription"
                label="How have you paid it forward this year? Describe the activities."
                required
                value={form.payItForwardDescription}
                disabled={saving || isSubmitted}
                wordLimit={WORD_LIMIT}
                onChange={(value) => updateField('payItForwardDescription', value)}
              />
            </div>
          </ReviewSection>

          <ReviewSection
            icon={Globe2}
            title="Africa Engagement And Internships"
            description="Capture sub-Saharan Africa-related activities and internship experience."
          >
            <div className="space-y-6">
              <NumberField
                id="subSaharanAfricaActivitiesCount"
                label="How many sub-Saharan Africa-related activities this year?"
                required
                value={form.subSaharanAfricaActivitiesCount}
                disabled={saving || isSubmitted}
                onChange={(value) => updateField('subSaharanAfricaActivitiesCount', value)}
              />

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
                  What was your academic year average? Please input according to classification,
                  e.g. 1st, 2:1, 2:2, 3rd.
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
        </>
      )}
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
      {children} <span className="text-destructive">*</span>
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
                ? 'shrink-0 rounded-md bg-destructive/10 px-2 py-1 text-sm font-medium text-destructive dark:bg-destructive/20 dark:text-red-100'
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
        className={isOverLimit ? 'border-destructive focus-visible:ring-destructive' : undefined}
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
        <RequiredLabel htmlFor={id}>
          {label} <span className="font-normal text-muted-foreground">(Enter a number)</span>
        </RequiredLabel>
      ) : (
        <Label htmlFor={id}>
          {label} <span className="font-normal text-muted-foreground">(Enter a number)</span>
        </Label>
      )}
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="2"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (/^\d*$/.test(nextValue)) {
            onChange(nextValue);
          }
        }}
        disabled={disabled}
        className="md:max-w-xs"
      />
    </div>
  );
}
