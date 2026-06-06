'use client';

import {
  AlertCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  downloadAllScholarsCSV,
  type GetScholarsParams,
  getFilterOptions,
  getScholars,
  type PaginationMeta,
  type Scholar,
  type ScholarFilterOptions,
} from '../lib/api-client';
import { useArchiveScholar, useDeleteScholar } from '../lib/hooks/use-queries';
import { BulkTaskAssignment } from './bulk-task-assignment';
import { TaskAssignment } from './task-assignment';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface StudentManagementTableProps {
  onViewProfile: (studentId: string) => void;
  onOnboardScholar: () => void;
}

export function ScholarManagementTable({
  onViewProfile,
  onOnboardScholar,
}: StudentManagementTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [selectedScholars, setSelectedScholars] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const [programFilter, setProgramFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'on_hold' | 'archived'
  >('all');
  const [exportingCsv, setExportingCsv] = useState(false);
  const archiveScholar = useArchiveScholar();
  const deleteScholar = useDeleteScholar();

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState<ScholarFilterOptions>({
    programs: [],
    years: [],
    universities: [],
  });

  // Debounce search to avoid too many API calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const scholarListFilterKey = `${programFilter}|${yearFilter}|${universityFilter}|${statusFilter}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination when program/year/university/status filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [scholarListFilterKey]);

  const fetchScholars = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: GetScholarsParams = {
        page: currentPage,
        limit: 20,
        search: debouncedSearchTerm || undefined,
        program: programFilter !== 'all' ? programFilter : undefined,
        year: yearFilter !== 'all' ? yearFilter : undefined,
        university: universityFilter !== 'all' ? universityFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const response = await getScholars(params);
      setScholars(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scholars');
      console.error('Error fetching scholars:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, programFilter, yearFilter, universityFilter, statusFilter]);

  useEffect(() => {
    fetchScholars();
  }, [fetchScholars]);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions(options);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchFilters();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'inactive':
        return 'bg-muted text-foreground';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-muted text-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      await downloadAllScholarsCSV();
    } catch (e) {
      console.error(e);
      alert('Failed to download CSV. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleArchive = async (scholarId: string, scholarName: string) => {
    if (!confirm(`Archive "${scholarName}"? They will be hidden from the default list.`)) return;
    try {
      await archiveScholar.mutateAsync(scholarId);
      await fetchScholars();
    } catch (e) {
      console.error(e);
      alert('Failed to archive. Please try again.');
    }
  };

  const handleDelete = async (scholarId: string, scholarName: string) => {
    if (
      !confirm(
        `Permanently delete "${scholarName}"? This cannot be undone. All goals, tasks, and documents will be removed.`
      )
    )
      return;
    try {
      await deleteScholar.mutateAsync(scholarId);
      await fetchScholars();
    } catch (e) {
      console.error(e);
      alert('Failed to delete. Please try again.');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedScholars(scholars.map((s) => s.id));
    } else {
      setSelectedScholars([]);
    }
  };

  const handleSelectScholar = (scholarId: string, checked: boolean) => {
    if (checked) {
      setSelectedScholars([...selectedScholars, scholarId]);
    } else {
      setSelectedScholars(selectedScholars.filter((id) => id !== scholarId));
    }
  };

  const isAllSelected = scholars.length > 0 && selectedScholars.length === scholars.length;
  const isIndeterminate = selectedScholars.length > 0 && selectedScholars.length < scholars.length;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {selectedScholars.length > 0 && (
            <BulkTaskAssignment
              selectedScholarIds={selectedScholars}
              trigger={
                <Button variant="outline" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Task to Selected ({selectedScholars.length})
                </Button>
              }
            />
          )}
          {scholars.length > 0 && (
            <BulkTaskAssignment
              filteredScholars={scholars}
              trigger={
                <Button variant="outline" className="w-full sm:w-auto">
                  <Users className="h-4 w-4 mr-2" />
                  Assign to All Filtered ({scholars.length})
                </Button>
              }
            />
          )}
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleExportCsv}
            disabled={exportingCsv}
          >
            {exportingCsv ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export all (CSV)
          </Button>
          <Button
            className="w-full bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700 sm:w-auto"
            onClick={onOnboardScholar}
          >
            <Plus className="h-4 w-4 mr-2" />
            Onboard New Students
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_hold">On hold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {filterOptions.programs.map((program) => (
              <SelectItem key={program} value={program}>
                {program}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {filterOptions.years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={universityFilter} onValueChange={setUniversityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Universities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            {filterOptions.universities.map((university) => (
              <SelectItem key={university} value={university}>
                {university}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(programFilter !== 'all' ||
          yearFilter !== 'all' ||
          universityFilter !== 'all' ||
          statusFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            className="sm:col-span-2 lg:col-span-4 lg:w-fit"
            onClick={() => {
              setProgramFilter('all');
              setYearFilter('all');
              setUniversityFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
            <div className="text-sm text-muted-foreground">Loading scholars...</div>
          </div>
        ) : error ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : scholars.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No scholars found
          </div>
        ) : (
          scholars.map((scholar) => (
            <article key={scholar.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div>
                  <Checkbox
                    checked={selectedScholars.includes(scholar.id)}
                    onCheckedChange={(checked) =>
                      handleSelectScholar(scholar.id, checked as boolean)
                    }
                    aria-label={`Select ${scholar.name}`}
                  />
                </div>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() => onViewProfile(scholar.id)}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={scholar.image || '/placeholder.svg'} />
                    <AvatarFallback>
                      {scholar.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{scholar.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {scholar.email}
                    </span>
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label={`Actions for ${scholar.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewProfile(scholar.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    {scholar.status !== 'archived' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          handleArchive(scholar.id, scholar.name);
                        }}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(scholar.id, scholar.name);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Program
                  </dt>
                  <dd className="truncate font-medium">{scholar.program}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Year</dt>
                  <dd>
                    <Badge variant="outline">{scholar.year}</Badge>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    University
                  </dt>
                  <dd className="truncate font-medium">{scholar.university}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt>
                  <dd>
                    <Badge className={getStatusColor(scholar.status)}>{scholar.status}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Goals</dt>
                  <dd className="font-medium">
                    {scholar.goals.completed}/{scholar.goals.total}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Last Activity
                  </dt>
                  <dd className="font-medium">{formatDate(scholar.lastActivity)}</dd>
                </div>
              </dl>

              <div className="mt-4">
                <TaskAssignment
                  trigger={
                    <Button size="sm" variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Assign Task
                    </Button>
                  }
                  preselectedScholarId={scholar.id}
                />
              </div>
            </article>
          ))
        )}
      </div>

      {/* Students Table */}
      <div className="hidden rounded-lg border border-border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  ref={(el) => {
                    if (el && 'indeterminate' in el) {
                      (el as HTMLInputElement).indeterminate = isIndeterminate;
                    }
                  }}
                />
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>University</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Goals Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground">Loading scholars...</div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Alert className="mx-auto max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </TableCell>
              </TableRow>
            ) : scholars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No scholars found
                </TableCell>
              </TableRow>
            ) : (
              scholars.map((scholar) => (
                <TableRow
                  key={scholar.id}
                  className="hover:bg-muted cursor-pointer"
                  onClick={() => onViewProfile(scholar.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedScholars.includes(scholar.id)}
                      onCheckedChange={(checked) =>
                        handleSelectScholar(scholar.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={scholar.image || '/placeholder.svg'} />
                        <AvatarFallback>
                          {scholar.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{scholar.name}</div>
                        <div className="text-sm text-muted-foreground">{scholar.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{scholar.program}</TableCell>
                  <TableCell>{scholar.university}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{scholar.year}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div
                          className="bg-ashinaga-teal-600 h-2 rounded-full"
                          style={{
                            width: `${scholar.goals.total > 0 ? (scholar.goals.completed / scholar.goals.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {scholar.goals.completed}/{scholar.goals.total}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(scholar.status)}>{scholar.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(scholar.lastActivity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* biome-ignore lint/a11y/useSemanticElements: div with role="group" is appropriate for interactive action buttons container */}
                    <div
                      className="flex items-center gap-2"
                      role="group"
                      aria-label="Scholar actions"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                        }
                      }}
                    >
                      <TaskAssignment
                        trigger={
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-1" />
                            Task
                          </Button>
                        }
                        preselectedScholarId={scholar.id}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewProfile(scholar.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          {scholar.status !== 'archived' && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                handleArchive(scholar.id, scholar.name);
                              }}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(scholar.id, scholar.name);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalItems > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <p>
            Showing{' '}
            <span className="font-medium text-foreground">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>
            –
            <span className="font-medium text-foreground">
              {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
            </span>{' '}
            of <span className="font-medium text-foreground">{pagination.totalItems}</span> scholars
            {pagination.totalPages > 1 && (
              <>
                {' '}
                (page {pagination.page} of {pagination.totalPages})
              </>
            )}
          </p>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
