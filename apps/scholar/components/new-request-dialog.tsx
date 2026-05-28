'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import type { CreateRequestData } from '../lib/api-client';
import { useFileUpload } from '../lib/hooks/use-file-upload';
import { useCreateRequest, useStaffList } from '../lib/hooks/use-queries';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

// Form schema for the base request
const baseSchema = z
  .object({
    type: z.enum([
      'extenuating_circumstances',
      'summer_funding_request',
      'summer_funding_report',
      'requirement_submission',
    ]),
    description: z
      .string()
      .trim()
      .max(
        2000,
        'Description must be 2000 characters or fewer. Shorten the request before submitting.'
      ),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    assigneeIds: z
      .array(z.string().min(1))
      .min(
        1,
        'Assign this request to at least one staff member so the right person can review it.'
      ),
  })
  .superRefine((values, context) => {
    if (values.type === 'extenuating_circumstances' && values.description.trim().length < 20) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message:
          'Description must be at least 20 characters. Add what happened, when it happened, and what support you need.',
      });
    }
  });

type FormValues = z.infer<typeof baseSchema>;
type TypeSpecificErrors = Partial<
  Record<
    | 'activityType'
    | 'riskOfNotCarryingOut'
    | 'riskDetails'
    | 'appliedForAlternativeFunding'
    | 'receivingOtherFunding'
    | 'otherFundingSource'
    | 'otherFundingAmount'
    | 'travelInsuranceAcknowledged'
    | 'informationTruthful'
    | 'activitySummary'
    | 'learningOutcomes'
    | 'submissionType'
    | 'attachments',
    string
  >
>;

interface NewRequestDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function NewRequestDialog({ trigger, onSuccess }: NewRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const createRequest = useCreateRequest();
  const { data: staffList, isLoading: isLoadingStaff } = useStaffList(open);
  const { uploadFiles, uploadProgress, isUploading, resetProgress } = useFileUpload();

  // Type-specific form data (managed separately from main form)
  const [activityType, setActivityType] = useState<string>('');
  const [appliedForAlternativeFunding, setAppliedForAlternativeFunding] = useState<string>('');
  const [receivingOtherFunding, setReceivingOtherFunding] = useState<string>('');
  const [otherFundingSource, setOtherFundingSource] = useState<string>('');
  const [otherFundingAmount, setOtherFundingAmount] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [travelInsuranceAcknowledged, setTravelInsuranceAcknowledged] = useState(false);
  const [informationTruthful, setInformationTruthful] = useState(false);
  const [activitySummary, setActivitySummary] = useState<string>('');
  const [learningOutcomes, setLearningOutcomes] = useState<string>('');
  const [challengesFaced, setChallengesFaced] = useState<string>('');
  const [submissionType, setSubmissionType] = useState<string>('');
  const [riskOfNotCarryingOut, setRiskOfNotCarryingOut] = useState<string>('');
  const [riskDetails, setRiskDetails] = useState<string>('');
  const [typeSpecificErrors, setTypeSpecificErrors] = useState<TypeSpecificErrors>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      type: 'extenuating_circumstances',
      description: '',
      priority: 'medium',
      assigneeIds: [],
    },
  });

  const selectedType = form.watch('type');

  useEffect(() => {
    if (!staffList) return;

    const current = form.getValues('assigneeIds') ?? [];
    const validIds = new Set(staffList.map((s) => s.id));
    const filtered = current.filter((id) => validIds.has(id));

    const onlyStaffMember = staffList[0];

    if (staffList.length === 1 && onlyStaffMember && filtered.length === 0) {
      form.setValue('assigneeIds', [onlyStaffMember.id]);
      return;
    }

    if (filtered.length !== current.length) {
      form.setValue('assigneeIds', filtered);
    }
  }, [form, staffList]);

  const buildRequestDescription = (type: FormValues['type'], description: string) => {
    const trimmedDescription = description.trim();
    if (trimmedDescription) return trimmedDescription;

    if (type === 'summer_funding_request') {
      const activityTypeLabels: Record<string, string> = {
        internship_ssa: '8-week+ internship in sub-Saharan Africa',
        research_placement: 'university research placement',
        visiting_home_volunteering: 'visiting home and volunteering',
      };

      return `Summer funding request: ${activityTypeLabels[activityType] || 'summer activity'}`;
    }

    if (type === 'summer_funding_report') {
      return 'Summer funding report';
    }

    if (type === 'requirement_submission') {
      const submissionTypeLabels: Record<string, string> = {
        ashinaga_proposal: 'Ashinaga Proposal',
        transcript: 'Transcript',
        tenancy_agreement: 'Tenancy Agreement',
        other: 'Other requirement',
      };

      return `Requirement submission: ${
        submissionTypeLabels[submissionType] || 'supporting document'
      }`;
    }

    return trimmedDescription;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 10MB limit`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetTypeSpecificData = () => {
    setActivityType('');
    setAppliedForAlternativeFunding('');
    setReceivingOtherFunding('');
    setOtherFundingSource('');
    setOtherFundingAmount('');
    setAdditionalNotes('');
    setTravelInsuranceAcknowledged(false);
    setInformationTruthful(false);
    setActivitySummary('');
    setLearningOutcomes('');
    setChallengesFaced('');
    setSubmissionType('');
    setRiskOfNotCarryingOut('');
    setRiskDetails('');
    setTypeSpecificErrors({});
  };

  const clearTypeSpecificError = (field: keyof TypeSpecificErrors) => {
    setTypeSpecificErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const requiredLabel = (
    <>
      <span className="text-red-500" aria-hidden="true">
        *
      </span>
      <span className="sr-only"> required</span>
    </>
  );

  const optionalLabel = <span className="text-muted-foreground font-normal">(optional)</span>;

  const fieldError = (field: keyof TypeSpecificErrors) =>
    typeSpecificErrors[field] ? (
      <p className="text-sm font-medium text-destructive">{typeSpecificErrors[field]}</p>
    ) : null;

  const validateTypeSpecificData = () => {
    const type = form.getValues('type');
    const errors: TypeSpecificErrors = {};

    if (type === 'summer_funding_request') {
      if (!activityType) {
        errors.activityType =
          'Select the summer activity type that matches the funding you are requesting.';
      }
      if (!riskOfNotCarryingOut) {
        errors.riskOfNotCarryingOut =
          'Choose Yes or No so staff know whether your summer activity is confirmed.';
      }
      if (riskOfNotCarryingOut === 'yes' && riskDetails.trim().length < 20) {
        errors.riskDetails =
          'Risk details must be at least 20 characters. Explain what could prevent the activity and when you will know more.';
      }
      if (!appliedForAlternativeFunding) {
        errors.appliedForAlternativeFunding =
          'Select the option that describes whether you applied for other funding.';
      }
      if (!receivingOtherFunding) {
        errors.receivingOtherFunding =
          'Choose Yes or No so staff can understand the full funding picture.';
      }
      if (receivingOtherFunding === 'yes' && otherFundingSource.trim().length < 3) {
        errors.otherFundingSource =
          'Enter the name of the funding source, such as a university bursary or employer grant.';
      }
      if (receivingOtherFunding === 'yes' && otherFundingAmount.trim().length < 1) {
        errors.otherFundingAmount = 'Enter the funding amount and currency, for example GBP 500.';
      }
      if (!travelInsuranceAcknowledged) {
        errors.travelInsuranceAcknowledged =
          'Confirm that you understand you must arrange your own travel insurance.';
      }
      if (!informationTruthful) {
        errors.informationTruthful =
          'Confirm the information is true and accurate before submitting.';
      }
      if (selectedFiles.length === 0) {
        errors.attachments =
          'Attach an offer letter or activity confirmation before submitting a summer funding request.';
      }
    }

    if (type === 'summer_funding_report') {
      if (activitySummary.trim().length < 50) {
        errors.activitySummary =
          'Activity summary must be at least 50 characters. Include what you did, where, and when.';
      }
      if (learningOutcomes.trim().length < 50) {
        errors.learningOutcomes =
          'Learning outcomes must be at least 50 characters. Describe what changed in your skills, plans, or understanding.';
      }
    }

    if (type === 'requirement_submission') {
      if (!submissionType) {
        errors.submissionType = 'Select the type of requirement you are submitting.';
      }
      if (selectedFiles.length === 0) {
        errors.attachments =
          'Attach the document or file that satisfies this requirement before submitting.';
      }
    }

    setTypeSpecificErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const collectFormData = () => {
    const type = form.getValues('type');

    switch (type) {
      case 'summer_funding_request':
        return {
          activityType,
          appliedForAlternativeFunding,
          receivingOtherFunding,
          otherFundingSource: receivingOtherFunding === 'yes' ? otherFundingSource : undefined,
          otherFundingAmount: receivingOtherFunding === 'yes' ? otherFundingAmount : undefined,
          riskOfNotCarryingOut,
          riskDetails: riskOfNotCarryingOut === 'yes' ? riskDetails : undefined,
          additionalNotes: additionalNotes || undefined,
          travelInsuranceAcknowledged,
          informationTruthful,
        };
      case 'summer_funding_report':
        return {
          activitySummary,
          learningOutcomes,
          challengesFaced: challengesFaced || undefined,
          additionalNotes: additionalNotes || undefined,
        };
      case 'requirement_submission':
        return {
          submissionType,
          additionalNotes: additionalNotes || undefined,
        };
      default:
        return undefined;
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (!validateTypeSpecificData()) {
        toast({
          title: 'Review required fields',
          description: 'Some fields need more detail before this request can be submitted.',
          variant: 'destructive',
        });
        return;
      }
      const formData = collectFormData();
      const requestData: CreateRequestData = {
        type: values.type,
        description: buildRequestDescription(values.type, values.description),
        priority: values.priority,
        assigneeIds: values.assigneeIds,
        formData,
      };

      const newRequest = await createRequest.mutateAsync(requestData);

      if (selectedFiles.length > 0 && newRequest.id) {
        try {
          await uploadFiles(selectedFiles, newRequest.id);
        } catch {
          toast({
            title: 'Request created',
            description: 'Your request was submitted but some files failed to upload.',
            variant: 'destructive',
          });
          form.reset();
          setSelectedFiles([]);
          resetProgress();
          resetTypeSpecificData();
          setOpen(false);
          onSuccess?.();
          return;
        }
      }

      toast({
        title: 'Request submitted',
        description: 'Your request has been submitted successfully. Staff will review it soon.',
      });

      form.reset();
      setSelectedFiles([]);
      resetProgress();
      resetTypeSpecificData();
      setOpen(false);
      onSuccess?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const requestTypeOptions = [
    { value: 'extenuating_circumstances', label: 'Extenuating Circumstances' },
    { value: 'summer_funding_request', label: 'Summer Funding Request' },
    { value: 'summer_funding_report', label: 'Summer Funding Report' },
    { value: 'requirement_submission', label: 'Requirement Submission' },
  ];

  const priorityOptions = [
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' },
  ];

  const renderTypeSpecificFields = () => {
    switch (selectedType) {
      case 'extenuating_circumstances':
        return null;

      case 'summer_funding_request':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Summer Funding Request</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Note: You must attach an offer letter or confirmation of your summer activity.
            </p>

            <div className="space-y-2">
              <Label>Activity type {requiredLabel}</Label>
              <p className="text-sm text-muted-foreground">
                Select the option that best matches the activity your funding will support.
              </p>
              <RadioGroup
                value={activityType}
                onValueChange={(value) => {
                  setActivityType(value);
                  clearTypeSpecificError('activityType');
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="internship_ssa" id="internship_ssa" />
                  <label htmlFor="internship_ssa" className="text-sm">
                    An 8-week+ internship in sub-Saharan Africa
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="research_placement" id="research_placement" />
                  <label htmlFor="research_placement" className="text-sm">
                    A university research placement
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="visiting_home_volunteering"
                    id="visiting_home_volunteering"
                  />
                  <label htmlFor="visiting_home_volunteering" className="text-sm">
                    Visiting home and volunteering
                  </label>
                </div>
              </RadioGroup>
              {fieldError('activityType')}
            </div>

            <div className="space-y-2">
              <Label>
                Is there any strong risk of not being able to carry out the activities you are
                applying for? {requiredLabel}
              </Label>
              <p className="text-sm text-muted-foreground">
                Examples include pending confirmation of exam resits or an unconfirmed internship
                offer.
              </p>
              <RadioGroup
                value={riskOfNotCarryingOut}
                onValueChange={(value) => {
                  setRiskOfNotCarryingOut(value);
                  clearTypeSpecificError('riskOfNotCarryingOut');
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="risk_yes" />
                  <label htmlFor="risk_yes" className="text-sm">
                    Yes
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="risk_no" />
                  <label htmlFor="risk_no" className="text-sm">
                    No
                  </label>
                </div>
              </RadioGroup>
              {fieldError('riskOfNotCarryingOut')}
            </div>

            {riskOfNotCarryingOut === 'yes' && (
              <div className="space-y-2">
                <Label>Risk details {requiredLabel}</Label>
                <p className="text-sm text-muted-foreground">
                  Explain what might stop the activity and when you expect the risk to be resolved.
                </p>
                <Textarea
                  placeholder="For example: My internship confirmation is pending until 12 June..."
                  value={riskDetails}
                  onChange={(e) => {
                    setRiskDetails(e.target.value);
                    clearTypeSpecificError('riskDetails');
                  }}
                  className="resize-none min-h-[80px]"
                />
                {fieldError('riskDetails')}
              </div>
            )}

            <div className="space-y-2">
              <Label>Have you applied for alternative funding? {requiredLabel}</Label>
              <p className="text-sm text-muted-foreground">
                Include applications to your university, employer, host organisation, or other
                funders.
              </p>
              <RadioGroup
                value={appliedForAlternativeFunding}
                onValueChange={(value) => {
                  setAppliedForAlternativeFunding(value);
                  clearTypeSpecificError('appliedForAlternativeFunding');
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes_successful" id="yes_successful" />
                  <label htmlFor="yes_successful" className="text-sm">
                    Yes, and I was successful
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes_unsuccessful" id="yes_unsuccessful" />
                  <label htmlFor="yes_unsuccessful" className="text-sm">
                    Yes, but I was unsuccessful
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no_alternative" />
                  <label htmlFor="no_alternative" className="text-sm">
                    No, I have not applied
                  </label>
                </div>
              </RadioGroup>
              {fieldError('appliedForAlternativeFunding')}
            </div>

            <div className="space-y-2">
              <Label>Are you receiving any other funding for this activity? {requiredLabel}</Label>
              <p className="text-sm text-muted-foreground">
                Select Yes if any part of the activity cost is already covered by another source.
              </p>
              <RadioGroup
                value={receivingOtherFunding}
                onValueChange={(value) => {
                  setReceivingOtherFunding(value);
                  clearTypeSpecificError('receivingOtherFunding');
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="receiving_yes" />
                  <label htmlFor="receiving_yes" className="text-sm">
                    Yes
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="receiving_no" />
                  <label htmlFor="receiving_no" className="text-sm">
                    No
                  </label>
                </div>
              </RadioGroup>
              {fieldError('receivingOtherFunding')}
            </div>

            {receivingOtherFunding === 'yes' && (
              <>
                <div className="space-y-2">
                  <Label>Funding source {requiredLabel}</Label>
                  <p className="text-sm text-muted-foreground">
                    Name the organisation, programme, or person providing the funding.
                  </p>
                  <Textarea
                    placeholder="For example: University travel bursary"
                    value={otherFundingSource}
                    onChange={(e) => {
                      setOtherFundingSource(e.target.value);
                      clearTypeSpecificError('otherFundingSource');
                    }}
                    className="resize-none"
                  />
                  {fieldError('otherFundingSource')}
                </div>
                <div className="space-y-2">
                  <Label>Funding amount {requiredLabel}</Label>
                  <p className="text-sm text-muted-foreground">
                    Include the amount and currency if it is confirmed or estimated.
                  </p>
                  <Input
                    placeholder="For example: GBP 500"
                    value={otherFundingAmount}
                    onChange={(e) => {
                      setOtherFundingAmount(e.target.value);
                      clearTypeSpecificError('otherFundingAmount');
                    }}
                  />
                  {fieldError('otherFundingAmount')}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Additional notes {optionalLabel}</Label>
              <Textarea
                placeholder="Add anything else staff should know about this request..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <Checkbox
                checked={travelInsuranceAcknowledged}
                onCheckedChange={(checked) => {
                  setTravelInsuranceAcknowledged(checked === true);
                  clearTypeSpecificError('travelInsuranceAcknowledged');
                }}
              />
              <div className="space-y-1 leading-none">
                <Label>
                  I acknowledge that I need to arrange my own travel insurance {requiredLabel}
                </Label>
                <p className="text-sm text-muted-foreground">
                  You are responsible for arranging appropriate travel insurance for your summer
                  activity.
                </p>
                {fieldError('travelInsuranceAcknowledged')}
              </div>
            </div>

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <Checkbox
                checked={informationTruthful}
                onCheckedChange={(checked) => {
                  setInformationTruthful(checked === true);
                  clearTypeSpecificError('informationTruthful');
                }}
              />
              <div className="space-y-1 leading-none">
                <Label>
                  I confirm that all information provided is true and accurate {requiredLabel}
                </Label>
                {fieldError('informationTruthful')}
              </div>
            </div>
          </div>
        );

      case 'summer_funding_report':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Summer Funding Report</h4>
            <p className="text-sm text-muted-foreground">
              Please provide a report on your summer activity and learning outcomes.
            </p>

            <div className="space-y-2">
              <Label>Activity summary {requiredLabel}</Label>
              <p className="text-sm text-muted-foreground">
                Summarise what you did, where the activity took place, and the dates covered.
              </p>
              <Textarea
                placeholder="Describe what you did during your summer activity..."
                value={activitySummary}
                onChange={(e) => {
                  setActivitySummary(e.target.value);
                  clearTypeSpecificError('activitySummary');
                }}
                className="min-h-[100px] resize-none"
              />
              <p className="text-sm text-muted-foreground">Minimum 50 characters</p>
              {fieldError('activitySummary')}
            </div>

            <div className="space-y-2">
              <Label>Learning outcomes {requiredLabel}</Label>
              <p className="text-sm text-muted-foreground">
                Describe what you learned and how the experience affected your plans or skills.
              </p>
              <Textarea
                placeholder="For example: I developed lab skills and confirmed my interest in..."
                value={learningOutcomes}
                onChange={(e) => {
                  setLearningOutcomes(e.target.value);
                  clearTypeSpecificError('learningOutcomes');
                }}
                className="min-h-[80px] resize-none"
              />
              {fieldError('learningOutcomes')}
            </div>

            <div className="space-y-2">
              <Label>Challenges faced {optionalLabel}</Label>
              <Textarea
                placeholder="Were there any challenges you faced?"
                value={challengesFaced}
                onChange={(e) => setChallengesFaced(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional notes {optionalLabel}</Label>
              <Textarea
                placeholder="Any other comments or reflections..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
        );

      case 'requirement_submission':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Requirement Submission</h4>
            <p className="text-sm text-muted-foreground">
              Submit required documents or materials. Please attach the relevant files.
            </p>

            <div className="space-y-2">
              <Label>Submission type {requiredLabel}</Label>
              <p className="text-sm text-muted-foreground">
                Choose the requirement that matches the document or material you are uploading.
              </p>
              <RadioGroup
                value={submissionType}
                onValueChange={(value) => {
                  setSubmissionType(value);
                  clearTypeSpecificError('submissionType');
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ashinaga_proposal" id="ashinaga_proposal" />
                  <label htmlFor="ashinaga_proposal" className="text-sm">
                    Ashinaga Proposal
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="transcript" id="transcript" />
                  <label htmlFor="transcript" className="text-sm">
                    Transcript
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tenancy_agreement" id="tenancy_agreement" />
                  <label htmlFor="tenancy_agreement" className="text-sm">
                    Tenancy Agreement
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other_submission" />
                  <label htmlFor="other_submission" className="text-sm">
                    Other
                  </label>
                </div>
              </RadioGroup>
              {fieldError('submissionType')}
            </div>

            <div className="space-y-2">
              <Label>Additional notes {optionalLabel}</Label>
              <Textarea
                placeholder="Any additional information about this submission..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Submit New Request</DialogTitle>
          <DialogDescription>
            Submit a request to staff for support, assistance, or to report circumstances affecting
            your studies.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request type {requiredLabel}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('description', '');
                      form.clearErrors('description');
                      resetTypeSpecificData();
                      setSelectedFiles([]);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {requestTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the category that best matches what you need staff to review.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority level {optionalLabel}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Use High only when the request needs immediate attention because a deadline or
                    risk is close.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigneeIds"
              render={({ field }) => {
                const selected = field.value ?? [];
                const toggle = (id: string) => {
                  if (selected.includes(id)) {
                    field.onChange(selected.filter((x) => x !== id));
                  } else {
                    field.onChange([...selected, id]);
                  }
                };
                return (
                  <FormItem>
                    <FormLabel>Assign to Staff Members {requiredLabel}</FormLabel>
                    <FormControl>
                      <div className="rounded-md border p-3 max-h-56 overflow-y-auto space-y-2">
                        {isLoadingStaff ? (
                          <p className="text-sm text-muted-foreground">Loading staff...</p>
                        ) : !staffList || staffList.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No staff available.</p>
                        ) : (
                          staffList.map((staff) => {
                            const checked = selected.includes(staff.id);
                            return (
                              <label
                                key={staff.id}
                                className="flex items-start gap-2 cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggle(staff.id)}
                                  className="mt-0.5"
                                />
                                <span>
                                  <span className="font-medium">{staff.name}</span>{' '}
                                  <span className="text-muted-foreground">({staff.email})</span>
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select one or more staff members who should review and respond to this
                      request.
                      {selected.length > 0 && (
                        <span className="block text-xs mt-1">{selected.length} selected</span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {selectedType === 'extenuating_circumstances' && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description {requiredLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain what happened, when it happened, and what support or decision you need..."
                        className="min-h-[120px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include the key dates, circumstances, and outcome you are asking for.
                      <span className="block text-xs mt-1">
                        {field.value?.length || 0}/2000 characters
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Type-specific fields */}
            {renderTypeSpecificFields()}

            {/* File Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Attachments{' '}
                  {selectedType === 'summer_funding_request' ||
                  selectedType === 'requirement_submission'
                    ? requiredLabel
                    : optionalLabel}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Add Files
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
                onChange={(event) => {
                  handleFileSelect(event);
                  clearTypeSpecificError('attachments');
                }}
                className="hidden"
              />

              {selectedFiles.length > 0 && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  {selectedFiles.map((file, index) => {
                    const progress = uploadProgress.find((p) => p.file === file);
                    return (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center justify-between p-2 bg-white rounded border"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            {progress && progress.status === 'uploading' && (
                              <Progress value={progress.progress} className="h-1 mt-1" />
                            )}
                            {progress && progress.status === 'error' && (
                              <p className="text-xs text-red-600 mt-1">{progress.error}</p>
                            )}
                          </div>
                        </div>
                        {!isUploading && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Accepted formats: PDF, Word, Excel, Text, Images. Max size: 10MB per file.
              </p>
              {fieldError('attachments')}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSelectedFiles([]);
                  resetProgress();
                  resetTypeSpecificData();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRequest.isPending || isUploading}
                className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
              >
                {isUploading
                  ? 'Uploading...'
                  : createRequest.isPending
                    ? 'Submitting...'
                    : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
