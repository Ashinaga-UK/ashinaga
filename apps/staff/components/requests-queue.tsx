'use client';

import { AlertCircle, MessageSquare } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bulkUpdateRequestStatus,
  getFilterOptions,
  getRequests,
  getScholars,
  type PaginationMeta,
  type Request,
} from '../lib/api-client';
import { useSession } from '../lib/auth-client';
import { cn } from '../lib/utils';
import { RequestManagement } from './request-management';
import { StaffOtherRequestDialog } from './staff-other-request-dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

const REQUEST_TYPES = [
  'extenuating_circumstances',
  'summer_funding_request',
  'summer_funding_report',
  'requirement_submission',
  'others',
] as const;

const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'reviewed', 'commented'] as const;

const TYPE_LABELS: Record<(typeof REQUEST_TYPES)[number], string> = {
  extenuating_circumstances: 'Extenuating Circumstances',
  summer_funding_request: 'Summer Funding Request',
  summer_funding_report: 'Summer Funding Report',
  requirement_submission: 'Requirement Submission',
  others: 'Others',
};

const SAVED_VIEWS_VERSION = 1;

type RequestType = (typeof REQUEST_TYPES)[number];
type RequestStatus = (typeof REQUEST_STATUSES)[number];
type SortBy = 'submittedDate' | 'scholarName' | 'type';

interface SavedView {
  name: string;
  query: Record<string, string>;
}

interface RequestsQueueProps {
  onReviewed: () => void;
}

function isRequestType(value: string | null): value is RequestType {
  return !!value && (REQUEST_TYPES as readonly string[]).includes(value);
}

function isRequestStatus(value: string | null): value is RequestStatus {
  return !!value && (REQUEST_STATUSES as readonly string[]).includes(value);
}

function isSortBy(value: string | null): value is SortBy {
  return value === 'submittedDate' || value === 'scholarName' || value === 'type';
}

function savedViewsKey(userId: string) {
  return `ashinaga.requests.savedViews.v${SAVED_VIEWS_VERSION}.${userId}`;
}

function cohortKey(userId: string) {
  return `ashinaga.requests.cohort.v${SAVED_VIEWS_VERSION}.${userId}`;
}

function readCohort(userId: string): { program: string; year: string } | null {
  try {
    const raw = localStorage.getItem(cohortKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; program?: string; year?: string };
    if (parsed.version !== SAVED_VIEWS_VERSION || !parsed.program || !parsed.year) return null;
    return { program: parsed.program, year: parsed.year };
  } catch {
    return null;
  }
}

function readSavedViews(userId: string): SavedView[] {
  try {
    const raw = localStorage.getItem(savedViewsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; views?: SavedView[] };
    if (parsed.version !== SAVED_VIEWS_VERSION || !Array.isArray(parsed.views)) return [];
    return parsed.views.filter((view) => view && typeof view.name === 'string' && view.query);
  } catch {
    return [];
  }
}

export function RequestsQueue({ onReviewed }: RequestsQueueProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const userId = session.data?.user?.id;
  const { toast } = useToast();

  const requestId = searchParams.get('requestId');
  const search = searchParams.get('search') || '';
  const scholarId = searchParams.get('scholarId') || '';
  const program = searchParams.get('program') || '';
  const year = searchParams.get('year') || '';
  const submittedFrom = searchParams.get('submittedFrom') || '';
  const submittedTo = searchParams.get('submittedTo') || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const sortBy = isSortBy(searchParams.get('sortBy')) ? searchParams.get('sortBy') : '';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const type = requestId
    ? ''
    : isRequestType(searchParams.get('type'))
      ? searchParams.get('type')!
      : '';
  const status = requestId
    ? ''
    : isRequestStatus(searchParams.get('status'))
      ? searchParams.get('status')!
      : '';

  const [searchDraft, setSearchDraft] = useState(search);
  const [requests, setRequests] = useState<Request[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [scholarQuery, setScholarQuery] = useState('');
  const [scholarOptions, setScholarOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [scholarOpen, setScholarOpen] = useState(false);
  const [selectedScholarName, setSelectedScholarName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [viewName, setViewName] = useState('');
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [rememberedCohort, setRememberedCohort] = useState<{
    program: string;
    year: string;
  } | null>(null);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    if (!userId) return;
    setSavedViews(readSavedViews(userId));
    setRememberedCohort(readCohort(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId || !program || !year) return;
    const next = { version: SAVED_VIEWS_VERSION, program, year };
    localStorage.setItem(cohortKey(userId), JSON.stringify(next));
    setRememberedCohort({ program, year });
  }, [program, userId, year]);

  const replaceQuery = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', 'requests');
      if (resetPage) next.delete('page');
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      if (updates.requestId === undefined && requestId && resetPage) {
        next.delete('requestId');
      }
      router.replace(`?${next.toString()}`);
    },
    [requestId, router, searchParams]
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchDraft.trim() === search) return;
      replaceQuery({ search: searchDraft.trim() || null });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, searchDraft, replaceQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRequests({
        page,
        search: search || undefined,
        scholarId: scholarId || undefined,
        program: program || undefined,
        year: year || undefined,
        submittedFrom: submittedFrom || undefined,
        submittedTo: submittedTo || undefined,
        type: isRequestType(type) ? type : undefined,
        status: isRequestStatus(status) ? status : undefined,
        sortBy: isSortBy(sortBy) ? sortBy : undefined,
        sortOrder: isSortBy(sortBy) ? sortOrder : undefined,
      });
      let nextRequests = response.data;
      if (requestId && !nextRequests.some((request) => request.id === requestId)) {
        const targeted = await getRequests({ requestId, limit: 1 });
        const match = targeted.data[0];
        if (match) nextRequests = [match, ...nextRequests];
      }
      setRequests(nextRequests);
      setPagination(response.pagination);
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    program,
    requestId,
    scholarId,
    search,
    sortBy,
    sortOrder,
    status,
    submittedFrom,
    submittedTo,
    type,
    year,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!requestId || loading) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`request-${requestId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, requestId]);

  useEffect(() => {
    void getFilterOptions()
      .then((options) => {
        setPrograms(options.programs);
        setYears(options.years);
      })
      .catch(() => {
        setPrograms([]);
        setYears([]);
      });
  }, []);

  useEffect(() => {
    const term = scholarQuery.trim();
    if (!scholarOpen || term.length < 2) {
      setScholarOptions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void getScholars({ search: term, limit: 8 }).then((response) => {
        setScholarOptions(response.data.map((scholar) => ({ id: scholar.id, name: scholar.name })));
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [scholarOpen, scholarQuery]);

  const allVisibleSelected =
    requests.length > 0 && requests.every((request) => selectedIds.includes(request.id));

  const currentQuery = useMemo(() => {
    const query: Record<string, string> = {};
    if (search) query.search = search;
    if (scholarId) query.scholarId = scholarId;
    if (program) query.program = program;
    if (year) query.year = year;
    if (submittedFrom) query.submittedFrom = submittedFrom;
    if (submittedTo) query.submittedTo = submittedTo;
    if (type) query.type = type;
    if (status) query.status = status;
    if (sortBy) {
      query.sortBy = sortBy;
      query.sortOrder = sortOrder;
    }
    return query;
  }, [
    program,
    scholarId,
    search,
    sortBy,
    sortOrder,
    status,
    submittedFrom,
    submittedTo,
    type,
    year,
  ]);

  const applyQuery = (query: Record<string, string>) => {
    const next = new URLSearchParams();
    next.set('tab', 'requests');
    for (const [key, value] of Object.entries(query)) {
      if (value) next.set(key, value);
    }
    router.replace(`?${next.toString()}`);
  };

  const saveCurrentView = () => {
    const name = viewName.trim();
    if (!name || !userId) return;
    const next = [
      ...savedViews.filter((view) => view.name !== name),
      { name, query: currentQuery },
    ];
    localStorage.setItem(
      savedViewsKey(userId),
      JSON.stringify({ version: SAVED_VIEWS_VERSION, views: next })
    );
    setSavedViews(next);
    setViewName('');
  };

  const runBulk = async (nextStatus: 'approved' | 'rejected', comment?: string) => {
    if (selectedIds.length === 0) return;
    setBulkSubmitting(true);
    try {
      await bulkUpdateRequestStatus({ ids: selectedIds, status: nextStatus, comment });
      setRejectOpen(false);
      setRejectReason('');
      await load();
      onReviewed();
    } catch (err) {
      toast({
        title: 'Bulk update failed',
        description: err instanceof Error ? err.message : 'Could not update the selected requests.',
        variant: 'destructive',
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                applyQuery({ status: 'pending', sortBy: 'submittedDate', sortOrder: 'asc' })
              }
            >
              Pending, oldest first
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!(program && year) && !(rememberedCohort && !program && !year)}
              onClick={() => {
                const cohort =
                  program && year ? { program, year } : !program && !year ? rememberedCohort : null;
                if (!cohort) return;
                applyQuery({
                  status: 'pending',
                  program: cohort.program,
                  year: cohort.year,
                  sortBy: 'submittedDate',
                  sortOrder: 'asc',
                });
              }}
            >
              {program && year
                ? 'Pending, this programme and year'
                : rememberedCohort && !program && !year
                  ? `Pending, ${rememberedCohort.program} ${rememberedCohort.year}`
                  : 'Pending, this programme and year'}
            </Button>
            {savedViews.map((view) => (
              <Button
                key={view.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyQuery(view.query)}
              >
                {view.name}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by student name"
              className="w-full sm:w-[220px]"
              aria-label="Search requests by student name"
            />
            <Popover open={scholarOpen} onOpenChange={setScholarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start sm:w-[220px]"
                >
                  <span className={cn('truncate', !scholarId && 'text-muted-foreground')}>
                    {selectedScholarName || (scholarId ? 'Selected student' : 'Filter by student')}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Student name"
                    value={scholarQuery}
                    onValueChange={setScholarQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No students</CommandEmpty>
                    {scholarId && (
                      <CommandItem
                        value="clear-student"
                        onSelect={() => {
                          setSelectedScholarName('');
                          setScholarOpen(false);
                          replaceQuery({ scholarId: null });
                        }}
                      >
                        All students
                      </CommandItem>
                    )}
                    {scholarOptions.map((scholar) => (
                      <CommandItem
                        key={scholar.id}
                        value={scholar.id}
                        onSelect={() => {
                          setSelectedScholarName(scholar.name);
                          setScholarOpen(false);
                          replaceQuery({ scholarId: scholar.id });
                        }}
                      >
                        {scholar.name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Select
              value={type || 'all'}
              onValueChange={(value) => replaceQuery({ type: value === 'all' ? null : value })}
            >
              <SelectTrigger className="w-full sm:w-[220px]" aria-label="Request type">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {REQUEST_TYPES.map((requestType) => (
                  <SelectItem key={requestType} value={requestType}>
                    {TYPE_LABELS[requestType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status || 'all'}
              onValueChange={(value) => replaceQuery({ status: value === 'all' ? null : value })}
            >
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Request status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {REQUEST_STATUSES.map((requestStatus) => (
                  <SelectItem key={requestStatus} value={requestStatus}>
                    {requestStatus.charAt(0).toUpperCase() + requestStatus.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={program || 'all'}
              onValueChange={(value) => replaceQuery({ program: value === 'all' ? null : value })}
            >
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Programme">
                <SelectValue placeholder="All programmes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programmes</SelectItem>
                {programs.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={year || 'all'}
              onValueChange={(value) => replaceQuery({ year: value === 'all' ? null : value })}
            >
              <SelectTrigger className="w-full sm:w-[160px]" aria-label="Cohort year">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              aria-label="Submitted from"
              value={submittedFrom}
              onChange={(event) => replaceQuery({ submittedFrom: event.target.value || null })}
              className="w-full sm:w-[160px]"
            />
            <Input
              type="date"
              aria-label="Submitted to"
              value={submittedTo}
              onChange={(event) => replaceQuery({ submittedTo: event.target.value || null })}
              className="w-full sm:w-[160px]"
            />
            <Select
              value={sortBy ? `${sortBy}:${sortOrder}` : 'default'}
              onValueChange={(value) => {
                if (value === 'default') {
                  replaceQuery({ sortBy: null, sortOrder: null });
                  return;
                }
                const [nextSortBy, nextOrder] = value.split(':');
                if (!nextSortBy || (nextOrder !== 'asc' && nextOrder !== 'desc')) return;
                replaceQuery({ sortBy: nextSortBy, sortOrder: nextOrder });
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]" aria-label="Sort requests">
                <SelectValue placeholder="Queue order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Queue order</SelectItem>
                <SelectItem value="submittedDate:desc">Submitted date, newest</SelectItem>
                <SelectItem value="submittedDate:asc">Submitted date, oldest</SelectItem>
                <SelectItem value="scholarName:asc">Scholar name, A–Z</SelectItem>
                <SelectItem value="scholarName:desc">Scholar name, Z–A</SelectItem>
                <SelectItem value="type:asc">Request type, A–Z</SelectItem>
                <SelectItem value="type:desc">Request type, Z–A</SelectItem>
              </SelectContent>
            </Select>
            <StaffOtherRequestDialog
              onSuccess={() => {
                void load();
                onReviewed();
              }}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder="Save current view"
              aria-label="Saved view name"
              className="w-full sm:w-[220px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={saveCurrentView}
              disabled={!viewName.trim()}
            >
              Save view
            </Button>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
              <Button
                type="button"
                size="sm"
                disabled={bulkSubmitting}
                onClick={() => void runBulk('approved')}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkSubmitting}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground">Couldn't load requests</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No requests</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Scholar submissions will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) =>
                    setSelectedIds(checked ? requests.map((request) => request.id) : [])
                  }
                  aria-label="Select all requests on this page"
                />
                Select page
              </div>
              {requests.map((request) => (
                <div
                  key={request.id}
                  id={`request-${request.id}`}
                  className={cn(
                    'flex gap-3 rounded-lg transition-colors',
                    requestId === request.id &&
                      'ring-2 ring-brand ring-offset-2 ring-offset-background'
                  )}
                >
                  <Checkbox
                    className="mt-4"
                    checked={selectedIds.includes(request.id)}
                    onCheckedChange={(checked) =>
                      setSelectedIds((current) =>
                        checked
                          ? [...current, request.id]
                          : current.filter((id) => id !== request.id)
                      )
                    }
                    aria-label={`Select request from ${request.scholarName}`}
                  />
                  <div className="min-w-0 flex-1">
                    <RequestManagement
                      request={request}
                      onStatusUpdate={() => {
                        void load();
                        onReviewed();
                      }}
                    />
                  </div>
                </div>
              ))}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasPrev}
                      onClick={() => replaceQuery({ page: String(page - 1) }, false)}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasNext}
                      onClick={() => replaceQuery({ page: String(page + 1) }, false)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject selected requests</DialogTitle>
            <DialogDescription>
              Each selected request is rejected with this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-reject-reason">Reason</Label>
            <Textarea
              id="bulk-reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Why are these requests being rejected?"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={bulkSubmitting || !rejectReason.trim()}
              onClick={() => void runBulk('rejected', rejectReason.trim())}
            >
              Reject selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
