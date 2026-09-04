'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  PrepTaskCohortCell,
  PrepTaskCohortFilters,
  PrepTaskCohortState,
} from '../lib/api-client';
import { usePrepTaskCohort } from '../lib/hooks/use-queries';
import { BulkTaskAssignment } from './bulk-task-assignment';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const ALL = 'all';

function statusLabel(status: PrepTaskCohortCell['status']): string {
  if (status === 'pending') return 'Not started';
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  return 'Unassigned';
}

function CellBadges({ cell }: { cell: PrepTaskCohortCell }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant={cell.status === 'completed' ? 'default' : 'secondary'}>
        {statusLabel(cell.status)}
      </Badge>
      {cell.overdue ? (
        <Badge variant="destructive" className="text-destructive-foreground">
          Overdue
        </Badge>
      ) : null}
    </div>
  );
}

function emptyMessage(options: {
  scholarCount: number;
  columnCount: number;
  filteredCount: number;
}): string {
  if (options.scholarCount === 0) {
    return 'No Prep Year candidates yet.';
  }
  if (options.columnCount === 0) {
    return 'No tasks have been assigned to the Prep Year cohort yet.';
  }
  if (options.filteredCount === 0) {
    return 'No Prep Year candidates match this filter.';
  }
  return 'No Prep Year candidates match this filter.';
}

export function PrepTasksTracker({
  onViewScholar,
}: {
  onViewScholar: (scholarId: string) => void;
}) {
  const [phase, setPhase] = useState(ALL);
  const [scholarId, setScholarId] = useState(ALL);
  const [columnKey, setColumnKey] = useState(ALL);
  const [state, setState] = useState(ALL);
  const filters = useMemo<PrepTaskCohortFilters>(() => {
    const next: PrepTaskCohortFilters = {};
    if (phase !== ALL) next.phase = phase;
    if (scholarId !== ALL) next.scholarId = scholarId;
    if (columnKey !== ALL) next.columnKey = columnKey;
    if (state !== ALL) next.state = state as PrepTaskCohortState;
    return next;
  }, [phase, scholarId, columnKey, state]);

  const { data, isLoading, error } = usePrepTaskCohort(filters);
  const queryClient = useQueryClient();

  const columns = data?.columns ?? [];
  const scholars = data?.scholars ?? [];
  const options = data?.filterOptions;
  const summary = data?.summary;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Prep Year tasks...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Could not load the task tracker.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Cohort status</h3>
          <p className="text-sm text-muted-foreground">
            {summary
              ? `${summary.scholarCount} candidates · ${summary.columnCount} tasks · ${summary.completedCount} completed · ${summary.overdueCount} overdue`
              : 'Task completion across Prep Year candidates.'}
          </p>
        </div>
        <BulkTaskAssignment
          assignToProgramStage="prep_year"
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ['prep-tasks'] });
          }}
          trigger={
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Assign to Prep Year cohort
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        <Select value={columnKey} onValueChange={setColumnKey}>
          <SelectTrigger aria-label="Filter by task">
            <SelectValue placeholder="Task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All tasks</SelectItem>
            {(options?.columns ?? []).map((column) => (
              <SelectItem key={column.key} value={column.key}>
                {column.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger aria-label="Filter by state">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All states</SelectItem>
            <SelectItem value="not_started">Not started</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  <div className="min-w-[8rem]">
                    <p>{column.title}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {column.phase ? `${column.phase} · ` : ''}
                      {new Date(column.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {scholars.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(columns.length + 1, 1)}
                  className="text-center text-muted-foreground"
                >
                  {emptyMessage({
                    scholarCount: options?.scholars.length ?? 0,
                    columnCount: options?.columns.length ?? 0,
                    filteredCount: scholars.length,
                  })}
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
                  {columns.map((column) => {
                    const cell = scholar.cells.find((item) => item.columnKey === column.key);
                    return (
                      <TableCell key={column.key}>
                        <CellBadges
                          cell={
                            cell ?? {
                              columnKey: column.key,
                              taskId: null,
                              status: null,
                              overdue: false,
                              completedAt: null,
                            }
                          }
                        />
                      </TableCell>
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
