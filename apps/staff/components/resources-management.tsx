'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Library,
  Loader2,
  Search,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  createResource,
  getResourceFilterOptions,
  type Resource,
  type ResourceCategory,
  type ResourceFilterOptions,
  type ResourceStatus,
  type ResourceType,
  updateResource,
} from '../lib/api-client';
import { queryKeys, useResources } from '../lib/hooks/use-queries';
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
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

type ResourceFilterDraft = {
  filterType: string;
  filterValue: string;
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

function ResourceDialog({
  onCreated,
  filterOptions,
}: {
  onCreated: (resource: Resource) => void;
  filterOptions: ResourceFilterOptions;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('program');
  const [filterValue, setFilterValue] = useState('');
  const [filters, setFilters] = useState<ResourceFilterDraft[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    type: 'Guide' as ResourceType,
    category: 'LDF' as ResourceCategory,
    status: 'draft' as ResourceStatus,
  });

  const availableFilterValues = getFilterValues(filterType, filterOptions);
  const hasFilterValues = availableFilterValues.length > 0;

  const reset = () => {
    setFormData({
      title: '',
      description: '',
      url: '',
      type: 'Guide',
      category: 'LDF',
      status: 'draft',
    });
    setFilters([]);
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
      const resource = await createResource({
        ...formData,
        filters,
      });
      toast({ title: 'Resource created' });
      reset();
      setOpen(false);
      onCreated(resource);
    } catch (error) {
      toast({
        title: 'Could not create resource',
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
        <Button className="w-full sm:w-auto">
          <Library className="h-4 w-4" />
          Add resource
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add resource</DialogTitle>
          <DialogDescription>
            Add a URL-based resource and choose which scholars should see it.
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
              Save resource
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
      toast({ title: resource.status === 'live' ? 'Resource moved to draft' : 'Resource is live' });
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
          <ResourceDialog filterOptions={filterOptions} onCreated={handleCreated} />
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
                  className="grid gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5 xl:grid-cols-[minmax(0,1fr)_170px_170px_130px]"
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{resource.type}</Badge>
                    <Badge variant="muted">{resource.category}</Badge>
                  </div>
                  <div className="min-w-0 text-sm text-muted-foreground">
                    <p className="truncate" title={audience}>
                      {audience}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={resource.status === 'live' ? 'success' : 'warning'}>
                      {resource.status === 'live' ? 'Live' : 'Draft'}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busyId === resource.id}
                      onClick={() => toggleStatus(resource)}
                    >
                      {busyId === resource.id
                        ? 'Saving'
                        : resource.status === 'live'
                          ? 'Unpublish'
                          : 'Publish'}
                    </Button>
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
