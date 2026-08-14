'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Download,
  Edit,
  ExternalLink,
  FileText,
  GraduationCap,
  Library,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createResource,
  createResourceUploadUrl,
  deleteResource,
  getResourceDownloadUrl,
  type Resource,
  type ResourceCategory,
  type ResourceFilterOptions,
  type ResourceSourceType,
  type ResourceStatus,
  type ResourceType,
  updateResource,
} from '../lib/api-client';
import { queryKeys, useResourceFilterOptions, useResources } from '../lib/hooks/use-queries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Badge } from './ui/badge';
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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

type ResourceFilterDraft = {
  filterType: string;
  filterValue: string;
};

type ResourceFormData = {
  title: string;
  description: string;
  sourceType: ResourceSourceType;
  url: string;
  type: ResourceType;
  category: ResourceCategory;
  status: ResourceStatus;
};

const resourceTypes: ResourceType[] = ['Guide', 'Handbook', 'Template'];
const resourceCategories: ResourceCategory[] = ['LDF', 'Handbook', 'Proposal', 'Support'];
const typeOptions: Array<ResourceType | 'all'> = ['all', ...resourceTypes];
const categoryOptions: Array<ResourceCategory | 'all'> = ['all', ...resourceCategories];
const statusOptions: Array<ResourceStatus | 'all'> = ['all', 'draft', 'live'];

const resourceIcons: Record<ResourceType, typeof BookOpen> = {
  Guide: GraduationCap,
  Handbook: BookOpen,
  Template: FileText,
};

const emptyFilterOptions: ResourceFilterOptions = {
  programs: [],
  years: [],
  universities: [],
  locations: [],
  statuses: [],
};

const filterLabels: Record<string, string> = {
  program: 'Program',
  year: 'Year',
  university: 'University',
  location: 'Location',
  status: 'Scholar status',
};

function getResourceErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('Access restricted to staff members only')) {
    return 'Your active session is not a staff account. Sign out and sign back in to the staff portal. When testing locally, use a separate browser or profile for the scholar portal.';
  }

  return message || 'Please try again.';
}

function getFilterValues(filterType: string, options: ResourceFilterOptions) {
  switch (filterType) {
    case 'program':
      return options.programs;
    case 'year':
      return options.years;
    case 'university':
      return options.universities;
    case 'location':
      return options.locations;
    case 'status':
      return options.statuses.length > 0
        ? options.statuses
        : ['active', 'inactive', 'on_hold', 'archived'];
    default:
      return [];
  }
}

const emptyResourceFormData: ResourceFormData = {
  title: '',
  description: '',
  sourceType: 'url',
  url: '',
  type: 'Guide',
  category: 'LDF',
  status: 'draft',
};

function getResourceFormData(resource?: Resource): ResourceFormData {
  if (!resource) return emptyResourceFormData;

  return {
    title: resource.title,
    description: resource.description,
    sourceType: resource.sourceType,
    url: resource.url ?? '',
    type: resource.type,
    category: resource.category,
    status: resource.status,
  };
}

function getResourceFormFilters(resource?: Resource): ResourceFilterDraft[] {
  if (!resource) return [];

  return resource.filters.map((filter) => ({
    filterType: filter.type,
    filterValue: filter.value,
  }));
}

function ResourceDialog({
  resource,
  onSaved,
  filterOptions,
  filterOptionsError,
  filterOptionsLoading,
  open: controlledOpen,
  onOpenChange,
}: {
  resource?: Resource;
  onSaved: (resource: Resource) => void;
  filterOptions: ResourceFilterOptions;
  filterOptionsError: string | null;
  filterOptionsLoading: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = Boolean(resource);
  const [internalOpen, setInternalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('program');
  const [filterValue, setFilterValue] = useState('');
  const [filters, setFilters] = useState<ResourceFilterDraft[]>(() =>
    getResourceFormFilters(resource)
  );
  const [formData, setFormData] = useState<ResourceFormData>(() => getResourceFormData(resource));
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    pendingFileKey: string;
    fileName: string;
    fileMimeType: string;
    fileSizeBytes: number;
  } | null>(null);
  const resourceRef = useRef(resource);
  resourceRef.current = resource;
  const resourceId = resource?.id;

  const availableFilterValues = getFilterValues(filterType, filterOptions);
  const hasFilterValues = availableFilterValues.length > 0;
  const canEditFilters = !filterOptionsLoading && !filterOptionsError;
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Only re-initialize when the dialog opens (or switches resource), not when
  // react-query refreshes the resource object while editing.
  useEffect(() => {
    if (!open) return;
    if (resourceRef.current?.id !== resourceId) return;

    setFormData(getResourceFormData(resourceRef.current));
    setFilters(getResourceFormFilters(resourceRef.current));
    setFilterType('program');
    setFilterValue('');
    setPendingUpload(null);
  }, [open, resourceId]);

  const reset = () => {
    setFormData(getResourceFormData(resource));
    setFilters(getResourceFormFilters(resource));
    setFilterType('program');
    setFilterValue('');
    setPendingUpload(null);
  };

  const handleFileChosen = async (file: File) => {
    setUploading(true);
    try {
      const { uploadUrl, fileKey } = await createResourceUploadUrl({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error('Could not upload the document. Please try again.');
      }
      setPendingUpload({
        pendingFileKey: fileKey,
        fileName: file.name,
        fileMimeType: file.type,
        fileSizeBytes: file.size,
      });
    } catch (error) {
      setPendingUpload(null);
      toast({
        title: 'Could not upload document',
        description: getResourceErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const addFilter = () => {
    const nextFilterValue = filterValue.trim();
    if (!nextFilterValue) return;
    if (
      filters.some(
        (filter) => filter.filterType === filterType && filter.filterValue === nextFilterValue
      )
    ) {
      return;
    }
    setFilters((current) => [...current, { filterType, filterValue: nextFilterValue }]);
    setFilterValue('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isEditing && formData.sourceType === 'file' && !pendingUpload) {
      toast({
        title: 'Upload a document first',
        description: 'Choose a file before saving this resource.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);

    try {
      const savedResource =
        resource === undefined
          ? await createResource(
              formData.sourceType === 'file'
                ? {
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    category: formData.category,
                    status: formData.status,
                    filters,
                    sourceType: 'file',
                    pendingFileKey: pendingUpload?.pendingFileKey,
                    fileName: pendingUpload?.fileName,
                    fileMimeType: pendingUpload?.fileMimeType,
                    fileSizeBytes: pendingUpload?.fileSizeBytes,
                  }
                : {
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    category: formData.category,
                    status: formData.status,
                    filters,
                    sourceType: 'url',
                    url: formData.url,
                  }
            )
          : await updateResource(
              resource.id,
              resource.sourceType === 'file'
                ? {
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    category: formData.category,
                    status: formData.status,
                    filters,
                  }
                : {
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    category: formData.category,
                    status: formData.status,
                    filters,
                    url: formData.url,
                  }
            );
      toast({ title: isEditing ? 'Resource updated' : 'Resource created' });
      reset();
      setOpen(false);
      onSaved(savedResource);
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update resource' : 'Could not create resource',
        description: getResourceErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto">
            <Library className="h-4 w-4" />
            Add resource
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit resource' : 'Add resource'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this resource and who should see it.'
              : 'Add a URL or uploaded document and choose which scholars should see it.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resource-title">Title</Label>
              <Input
                id="resource-title"
                value={formData.title}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resource-description">Description</Label>
              <Textarea
                id="resource-description"
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, description: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Source</Label>
              {isEditing ? (
                <p className="text-sm text-muted-foreground">
                  {formData.sourceType === 'file' ? 'Uploaded document' : 'External URL'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.sourceType === 'url' ? 'default' : 'outline'}
                    onClick={() => setFormData((current) => ({ ...current, sourceType: 'url' }))}
                  >
                    External URL
                  </Button>
                  <Button
                    type="button"
                    variant={formData.sourceType === 'file' ? 'default' : 'outline'}
                    onClick={() => setFormData((current) => ({ ...current, sourceType: 'file' }))}
                  >
                    Upload document
                  </Button>
                </div>
              )}
            </div>
            {formData.sourceType === 'file' ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="resource-file">Document</Label>
                {isEditing ? (
                  <p className="text-sm text-muted-foreground">{resource?.fileName}</p>
                ) : (
                  <>
                    <Input
                      id="resource-file"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleFileChosen(file);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {uploading
                        ? 'Uploading…'
                        : pendingUpload
                          ? pendingUpload.fileName
                          : 'PDF, Word, Excel, or PowerPoint. Max 10MB.'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="resource-url">URL</Label>
                <Input
                  id="resource-url"
                  type="url"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, url: event.target.value }))
                  }
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((current) => ({ ...current, type: value as ResourceType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((current) => ({ ...current, category: value as ResourceCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resourceCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((current) => ({ ...current, status: value as ResourceStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <Label>Audience filters</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty to show this resource to all scholars.
              </p>
            </div>
            {filterOptionsError && (
              <p className="text-xs text-destructive">
                Could not load audience options: {filterOptionsError}
              </p>
            )}
            {filterOptionsLoading && (
              <p className="text-xs text-muted-foreground">Loading audience options…</p>
            )}
            <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
              <Select
                value={filterType}
                disabled={!canEditFilters}
                onValueChange={(value) => {
                  setFilterType(value);
                  setFilterValue('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(filterLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterValue || undefined}
                disabled={!canEditFilters || !hasFilterValues}
                onValueChange={setFilterValue}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !canEditFilters
                        ? 'Unavailable'
                        : hasFilterValues
                          ? 'Choose value'
                          : 'No values available'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="z-[100] max-h-64">
                  {availableFilterValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={!canEditFilters || !filterValue.trim()}
                onClick={addFilter}
              >
                Add
              </Button>
            </div>
            {filters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={`${filter.filterType}-${filter.filterValue}`}
                    type="button"
                    className="rounded-full border px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setFilters((current) =>
                        current.filter(
                          (item) =>
                            item.filterType !== filter.filterType ||
                            item.filterValue !== filter.filterValue
                        )
                      )
                    }
                  >
                    {filterLabels[filter.filterType]}: {filter.filterValue}
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || uploading}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Update resource' : 'Save resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteResourceDialog({
  resource,
  onDeleted,
  disabled,
  open: controlledOpen,
  onOpenChange,
}: {
  resource: Resource;
  onDeleted: (resourceId: string) => void;
  disabled: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteResource(resource.id);
      toast({ title: 'Resource deleted', duration: 2500 });
      setOpen(false);
      onDeleted(resource.id);
    } catch (error) {
      toast({
        title: 'Could not delete resource',
        description: getResourceErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={disabled}
            aria-label={`Delete ${resource.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete resource?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove "{resource.title}" from the staff resource library and from scholar
            Resources. This action cannot be undone from the app.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ResourcesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: resources = [], isLoading, error, refetch } = useResources();
  const filterOptionsQuery = useResourceFilterOptions();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingResourceSnapshot, setEditingResourceSnapshot] = useState<Resource | null>(null);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);

  const filterOptions = filterOptionsQuery.data ?? emptyFilterOptions;
  const filterOptionsError = filterOptionsQuery.error
    ? getResourceErrorMessage(filterOptionsQuery.error)
    : null;
  const editingResource =
    resources.find((resource) => resource.id === editingResourceId) ?? editingResourceSnapshot;
  const deletingResource = resources.find((resource) => resource.id === deletingResourceId);

  useEffect(() => {
    if (!filterOptionsQuery.error) return;
    toast({
      title: 'Could not load audience filter options',
      description: getResourceErrorMessage(filterOptionsQuery.error),
      variant: 'destructive',
    });
  }, [filterOptionsQuery.error, toast]);

  const filteredResources = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesSearch =
        !normalizedSearch ||
        resource.title.toLowerCase().includes(normalizedSearch) ||
        resource.description.toLowerCase().includes(normalizedSearch);
      const matchesType = typeFilter === 'all' || resource.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || resource.status === statusFilter;

      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });
  }, [resources, search, typeFilter, categoryFilter, statusFilter]);

  const toggleStatus = async (resource: Resource) => {
    setBusyId(resource.id);
    try {
      await updateResource(resource.id, {
        status: resource.status === 'live' ? 'draft' : 'live',
      });
      toast({
        title: resource.status === 'live' ? 'Resource moved to draft' : 'Resource is live',
        duration: 2500,
      });
      await refetch();
    } catch (updateError) {
      toast({
        title: 'Could not update resource',
        description: getResourceErrorMessage(updateError),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = (savedResource: Resource) => {
    queryClient.setQueryData<Resource[]>(queryKeys.resources, (current = []) => {
      const resourceExists = current.some((resource) => resource.id === savedResource.id);
      return resourceExists
        ? current.map((resource) => (resource.id === savedResource.id ? savedResource : resource))
        : [...current, savedResource];
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.resources });
  };

  const handleDeleted = (resourceId: string) => {
    queryClient.setQueryData<Resource[]>(queryKeys.resources, (current = []) =>
      current.filter((resource) => resource.id !== resourceId)
    );
    setDeletingResourceId(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.resources });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
              <Library className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Resource library</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Create URL or document resources, publish them, and assign them to scholar groups.
              </p>
            </div>
          </div>
          <ResourceDialog
            filterOptions={filterOptions}
            filterOptionsError={filterOptionsError}
            filterOptionsLoading={filterOptionsQuery.isLoading}
            onSaved={handleSaved}
          />
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_170px_170px_150px]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search resources"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as ResourceType | 'all')}
          >
            <SelectTrigger aria-label="Resource type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'all' ? 'All types' : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as ResourceCategory | 'all')}
          >
            <SelectTrigger aria-label="Resource category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? 'All categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ResourceStatus | 'all')}
          >
            <SelectTrigger aria-label="Resource status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === 'all' ? 'All statuses' : status === 'live' ? 'Live' : 'Draft'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y border-t">
          {isLoading ? (
            <div className="flex items-center justify-center px-4 py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading resources...
            </div>
          ) : error && resources.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-destructive">
              Could not load resources.
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No resources found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try changing the search or filters.
              </p>
            </div>
          ) : (
            filteredResources.map((resource) => {
              const Icon = resourceIcons[resource.type];
              const audience =
                resource.filters.length === 0
                  ? 'All scholars'
                  : resource.filters
                      .map(
                        (filter) => `${filterLabels[filter.type] || filter.type}: ${filter.value}`
                      )
                      .join(', ');

              return (
                <div
                  key={resource.id}
                  className="grid gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5 lg:grid-cols-[minmax(0,1fr)_220px_minmax(150px,220px)_260px]"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{resource.title}</h4>
                        {resource.sourceType === 'file' ? (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Download ${resource.title}`}
                            onClick={async () => {
                              try {
                                const { downloadUrl } = await getResourceDownloadUrl(resource.id);
                                window.open(downloadUrl, '_blank', 'noopener,noreferrer');
                              } catch (downloadError) {
                                toast({
                                  title: 'Could not download resource',
                                  description: getResourceErrorMessage(downloadError),
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <a
                            href={resource.url ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Open ${resource.title}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {resource.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {resource.type}
                    </Badge>
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {resource.category}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center">
                    <p className="truncate text-sm text-muted-foreground" title={audience}>
                      {audience}
                    </p>
                  </div>
                  <div className="flex items-center justify-start gap-3 lg:justify-end">
                    <div className="flex min-w-28 items-center justify-end gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={
                            resource.status === 'live'
                              ? 'h-1.5 w-1.5 rounded-full bg-emerald-500'
                              : 'h-1.5 w-1.5 rounded-full bg-amber-500'
                          }
                        />
                        <span className="text-sm font-medium text-foreground">
                          {resource.status === 'live' ? 'Live' : 'Draft'}
                        </span>
                      </div>
                      {busyId === resource.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={resource.status === 'live'}
                          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-amber-500"
                          aria-label={
                            resource.status === 'live'
                              ? `Unpublish ${resource.title}`
                              : `Publish ${resource.title}`
                          }
                          onCheckedChange={() => toggleStatus(resource)}
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        setEditingResourceId(resource.id);
                        setEditingResourceSnapshot(resource);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={busyId === resource.id}
                      aria-label={`Delete ${resource.title}`}
                      onClick={() => setDeletingResourceId(resource.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {editingResourceId !== null && editingResource && (
        <ResourceDialog
          resource={editingResource}
          filterOptions={filterOptions}
          filterOptionsError={filterOptionsError}
          filterOptionsLoading={filterOptionsQuery.isLoading}
          onSaved={handleSaved}
          open={editingResourceId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingResourceId(null);
              setEditingResourceSnapshot(null);
            }
          }}
        />
      )}
      {deletingResource && (
        <DeleteResourceDialog
          resource={deletingResource}
          disabled={busyId === deletingResource.id}
          onDeleted={handleDeleted}
          open={deletingResourceId !== null}
          onOpenChange={(open) => {
            if (!open) setDeletingResourceId(null);
          }}
        />
      )}
    </div>
  );
}
