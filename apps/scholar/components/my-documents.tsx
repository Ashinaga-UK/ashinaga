'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  confirmDocumentUpload,
  createDocumentUploadUrl,
  getRequiredDocumentDownloadUrl,
  type RequiredDocumentChecklistItem,
} from '../lib/api-client';
import { queryKeys, useMyDocumentChecklist } from '../lib/hooks/use-queries';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

const MIME_BY_EXTENSION: Record<string, (typeof ALLOWED_MIME_TYPES)[number]> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function resolveMimeType(file: File): (typeof ALLOWED_MIME_TYPES)[number] | null {
  if (ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return file.type === 'image/jpg'
      ? 'image/jpeg'
      : (file.type as (typeof ALLOWED_MIME_TYPES)[number]);
  }
  const extension = file.name.includes('.')
    ? `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
    : '';
  return MIME_BY_EXTENSION[extension] ?? null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function MyDocuments() {
  const { data, isLoading, error } = useMyDocumentChecklist();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [busyTypeId, setBusyTypeId] = useState<string | null>(null);

  const uploadForType = async (typeId: string, file: File) => {
    const fileType = resolveMimeType(file);
    if (!fileType) {
      throw new Error('Please choose a PDF, JPEG, PNG, or WebP file.');
    }
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      throw new Error('Please choose a file smaller than 10MB.');
    }

    const { uploadUrl, fields, fileKey } = await createDocumentUploadUrl({
      typeId,
      fileName: file.name,
      fileType,
      fileSize: file.size,
    });

    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, value);
    }
    formData.append('file', file);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    if (!uploadResponse.ok) {
      throw new Error('Could not upload the document. Please try again.');
    }

    await confirmDocumentUpload({
      typeId,
      pendingFileKey: fileKey,
      fileName: file.name,
      fileMimeType: fileType,
      fileSizeBytes: file.size,
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.myDocuments });
  };

  const handleDownload = async (fileId: string) => {
    const { downloadUrl } = await getRequiredDocumentDownloadUrl(fileId, 'attachment');
    window.location.href = downloadUrl;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading your documents...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">Could not load required documents. Please retry.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My Documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the required Prep Year documents. You can replace a file if you need to update it.
        </p>
      </div>
      <div className="space-y-3">
        {(data?.items ?? []).map((item) => (
          <DocumentTypeCard
            key={item.type.id}
            item={item}
            busy={busyTypeId === item.type.id}
            onBusy={(busy) => setBusyTypeId(busy ? item.type.id : null)}
            onUpload={uploadForType}
            onDownload={handleDownload}
            onError={(message) =>
              toast({
                title: 'Could not update document',
                description: message,
                variant: 'destructive',
              })
            }
            onSuccess={(message) => toast({ title: message })}
            errorMessage={getErrorMessage}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentTypeCard({
  item,
  busy,
  onBusy,
  onUpload,
  onDownload,
  onError,
  onSuccess,
  errorMessage,
}: {
  item: RequiredDocumentChecklistItem;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onUpload: (typeId: string, file: File) => Promise<void>;
  onDownload: (fileId: string) => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  errorMessage: (error: unknown) => string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submitted = item.status === 'submitted' && item.file;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <FileText className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{item.type.label}</h3>
            <Badge variant={submitted ? 'default' : 'secondary'}>
              {submitted ? 'Submitted' : 'Missing'}
            </Badge>
          </div>
          {item.type.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{item.type.description}</p>
          ) : null}
          {submitted ? (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {item.file?.fileName} · {new Date(item.file?.uploadedAt ?? '').toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            onBusy(true);
            try {
              await onUpload(item.type.id, file);
              onSuccess(submitted ? 'Document replaced' : 'Document uploaded');
            } catch (error) {
              onError(errorMessage(error));
            } finally {
              onBusy(false);
            }
          }}
        />
        {submitted ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                if (!item.file) return;
                onBusy(true);
                try {
                  await onDownload(item.file.id);
                } catch (error) {
                  onError(errorMessage(error));
                } finally {
                  onBusy(false);
                }
              }}
            >
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              Replace
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1 h-4 w-4" />
            )}
            Upload
          </Button>
        )}
      </div>
    </div>
  );
}
