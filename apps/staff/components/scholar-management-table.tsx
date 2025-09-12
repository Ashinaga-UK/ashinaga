'use client';

import { AlertCircle, Eye, Loader2, MoreHorizontal, Plus, Search, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  type GetScholarsParams,
  getFilterOptions,
  getScholars,
  type Scholar,
  type ScholarFilterOptions,
} from '../lib/api-client';
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
  const [_totalPages, setTotalPages] = useState(1);

  const [programFilter, setProgramFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [statusFilter, _setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on_hold'>(
    'all'
  );

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
      setTotalPages(response.pagination.totalPages);
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
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {selectedScholars.length > 0 && (
            <BulkTaskAssignment
              selectedScholarIds={selectedScholars}
              trigger={
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Task to Selected ({selectedScholars.length})
                </Button>
              }
            />
          )}
          {/* TODO: Enable "Assign to All Filtered" button later
          <BulkTaskAssignment
            filteredScholars={scholars}
            trigger={
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Assign to All Filtered ({scholars.length})
              </Button>
            }
          />
          */}
          <Button
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
            onClick={onOnboardScholar}
          >
            <Plus className="h-4 w-4 mr-2" />
            Onboard New Students
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[140px]">
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
          <SelectTrigger className="w-[200px]">
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

        {(programFilter !== 'all' || yearFilter !== 'all' || universityFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setProgramFilter('all');
              setYearFilter('all');
              setUniversityFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Students Table */}
      <div className="border border-ashinaga-teal-100 rounded-lg">
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
                  <div className="text-sm text-gray-500">Loading scholars...</div>
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
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No scholars found
                </TableCell>
              </TableRow>
            ) : (
              scholars.map((scholar) => (
                <TableRow
                  key={scholar.id}
                  className="hover:bg-ashinaga-teal-50 cursor-pointer"
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
                        <div className="text-sm text-gray-500">{scholar.email}</div>
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
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-ashinaga-teal-600 h-2 rounded-full"
                          style={{
                            width: `${scholar.goals.total > 0 ? (scholar.goals.completed / scholar.goals.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {scholar.goals.completed}/{scholar.goals.total}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(scholar.status)}>{scholar.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
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
    </div>
  );
}
