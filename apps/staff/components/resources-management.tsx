'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
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
import { useEffect, useMemo, useState } from 'react';
import {
  createResource,
  deleteResource,
  getResourceFilterOptions,
  type Resource,
  type ResourceCategory,
  type ResourceFilterOptions,
  type ResourceStatus,
  type ResourceType,
  updateResource,
} from '../lib/api-client';
import { queryKeys, useResources } from '../lib/hooks/use-queries';
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
    url: resource.url,
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
}: {
  resource?: Resource;
  onSaved: (resource: Resource) => void;
  filterOptions: ResourceFilterOptions;
}) {
  const { toast } = useToast();
  const isEditing = Boolean(resource);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('program');
  const [filterValue, setFilterValue] = useState('');
  const [filters, setFilters] = useState<ResourceFilterDraft[]>(() =>
    getResourceFormFilters(resource)
  );
  const [formData, setFormData] = useState<ResourceFormData>(() => getResourceFormData(resource));

  const availableFilterValues = getFilterValues(filterType, filterOptions);
  const hasFilterValues = availableFilterValues.length > 0;

  useEffect(() => {
    if (!open) return;

    setFormData(getResourceFormData(resource));
    setFilters(getResourceFormFilters(resource));
    setFilterType('program');
    setFilterValue('');
  }, [open, resource]);

  const reset = () => {
    setFormData(getResourceFormData(resource));
    setFilters(getResourceFormFilters(resource));
    setFilterType('program');
    setFilterValue('');
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
    setSubmitting(true);

    try {
      const savedResource =
        resource === undefined
          ? await createResource({
              ...formData,
              filters,
            })
          : await updateResource(resource.id, {
              ...formData,
              filters,
            });
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
      <DialogTrigger asChild>
        {isEditing ? (
          <Button type="button" variant="outline" size="sm" className="h-9">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        ) : (
          <Button className="w-full sm:w-auto">
            <Library className="h-4 w-4" />
            Add resource
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit resource' : 'Add resource'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this URL-based resource and who should see it.'
              : 'Add a URL-based resource and choose which scholars should see it.'}
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
            <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
              <Select
                value={filterType}
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
              {hasFilterValues ? (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose value" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] max-h-64">
                    {availableFilterValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={filterValue}
                  placeholder="Type value"
                  onChange={(event) => setFilterValue(event.target.value)}
                />
              )}
              <Button
                type="button"
                variant="outline"
                disabled={!filterValue.trim()}
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
            <Button type="submit" disabled={submitting}>
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
}: {
  resource: Resource;
  onDeleted: (resourceId: string) => void;
  disabled: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | 'all'>('all');
  const [filterOptions, setFilterOptions] = useState<ResourceFilterOptions>(emptyFilterOptions);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getResourceFilterOptions()
      .then(setFilterOptions)
      .catch((loadError) => {
        console.error('Failed to load resource filter options:', loadError);
      });
  }, []);

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

  const handleCreated = (resource: Resource) => {
    queryClient.setQueryData<Resource[]>(queryKeys.resources, (current = []) =>
      [...current, resource].sort((first, second) => first.title.localeCompare(second.title))
    );
    queryClient.invalidateQueries({ queryKey: queryKeys.resources });
  };

  const handleSaved = (resource: Resource) => {
    queryClient.setQueryData<Resource[]>(queryKeys.resources, (current = []) => {
      const exists = current.some((item) => item.id === resource.id);
      const nextResources = exists
        ? current.map((item) => (item.id === resource.id ? resource : item))
        : [...current, resource];

      return nextResources.sort((first, second) => first.title.localeCompare(second.title));
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.resources });
  };

  const handleDeleted = (resourceId: string) => {
    queryClient.setQueryData<Resource[]>(queryKeys.resources, (current = []) =>
      current.filter((resource) => resource.id !== resourceId)
    );
    queryClient.invalidateQueries({ queryKey: queryKeys.resources });
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
                Create URL-based resources, publish them, and assign them to scholar groups.
              </p>
            </div>
          </div>
          <ResourceDialog filterOptions={filterOptions} onSaved={handleCreated} />
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
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Open ${resource.title}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
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
                    <ResourceDialog
                      resource={resource}
                      filterOptions={filterOptions}
                      onSaved={handleSaved}
                    />
                    <DeleteResourceDialog
                      resource={resource}
                      disabled={busyId === resource.id}
                      onDeleted={handleDeleted}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
