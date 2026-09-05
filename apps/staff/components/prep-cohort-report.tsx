'use client';

import { Download, Loader2, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  PrepYearDocumentStatus,
  PrepYearPlatformStatus,
  PrepYearReportDocumentType,
  PrepYearReportFilters,
  PrepYearReportPlatform,
  PrepYearReportRow,
} from '../lib/api-client';
import { downloadPrepYearReportCSV } from '../lib/api-client';
import { usePrepYearReport } from '../lib/hooks/use-queries';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const ALL = 'all';

function scholarStatusLabel(status: 'active' | 'inactive' | 'on_hold' | 'archived'): string {
  if (status === 'on_hold') return 'On hold';
  if (status === 'inactive') return 'Inactive';
  if (status === 'archived') return 'Archived';
  return 'Active';
}

function documentStatusLabel(status: PrepYearDocumentStatus): string {
  return status === 'submitted' ? 'Submitted' : 'Missing';
}

function platformStatusLabel(status: PrepYearPlatformStatus): string {
  if (status === 'yes') return 'Yes';
  if (status === 'no') return 'No';
  return 'Pending';
}

function printFieldsForScholar(
  row: PrepYearReportRow,
  documentTypes: PrepYearReportDocumentType[],
  platforms: PrepYearReportPlatform[]
): Array<{ label: string; value: string }> {
  return [
    { label: 'Status', value: scholarStatusLabel(row.status) },
    { label: 'Intended university', value: row.intendedUniversity || '—' },
    { label: 'Intended course', value: row.intendedCourse || '—' },
    { label: 'Degree pathway', value: row.degreePathway || '—' },
    { label: 'Tasks assigned', value: String(row.assignedCount) },
    { label: 'Completed', value: String(row.completedCount) },
    { label: 'Overdue', value: String(row.overdueCount) },
    { label: 'Completion', value: row.completionRate == null ? '—' : `${row.completionRate}%` },
    ...documentTypes.map((type) => ({
      label: type.label,
      value: documentStatusLabel(row.documents[type.id] ?? 'missing'),
    })),
    ...platforms.map((platform) => ({
      label: platform.name,
      value: platformStatusLabel(row.platforms[platform.id] ?? 'pending'),
    })),
  ];
}

function PrintField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="m-0 text-[7.5pt] font-semibold uppercase tracking-wider text-neutral-600">
        {label}
      </p>
      <p className="m-0 mt-0.5 text-[10pt] leading-snug">{value}</p>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 print:rounded-none print:p-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function PrepCohortReport({
  onViewScholar,
}: {
  onViewScholar: (scholarId: string) => void;
}) {
  const [phase, setPhase] = useState(ALL);
  const [scholarId, setScholarId] = useState(ALL);
  const [exporting, setExporting] = useState(false);
  const filters = useMemo<PrepYearReportFilters>(() => {
    const next: PrepYearReportFilters = {};
    if (phase !== ALL) next.phase = phase;
    if (scholarId !== ALL) next.scholarId = scholarId;
    return next;
  }, [phase, scholarId]);

  const { data, isLoading, error } = usePrepYearReport(filters);
  const scholars = data?.scholars ?? [];
  const documentTypes = data?.documentTypes ?? [];
  const platforms = data?.platforms ?? [];
  const options = data?.filterOptions;
  const summary = data?.summary;
  const columnCount = 9 + documentTypes.length + platforms.length;
  const scholarFilterLabel =
    scholarId === ALL
      ? 'All candidates'
      : (options?.scholars.find((scholar) => scholar.scholarId === scholarId)?.name ??
        'All candidates');
  const phaseFilterLabel = phase === ALL ? 'All phases' : phase;

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadPrepYearReportCSV(filters);
    } catch (err) {
      console.error(err);
      alert('Failed to download Prep Year cohort report CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Prep Year report...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Could not load the cohort report.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
        <ReportStat label="Candidates" value={summary?.scholarCount ?? 0} />
        <ReportStat label="Tasks overdue" value={summary?.overdueCount ?? 0} />
        <ReportStat label="Documents missing" value={summary?.missingDocumentCount ?? 0} />
      </div>

      <p className="hidden text-xs text-muted-foreground print:block">
        {scholarFilterLabel} · {phaseFilterLabel}
      </p>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          <Select value={scholarId} onValueChange={setScholarId}>
            <SelectTrigger aria-label="Filter by candidate">
              <SelectValue placeholder="Candidate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All candidates</SelectItem>
              {(options?.scholars ?? []).map((scholar) => (
                <SelectItem key={scholar.scholarId} value={scholar.scholarId}>
                  {scholar.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={phase} onValueChange={setPhase}>
            <SelectTrigger aria-label="Filter by phase">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All phases</SelectItem>
              {(options?.phases ?? []).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-fit"
            onClick={() => {
              void handleExportCsv();
            }}
            disabled={exporting || scholars.length === 0}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-fit"
            onClick={() => window.print()}
            disabled={scholars.length === 0}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {scholars.length > 0 ? (
        <div
          className="prep-cohort-print-cards"
          data-testid="prep-report-print"
          aria-hidden="true"
        >
          {scholars.map((row) => (
            <article
              key={row.scholarId}
              className="border-b border-neutral-300 py-2.5 first:pt-0 last:border-b-0"
            >
              <h3 className="m-0 text-[12pt] font-semibold leading-tight">{row.name}</h3>
              <p className="mb-2 mt-0.5 text-[9pt] text-neutral-600">{row.email}</p>
              <div className="prep-cohort-print-grid grid grid-cols-3 items-start gap-x-4 gap-y-2">
                {printFieldsForScholar(row, documentTypes, platforms).map((field, index) => (
                  <PrintField
                    key={`${field.label}-${index}`}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="prep-cohort-screen-table overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Intended university</TableHead>
              <TableHead>Intended course</TableHead>
              <TableHead>Degree pathway</TableHead>
              <TableHead className="text-right">Tasks assigned</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Overdue</TableHead>
              <TableHead className="text-right">Completion</TableHead>
              {documentTypes.map((type) => (
                <TableHead key={type.id}>{type.label}</TableHead>
              ))}
              {platforms.map((platform) => (
                <TableHead key={platform.id}>{platform.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {scholars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-28 text-center text-muted-foreground">
                  {options?.scholars.length
                    ? 'No Prep Year candidates match this filter.'
                    : 'No Prep Year candidates yet.'}
                </TableCell>
              </TableRow>
            ) : (
              scholars.map((row) => (
                <TableRow key={row.scholarId}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => onViewScholar(row.scholarId)}
                    >
                      {row.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell>{scholarStatusLabel(row.status)}</TableCell>
                  <TableCell>{row.intendedUniversity || '—'}</TableCell>
                  <TableCell>{row.intendedCourse || '—'}</TableCell>
                  <TableCell>{row.degreePathway || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.assignedCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.completedCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.overdueCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.completionRate == null ? '—' : `${row.completionRate}%`}
                  </TableCell>
                  {documentTypes.map((type) => {
                    const status = row.documents[type.id] ?? 'missing';
                    return (
                      <TableCell key={type.id}>
                        <Badge variant={status === 'submitted' ? 'default' : 'secondary'}>
                          {documentStatusLabel(status)}
                        </Badge>
                      </TableCell>
                    );
                  })}
                  {platforms.map((platform) => {
                    const status = row.platforms[platform.id] ?? 'pending';
                    return (
                      <TableCell key={platform.id}>{platformStatusLabel(status)}</TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
