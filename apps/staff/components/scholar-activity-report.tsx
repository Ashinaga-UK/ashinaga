'use client';

import { Download, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ScholarActivityFilters, ScholarActivityRow } from '../lib/api-client';
import { downloadScholarActivityReportCSV } from '../lib/api-client';
import { useScholarActivityReport } from '../lib/hooks/use-queries';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const ALL = 'all';

type SortValue =
  | 'name'
  | 'lastActivity-asc'
  | 'lastActivity-desc'
  | 'taskCompletionRate-asc'
  | 'taskCompletionRate-desc';

function statusLabel(status: ScholarActivityRow['status']): string {
  if (status === 'on_hold') return 'On hold';
  if (status === 'inactive') return 'Inactive';
  if (status === 'archived') return 'Archived';
  return 'Active';
}

function stageLabel(stage: ScholarActivityRow['programStage']): string {
  return stage === 'prep_year' ? 'Prep Year' : 'Scholar';
}

function formatLastSeen(value: string | null): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRate(value: number | null): string {
  return value == null ? '—' : `${value}%`;
}

function activityLabel(row: ScholarActivityRow): string {
  if (row.lastActivityUnknown) return 'Unknown';
  if (row.isStaleLogin) return 'No activity in 30 days';
  return 'Seen recently';
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function ScholarActivityReport({
  onViewScholar,
}: {
  onViewScholar: (scholarId: string) => void;
}) {
  const [program, setProgram] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [programStage, setProgramStage] = useState(ALL);
  const [nationality, setNationality] = useState(ALL);
  const [status, setStatus] = useState('active');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<SortValue>('name');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const changeFilter = <T,>(setter: (value: T) => void) => {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  };

  const filters = useMemo<ScholarActivityFilters>(() => {
    const [sortBy, sortOrder] = sort === 'name' ? ['name' as const, undefined] : sort.split('-');
    const next: ScholarActivityFilters = {
      status: status as ScholarActivityFilters['status'],
    };
    if (program !== ALL) next.program = program;
    if (year !== ALL) next.year = year;
    if (programStage === 'prep_year' || programStage === 'scholar')
      next.programStage = programStage;
    if (nationality !== ALL) next.nationality = nationality;
    if (from) next.from = from;
    if (to) next.to = to;
    if (sortBy === 'lastActivity' || sortBy === 'taskCompletionRate') {
      next.sortBy = sortBy;
      next.sortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
    }
    if (page > 1) next.page = page;
    return next;
  }, [program, year, programStage, nationality, status, from, to, sort, page]);

  const { data, isLoading, isFetching, error } = useScholarActivityReport(filters);
  const scholars = data?.scholars ?? [];
  const cohorts = data?.cohorts ?? [];
  const options = data?.filterOptions;
  const summary = data?.summary;
  const rangeActive = Boolean(from || to);
  const reportBusy = exporting || isFetching;
  const columnCount = rangeActive ? 14 : 12;

  const handleExportCsv = async () => {
    if (reportBusy || scholars.length === 0) return;
    setExporting(true);
    const { page: _page, ...exportFilters } = filters;
    try {
      await downloadScholarActivityReportCSV(exportFilters);
    } catch (err) {
      console.error(err);
      alert('Failed to download scholar activity CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading scholar activity...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Could not load scholar activity.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ReportStat label="Scholars" value={String(summary?.scholarCount ?? 0)} />
        <ReportStat label="No activity in 30 days" value={String(summary?.staleLoginCount ?? 0)} />
        <ReportStat label="Activity unknown" value={String(summary?.unknownLoginCount ?? 0)} />
        <ReportStat label="Behind on tasks" value={String(summary?.scholarsBehindOnTasks ?? 0)} />
        <ReportStat
          label="Avg task completion"
          value={formatRate(summary?.avgTaskCompletionRate ?? null)}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select value={program} onValueChange={changeFilter(setProgram)}>
            <SelectTrigger aria-label="Filter by program">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All programs</SelectItem>
              {(options?.programs ?? []).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={changeFilter(setYear)}>
            <SelectTrigger aria-label="Filter by year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All years</SelectItem>
              {(options?.years ?? []).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={programStage} onValueChange={changeFilter(setProgramStage)}>
            <SelectTrigger aria-label="Filter by stage">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All stages</SelectItem>
              <SelectItem value="prep_year">Prep Year</SelectItem>
              <SelectItem value="scholar">Scholar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={nationality} onValueChange={changeFilter(setNationality)}>
            <SelectTrigger aria-label="Filter by nationality">
              <SelectValue placeholder="Nationality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All nationalities</SelectItem>
              {(options?.nationalities ?? []).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={changeFilter(setStatus)}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {(options?.statuses ?? []).map((value) => (
                <SelectItem key={value} value={value}>
                  {statusLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={changeFilter((value) => setSort(value as SortValue))}>
            <SelectTrigger aria-label="Sort scholars">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="lastActivity-asc">Last seen, oldest</SelectItem>
              <SelectItem value="lastActivity-desc">Last seen, newest</SelectItem>
              <SelectItem value="taskCompletionRate-asc">Task completion, lowest</SelectItem>
              <SelectItem value="taskCompletionRate-desc">Task completion, highest</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">From (UTC)</span>
            <Input
              type="date"
              aria-label="From (UTC)"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">To (UTC)</span>
            <Input
              type="date"
              aria-label="To (UTC)"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-fit"
          onClick={() => {
            void handleExportCsv();
          }}
          disabled={reportBusy || scholars.length === 0}
        >
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Last seen is the latest sign-in or profile visit. Unknown means that timestamp was never
        recorded. The date range is in UTC and applies to tasks completed and goals updated.
      </p>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Cohorts</h3>
        <p className="text-xs text-muted-foreground">
          Grouped by program and year. The highest share of scholars with no activity in 30 days is
          listed first.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Scholars</TableHead>
                <TableHead className="text-right">No activity in 30 days</TableHead>
                <TableHead className="text-right">Unknown</TableHead>
                <TableHead className="text-right">Behind on tasks</TableHead>
                <TableHead className="text-right">Avg completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                    No cohorts match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                cohorts.map((cohort) => (
                  <TableRow key={`${cohort.program}:${cohort.year}`}>
                    <TableCell>{cohort.program}</TableCell>
                    <TableCell>{cohort.year}</TableCell>
                    <TableCell className="text-right tabular-nums">{cohort.scholarCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cohort.staleLoginCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cohort.unknownLoginCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cohort.scholarsBehindOnTasks}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(cohort.avgTaskCompletionRate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scholar</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="text-right">
                {rangeActive ? 'Tasks (all time)' : 'Tasks'}
              </TableHead>
              <TableHead className="text-right">Behind</TableHead>
              <TableHead className="text-right">
                {rangeActive ? 'Completion (all time)' : 'Completion'}
              </TableHead>
              {rangeActive ? (
                <TableHead className="text-right">Completed in range</TableHead>
              ) : null}
              <TableHead className="text-right">Goals</TableHead>
              {rangeActive ? <TableHead className="text-right">Goals updated</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {scholars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-28 text-center text-muted-foreground">
                  No scholars match this filter.
                </TableCell>
              </TableRow>
            ) : (
              scholars.map((row) => (
                <TableRow key={row.scholarId}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium text-foreground underline-offset-4 hover:underline"
                      onClick={() => onViewScholar(row.scholarId)}
                    >
                      {row.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell>{row.program}</TableCell>
                  <TableCell>{row.year}</TableCell>
                  <TableCell>{stageLabel(row.programStage)}</TableCell>
                  <TableCell>{row.nationality || '—'}</TableCell>
                  <TableCell>{statusLabel(row.status)}</TableCell>
                  <TableCell>{formatLastSeen(row.lastActivity)}</TableCell>
                  <TableCell>
                    <Badge variant={row.isStaleLogin ? 'outline' : 'secondary'}>
                      {activityLabel(row)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.tasksCompleted}/{row.tasksAssigned}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.tasksBehind}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRate(row.taskCompletionRate)}
                  </TableCell>
                  {rangeActive ? (
                    <TableCell className="text-right tabular-nums">
                      {row.tasksCompletedInRange}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right tabular-nums">
                    {row.goalsCompleted}/{row.goalsTotal}
                  </TableCell>
                  {rangeActive ? (
                    <TableCell className="text-right tabular-nums">
                      {row.goalsUpdatedInRange}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {data?.meta && data.meta.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={data.meta.page <= 1 || reportBusy}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={data.meta.page >= data.meta.totalPages || reportBusy}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
