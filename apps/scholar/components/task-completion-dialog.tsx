'use client';

import { AlertCircle, FileText, Loader2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import type { Task } from '../lib/api/tasks';
import { useFileUpload } from '../lib/hooks/use-file-upload';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';

interface TaskCompletionDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (taskId: string, responseText: string, attachmentIds: any[]) => Promise<void>;
}

export function TaskCompletionDialog({
  task,
  open,
  onOpenChange,
  onComplete,
}: TaskCompletionDialogProps) {
  const [responseText, setResponseText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFileData, setUploadedFileData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { uploadFiles, uploadProgress, isUploading } = useFileUpload();

  const requiresDocument = task.type === 'document_upload';
  const requiresResponse = ['feedback_submission', 'form_completion', 'goal_update'].includes(
    task.type
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (requiresDocument && selectedFiles.length === 0 && uploadedFileData.length === 0) {
      setError('Please upload at least one document for this task');
      return;
    }

    if (requiresResponse && !responseText.trim()) {
      setError('Please provide a response for this task');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload files if any
      let fileData = [...uploadedFileData];
      if (selectedFiles.length > 0) {
        const uploadedFiles = await uploadFiles(selectedFiles, task.id);
        // Pass the complete file metadata including S3 keys
        fileData = [...fileData, ...uploadedFiles];
        setUploadedFileData(fileData);
      }

      // Complete the task with full file metadata
      await onComplete(task.id, responseText, fileData);

      // Reset form
      setResponseText('');
      setSelectedFiles([]);
      setUploadedFileData([]);
      onOpenChange(false);
    } catch (err) {
      setError('Failed to complete task. Please try again.');
      console.error('Error completing task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTaskTypeHelperText = () => {
    switch (task.type) {
      case 'document_upload':
        return 'Please upload the required document(s) to complete this task.';
      case 'form_completion':
        return 'Please fill in your response to complete this form.';
      case 'meeting_attendance':
        return 'Please confirm your attendance and add any notes.';
      case 'goal_update':
        return 'Please provide an update on your goal progress.';
      case 'feedback_submission':
        return 'Please provide your feedback below.';
      default:
        return 'Please provide any relevant information to complete this task.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-gray-600">{getTaskTypeHelperText()}</div>

          {/* Response Text Area */}
          <div className="space-y-2">
            <Label htmlFor="response">
              Response {requiresResponse && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="response"
              placeholder="Enter your response or notes..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">
            <Label>Attachments {requiresDocument && <span className="text-red-500">*</span>}</Label>

            {/* File Input */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <div className="space-y-2">
                {uploadProgress.map((progress, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{progress.file.name}</span>
                      <span>{Math.round(progress.progress)}%</span>
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            {isSubmitting || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploading ? 'Uploading...' : 'Completing...'}
              </>
            ) : (
              'Complete Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
