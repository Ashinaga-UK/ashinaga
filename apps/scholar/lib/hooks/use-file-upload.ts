import { useState } from 'react';
import { fetchAPI } from '../api-client';

export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  attachmentId?: string;
}

export interface UploadedFile {
  attachmentId: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  fileKey?: string;
}

export function useFileUpload() {
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (files: File[], requestId: string): Promise<UploadedFile[]> => {
    setIsUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    // Initialize progress for all files
    const initialProgress = files.map((file) => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setUploadProgress(initialProgress);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue; // Skip if file is undefined

        // Update status to uploading
        setUploadProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: 'uploading' } : p))
        );

        try {
          // Step 1: Get pre-signed upload URL
          const { uploadUrl, fileKey, fileId } = await fetchAPI<{
            uploadUrl: string;
            fileKey: string;
            fileId: string;
          }>('/api/files/upload-url', {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            }),
          });

          // Step 2: Upload directly to S3
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              setUploadProgress((prev) =>
                prev.map((p, idx) => (idx === i ? { ...p, progress: percentComplete } : p))
              );
            }
          });

          // Upload to S3
          await new Promise<void>((resolve, reject) => {
            xhr.onloadend = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('Upload failed'));

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
          });

          // Step 3: Confirm upload with backend
          const confirmResponse = await fetchAPI<{
            attachmentId: string;
            fileKey?: string;
            fileName?: string;
            fileSize?: string;
            mimeType?: string;
          }>('/api/files/confirm', {
            method: 'POST',
            body: JSON.stringify({
              fileId,
              fileKey,
              requestId,
              fileName: file.name,
              fileSize: file.size.toString(),
              mimeType: file.type,
            }),
          });

          // Update progress to completed
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? {
                    ...p,
                    status: 'completed',
                    progress: 100,
                    attachmentId: confirmResponse.attachmentId,
                  }
                : p
            )
          );

          uploadedFiles.push({
            attachmentId: confirmResponse.attachmentId,
            fileName: confirmResponse.fileName || file.name,
            fileSize: confirmResponse.fileSize || file.size.toString(),
            mimeType: confirmResponse.mimeType || file.type,
            fileKey: confirmResponse.fileKey || fileKey,
          });
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? {
                    ...p,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : p
            )
          );
          throw error; // Re-throw to stop the upload process
        }
      }

      return uploadedFiles;
    } finally {
      setIsUploading(false);
    }
  };

  const resetProgress = () => {
    setUploadProgress([]);
  };

  return {
    uploadFiles,
    uploadProgress,
    isUploading,
    resetProgress,
  };
}
