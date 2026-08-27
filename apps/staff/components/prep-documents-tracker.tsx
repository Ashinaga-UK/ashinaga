'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  createRequiredDocumentType,
  getRequiredDocumentDownloadUrl,
  updateRequiredDocumentType,
} from '../lib/api-client';
import { useRequiredDocumentCohort, useRequiredDocumentTypes } from '../lib/hooks/use-queries';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useToast } from './ui/use-toast';

export function PrepDocumentsTracker({
  onViewScholar,
}: {
  onViewScholar: (scholarId: string) => void;
}) {
  const [missingTypeId, setMissingTypeId] = useState<string>('all');
  const { data, isLoading, error } = useRequiredDocumentCohort(
    missingTypeId === 'all' ? undefined : missingTypeId
  );
  const { data: allTypes = [] } = useRequiredDocumentTypes();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newLabel, setNewLabel] = useState('');
  const [savingType, setSavingType] = useState(false);

  const types = data?.types ?? [];
  const scholars = data?.scholars ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['required-documents'] });
  };

  const handleDownload = async (fileId: string) => {
    try {
      const { downloadUrl } = await getRequiredDocumentDownloadUrl(fileId);
      window.location.href = downloadUrl;
    } catch (downloadError) {
      toast({
        title: 'Could not download file',
        description: downloadError instanceof Error ? downloadError.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddType = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setSavingType(true);
    try {
      await createRequiredDocumentType({ label });
      setNewLabel('');
      await refresh();
      toast({ title: 'Document type added' });
    } catch (addError) {
      toast({
        title: 'Could not add type',
        description: addError instanceof Error ? addError.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingType(false);
    }
  };

  const handleToggleType = async (typeId: string, isActive: boolean) => {
    try {
      await updateRequiredDocumentType(typeId, { isActive: !isActive });
      await refresh();
    } catch (toggleError) {
      toast({
        title: 'Could not update type',
        description: toggleError instanceof Error ? toggleError.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Prep Year documents...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Could not load the document tracker.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Cohort status</h3>
          <p className="text-sm text-muted-foreground">
            Submitted and missing required documents for Prep Year candidates.
          </p>
        </div>
        <Select value={missingTypeId} onValueChange={setMissingTypeId}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Filter missing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All candidates</SelectItem>
            {types.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                Missing {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              {types.map((type) => (
                <TableHead key={type.id}>{type.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {scholars.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(types.length + 1, 1)}
                  className="text-center text-muted-foreground"
                >
                  No Prep Year candidates match this filter.
                </TableCell>
              </TableRow>
            ) : (
              scholars.map((scholar) => (
                <TableRow key={scholar.scholarId}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => onViewScholar(scholar.scholarId)}
                    >
                      {scholar.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{scholar.email}</p>
                  </TableCell>
                  {types.map((type) => {
                    const cell = scholar.items.find((item) => item.typeId === type.id);
                    const submitted = cell?.status === 'submitted' && cell.file;
                    return (
                      <TableCell key={type.id}>
                        {submitted ? (
                          <div className="flex items-center gap-2">
                            <Badge>Submitted</Badge>
                            <span className="max-w-[140px] truncate text-xs text-muted-foreground">
                              {cell.file?.fileName}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cell.file && handleDownload(cell.file.id)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span className="sr-only">Download</span>
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="secondary">Missing</Badge>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Manage required types</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="Add a document type"
          />
          <Button type="button" onClick={handleAddType} disabled={savingType || !newLabel.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Add type
          </Button>
        </div>
        <ul className="space-y-2">
          {allTypes.map((type) => (
            <li key={type.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {type.label}
                {!type.isActive ? (
                  <span className="ml-2 text-muted-foreground">(inactive)</span>
                ) : null}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleType(type.id, type.isActive)}
              >
                {type.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
