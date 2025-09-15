'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useFileUpload } from '../lib/hooks/use-file-upload';
import { useCreateRequest } from '../lib/hooks/use-queries';
import { Button } from './ui/button';
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
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

const formSchema = z.object({
  type: z.enum(['financial_support', 'extenuating_circumstances', 'academic_support']),
  description: z
    .string()
    .min(20, 'Please provide at least 20 characters')
    .max(1000, 'Maximum 1000 characters'),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
  const { uploadFiles, uploadProgress, isUploading, resetProgress } = useFileUpload();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'academic_support',
      description: '',
      priority: 'medium',
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => {
      // Validate file size (max 10MB)
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
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      // First create the request
      const newRequest = await createRequest.mutateAsync(values);

      // Then upload files if any are selected
      if (selectedFiles.length > 0 && newRequest.id) {
        try {
          await uploadFiles(selectedFiles, newRequest.id);
        } catch (uploadError) {
          // Files failed to upload but request was created
          toast({
            title: 'Request created',
            description: 'Your request was submitted but some files failed to upload.',
            variant: 'destructive',
          });
          // Still close dialog and reset since request was created
          form.reset();
          setSelectedFiles([]);
          resetProgress();
          setOpen(false);
          onSuccess?.();
          return;
        }
      }

      toast({
        title: 'Request submitted',
        description: 'Your request has been submitted successfully. Staff will review it soon.',
      });

      // Reset everything
      form.reset();
      setSelectedFiles([]);
      resetProgress();
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
    { value: 'financial_support', label: 'Financial Support' },
    { value: 'extenuating_circumstances', label: 'Extenuating Circumstances' },
    { value: 'academic_support', label: 'Academic Support' },
  ];

  const priorityOptions = [
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' },
  ];

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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe your request in detail..."
                      className="min-h-[150px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide detailed information about your request. Include relevant dates,
                    amounts, or circumstances.
                    <span className="block text-xs mt-1">
                      {field.value?.length || 0}/1000 characters
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Attachments (Optional)</label>
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
