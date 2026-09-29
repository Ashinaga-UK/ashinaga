'use client';

import { Download, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { SubmissionKind, SubmissionReportFilters } from '../lib/api-client';
import { downloadSubmissionReportCSV } from '../lib/api-client';
import { REQUEST_TYPE_LABELS } from '../lib/form-data-labels';
import { useScholarSubmissions, useSubmissionReport } from '../lib/hooks/use-queries';
import { Button } from './ui/button';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const ALL = 'all';
const PAGE_SIZE = 25;
const REQUEST_TYPES = [
  'extenuating_circumstances',
  'summer_funding_request',
  'summer_funding_report',
  'requirement_submission',
  'others',
] as const;

const KIND_LABELS: Record<SubmissionKind, string> = {
  request: 'Request',
  goal_update: 'Goal update',
  task_submission: 'Task submission',
};

const chartConfig = {
  request: { label: 'Requests', color: 'hsl(var(--chart-1))' },
  goal_update: { label: 'Goal updates', color: 'hsl(var(--chart-2))' },
  task_submission: { label: 'Task submissions', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

type ProfileTab = 'profile' | 'goals' | 'tasks';

type SelectedScholar = {
  id: string;
  name: string;
  email: string;
};

function labelFromKey(value: string): string {
  const [first, ...rest] = value.split('_');
  if (!first) return value;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ');
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-');
  const date = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1));
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function formatOccurredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

function profileTabForKind(kind: SubmissionKind): ProfileTab {
  if (kind === 'goal_update') return 'goals';
  if (kind === 'task_submission') return 'tasks';
  return 'profile';
}

function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function SubmissionsReport({
  onViewScholar,
}: {
  onViewScholar: (scholarId: string, tab: ProfileTab) => void;
}) {
  const [program, setProgram] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [kind, setKind] = useState<typeof ALL | SubmissionKind>(ALL);
  const [requestType, setRequestType] = useState<(typeof REQUEST_TYPES)[number] | typeof ALL>(ALL);
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedScholar, setSelectedScholar] = useState<SelectedScholar | null>(null);
  const [exporting, setExporting] = useState(false);

  const requestTypeActive = kind === ALL || kind === 'request';
  const filters = useMemo<SubmissionReportFilters>(() => {
    const next: SubmissionReportFilters = {};
    if (program !== ALL) next.program = program;
    if (year !== ALL) next.year = year;
    if (kind !== ALL) next.kind = kind;
    if (requestTypeActive && requestType !== ALL) next.requestType = requestType;
    if (status !== ALL) next.status = status;
    if (from) next.from = from;
    if (to) next.to = to;
    return next;
  }, [from, kind, program, requestType, requestTypeActive, status, to, year]);
  const pagedFilters = useMemo<SubmissionReportFilters>(
    () => ({ ...filters, page, limit: PAGE_SIZE }),
    [filters, page]
  );

  const report = useSubmissionReport(selectedScholar ? filters : pagedFilters);
  const scholarHistory = useScholarSubmissions(
    selectedScholar?.id ?? '',
    pagedFilters,
    selectedScholar != null
  );

  const summary = report.data?.summary;
  const series = report.data?.series ?? [];
  const options = report.data?.filterOptions;
  const tableReport = selectedScholar ? scholarHistory.data : report.data;
  const rows = tableReport?.rows ?? [];
  const pagination = tableReport?.pagination;
  const tableLoading = selectedScholar ? scholarHistory.isLoading && !scholarHistory.data : false;
  const tableError = selectedScholar ? scholarHistory.isError : false;

  const resetPage = () => setPage(1);

  const handleExport = async () => {
    if (!pagination || pagination.totalItems === 0) return;
    setExporting(true);
    try {
      await downloadSubmissionReportCSV(
        selectedScholar ? { ...filters, scholarId: selectedScholar.id } : filters
      );
    } catch (err) {
      console.error(err);
      alert('Failed to download submissions CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (report.isLoading && !report.data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading submissions...
      </div>
    );
  }

  if (report.isError && !report.data) {
    return <p className="text-sm text-destructive">Could not load submissions.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStat label="Submissions" value={summary?.total ?? 0} />
        <ReportStat label="Requests" value={summary?.byKind.request ?? 0} />
        <ReportStat label="Goal updates" value={summary?.byKind.goal_update ?? 0} />
        <ReportStat label="Task submissions" value={summary?.byKind.task_submission ?? 0} />
      </div>

      <p className="text-xs text-muted-foreground">
        Goal updates count the latest edit on each goal. Repeated edits in the range count once.
        Approved and rejected include requests only.
      </p>

      {series.length > 0 && (
        <ChartContainer config={chartConfig} className="aspect-[2.4/1] min-h-[220px] w-full">
          <BarChart data={series}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickFormatter={formatMonth} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="request" stackId="submissions" fill="var(--color-request)" />
            <Bar dataKey="goal_update" stackId="submissions" fill="var(--color-goal_update)" />
            <Bar
              dataKey="task_submission"
              stackId="submissions"
              fill="var(--color-task_submission)"
            />
          </BarChart>
        </ChartContainer>
      )}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Select
            value={program}
            onValueChange={(value) => {
              setProgram(value);
              resetPage();
            }}
          >
            <SelectTrigger aria-label="Programme">
              <SelectValue placeholder="Programme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All programmes</SelectItem>
              {(options?.programs ?? []).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={year}
            onValueChange={(value) => {
              setYear(value);
              resetPage();
            }}
          >
            <SelectTrigger aria-label="Cohort year">
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
          <Select
            value={kind}
            onValueChange={(value) => {
              setKind(value as typeof ALL | SubmissionKind);
              if (value !== ALL && value !== 'request') setRequestType(ALL);
              resetPage();
            }}
          >
            <SelectTrigger aria-label="Submission type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              <SelectItem value="request">Requests</SelectItem>
              <SelectItem value="goal_update">Goal updates</SelectItem>
              <SelectItem value="task_submission">Task submissions</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={requestTypeActive ? requestType : ALL}
            onValueChange={(value) => {
              setRequestType(value as (typeof REQUEST_TYPES)[number] | typeof ALL);
              resetPage();
            }}
            disabled={!requestTypeActive}
          >
            <SelectTrigger aria-label="Request type">
              <SelectValue placeholder="Request type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All request types</SelectItem>
              {REQUEST_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REQUEST_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as typeof status);
              resetPage();
            }}
          >
            <SelectTrigger aria-label="Status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="From"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              resetPage();
            }}
          />
          <Input
            type="date"
            aria-label="To"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              resetPage();
            }}
          />
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-fit"
          disabled={exporting || !pagination || pagination.totalItems === 0}
          onClick={handleExport}
        >
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>

      {selectedScholar && (
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{selectedScholar.name}&apos;s submissions</p>
            <p className="text-xs text-muted-foreground">{selectedScholar.email}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onViewScholar(selectedScholar.id, 'profile')}>
              Open profile
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedScholar(null);
                resetPage();
              }}
            >
              Show everyone
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scholar</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="text-right">Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Loading this scholar&apos;s submissions...
                </TableCell>
              </TableRow>
            ) : tableError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-destructive">
                  Could not load this scholar&apos;s submissions.
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No submissions match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.kind}-${row.id}`}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium text-foreground underline-offset-4 hover:underline"
                      onClick={() => {
                        setSelectedScholar({
                          id: row.scholarId,
                          name: row.scholarName,
                          email: row.scholarEmail,
                        });
                        resetPage();
                      }}
                    >
                      {row.scholarName}
                    </button>
                    <p className="text-xs text-muted-foreground">{row.scholarEmail}</p>
                  </TableCell>
                  <TableCell>
                    {row.program} {row.year}
                  </TableCell>
                  <TableCell>
                    {KIND_LABELS[row.kind]}
                    {row.requestType ? (
                      <p className="text-xs text-muted-foreground">
                        {REQUEST_TYPE_LABELS[row.requestType] ?? row.requestType}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>{labelFromKey(row.status)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatOccurredAt(row.occurredAt)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{row.title}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewScholar(row.scholarId, profileTabForKind(row.kind))}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
