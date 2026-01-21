'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Paperclip, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
const baseSchema = z.object({
  type: z.enum([
    'extenuating_circumstances',
    'summer_funding_request',
    'summer_funding_report',
    'requirement_submission',
  ]),
  description: z
    .string()
    .min(20, 'Please provide at least 20 characters')
    .max(2000, 'Maximum 2000 characters'),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  assignedTo: z.string().min(1, 'Please select a staff member'),
});

type FormValues = z.infer<typeof baseSchema>;

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

  const form = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      type: 'extenuating_circumstances',
      description: '',
      priority: 'medium',
      assignedTo: undefined,
    },
  });

  const selectedType = form.watch('type');

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
      const formData = collectFormData();
      const requestData: any = {
        type: values.type,
        description: values.description,
        priority: values.priority,
        assignedTo: values.assignedTo,
        formData,
      };

      const newRequest = await createRequest.mutateAsync(requestData);

      if (selectedFiles.length > 0 && newRequest.id) {
        try {
          await uploadFiles(selectedFiles, newRequest.id);
        } catch (uploadError) {
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Extenuating Circumstances Details</h4>
            <p className="text-sm text-muted-foreground">
              Please provide detailed information about the circumstances affecting your studies.
              Include relevant dates and any supporting documentation.
            </p>
          </div>
        );

      case 'summer_funding_request':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Summer Funding Request</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Note: You must attach an offer letter or confirmation of your summer activity.
            </p>

            <div className="space-y-2">
              <Label>
                Activity Type <span className="text-red-500">*</span>
              </Label>
              <RadioGroup value={activityType} onValueChange={setActivityType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="internship" id="internship" />
                  <label htmlFor="internship" className="text-sm">
                    Internship
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="summer_school" id="summer_school" />
                  <label htmlFor="summer_school" className="text-sm">
                    Summer School
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="research_project" id="research_project" />
                  <label htmlFor="research_project" className="text-sm">
                    Research Project
                  </label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>
                Have you applied for alternative funding? <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={appliedForAlternativeFunding}
                onValueChange={setAppliedForAlternativeFunding}
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
            </div>

            <div className="space-y-2">
              <Label>
                Are you receiving any other funding for this activity?{' '}
                <span className="text-red-500">*</span>
              </Label>
              <RadioGroup value={receivingOtherFunding} onValueChange={setReceivingOtherFunding}>
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
            </div>

            {receivingOtherFunding === 'yes' && (
              <>
                <div className="space-y-2">
                  <Label>Funding Source</Label>
                  <Textarea
                    placeholder="Please specify the source of funding..."
                    value={otherFundingSource}
                    onChange={(e) => setOtherFundingSource(e.target.value)}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Funding Amount</Label>
                  <Input
                    placeholder="Please specify the amount..."
                    value={otherFundingAmount}
                    onChange={(e) => setOtherFundingAmount(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Anything further you would like to note?</Label>
              <Textarea
                placeholder="Any additional information..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <Checkbox
                checked={travelInsuranceAcknowledged}
                onCheckedChange={(checked) => setTravelInsuranceAcknowledged(checked === true)}
              />
              <div className="space-y-1 leading-none">
                <Label>
                  I acknowledge that I need to arrange my own travel insurance{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  You are responsible for arranging appropriate travel insurance for your summer
                  activity.
                </p>
              </div>
            </div>

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <Checkbox
                checked={informationTruthful}
                onCheckedChange={(checked) => setInformationTruthful(checked === true)}
              />
              <div className="space-y-1 leading-none">
                <Label>
                  I confirm that all information provided is true and accurate{' '}
                  <span className="text-red-500">*</span>
                </Label>
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
              <Label>
                Activity Summary <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Describe what you did during your summer activity..."
                value={activitySummary}
                onChange={(e) => setActivitySummary(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <p className="text-sm text-muted-foreground">Minimum 50 characters</p>
            </div>

            <div className="space-y-2">
              <Label>
                Learning Outcomes <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="What did you learn from this experience?"
                value={learningOutcomes}
                onChange={(e) => setLearningOutcomes(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Challenges Faced</Label>
              <Textarea
                placeholder="Were there any challenges you faced?"
                value={challengesFaced}
                onChange={(e) => setChallengesFaced(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
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
              <Label>
                Submission Type <span className="text-red-500">*</span>
              </Label>
              <RadioGroup value={submissionType} onValueChange={setSubmissionType}>
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
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
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
                  <FormLabel>Request Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    Choose the category that best describes your request
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
                  <FormLabel>Priority Level</FormLabel>
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
                    Select high priority for urgent matters requiring immediate attention
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Assign to Staff Member <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingStaff ? 'Loading staff...' : 'Select a staff member'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffList?.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name} ({staff.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the staff member who should handle this request
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe your request in detail..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide detailed information about your request. Include relevant dates,
                    amounts, or circumstances.
                    <span className="block text-xs mt-1">
                      {field.value?.length || 0}/2000 characters
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type-specific fields */}
            {renderTypeSpecificFields()}

            {/* File Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Attachments{' '}
                  {selectedType === 'summer_funding_request' ||
                  selectedType === 'requirement_submission' ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    '(Optional)'
                  )}
                </label>
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
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFiles.length > 0 && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  {selectedFiles.map((file, index) => {
                    const progress = uploadProgress.find((p) => p.file === file);
                    return (
                      <div
                        key={index}
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
