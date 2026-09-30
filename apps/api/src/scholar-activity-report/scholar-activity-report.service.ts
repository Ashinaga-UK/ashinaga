import { BadRequestException, Injectable } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { and, asc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { goals, scholars, tasks, users } from '../db/schema';
import { GetScholarActivityQueryDto } from './dto/get-scholar-activity-query.dto';
import {
  activityRangeEnd,
  activityRangeStart,
  buildScholarActivityReport,
  paginateScholarActivityReport,
  type ScholarActivityReport,
  type ScholarActivityScholarInput,
  type ScholarActivityStage,
  type ScholarActivityStatus,
  scholarActivityReportToCsv,
} from './scholar-activity-report';

const DEFAULT_PAGE_SIZE = 50;

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function countWhere(condition: SQL | undefined): SQL<number> {
  return sql<number>`count(*) filter (where ${condition ?? sql`true`})::int`;
}

@Injectable()
export class ScholarActivityReportService {
  private get db() {
    return getDatabase();
  }

  async getReport(query: GetScholarActivityQueryDto = {}): Promise<ScholarActivityReport> {
    const report = await this.loadReport(query, { includeOptions: true });
    return paginateScholarActivityReport(report, query.page ?? 1, query.limit ?? DEFAULT_PAGE_SIZE);
  }

  async exportCsv(query: GetScholarActivityQueryDto = {}): Promise<string> {
    const report = await this.loadReport(query, { includeOptions: false });
    return scholarActivityReportToCsv(report);
  }

  private async loadReport(
    query: GetScholarActivityQueryDto,
    options: { includeOptions: boolean }
  ): Promise<ScholarActivityReport> {
    const from = activityRangeStart(query.from);
    const to = activityRangeEnd(query.to);
    if (from && to && from.getTime() >= to.getTime()) {
      throw new BadRequestException('from must be before to');
    }
    const rangeActive = from != null || to != null;
    const where = this.scholarWhere(query);

    const [optionSources, scholarRows] = await Promise.all([
      options.includeOptions ? this.filterOptionSources() : Promise.resolve(null),
      this.db
        .select({
          scholarId: scholars.id,
          name: users.name,
          email: users.email,
          status: scholars.status,
          program: scholars.program,
          year: scholars.year,
          programStage: scholars.programStage,
          nationality: scholars.nationality,
          lastActivity: scholars.lastActivity,
        })
        .from(scholars)
        .innerJoin(users, eq(scholars.userId, users.id))
        .where(where)
        .orderBy(asc(users.name)),
    ]);

    const [taskRows, goalRows] =
      scholarRows.length === 0
        ? [[], []]
        : await Promise.all([
            this.taskAggregates(where, from, to),
            this.goalAggregates(where, from, to),
          ]);

    const tasksByScholar = new Map(taskRows.map((row) => [row.scholarId, row]));
    const goalsByScholar = new Map(goalRows.map((row) => [row.scholarId, row]));

    const inputs: ScholarActivityScholarInput[] = scholarRows.map((row) => {
      const task = tasksByScholar.get(row.scholarId);
      const goal = goalsByScholar.get(row.scholarId);
      return {
        scholarId: row.scholarId,
        name: row.name,
        email: row.email,
        status: row.status as ScholarActivityStatus,
        program: row.program,
        year: row.year,
        programStage: row.programStage as ScholarActivityStage,
        nationality: row.nationality,
        lastActivity: row.lastActivity,
        tasksAssigned: asNumber(task?.tasksAssigned),
        tasksCompleted: asNumber(task?.tasksCompleted),
        tasksCompletedInRange: rangeActive ? asNumber(task?.tasksCompletedInRange) : null,
        tasksBehind: asNumber(task?.tasksBehind),
        goalsTotal: asNumber(goal?.goalsTotal),
        goalsCompleted: asNumber(goal?.goalsCompleted),
        goalsUpdatedInRange: rangeActive ? asNumber(goal?.goalsUpdatedInRange) : null,
        avgCompletionScale: asNumberOrNull(goal?.avgCompletionScale),
      };
    });

    return buildScholarActivityReport(
      inputs,
      optionSources ?? { programs: [], years: [], nationalities: [] },
      {
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }
    );
  }

  private scholarWhere(query: GetScholarActivityQueryDto): SQL | undefined {
    const status = query.status ?? 'active';
    return and(
      status === 'all' ? undefined : eq(scholars.status, status),
      query.program ? eq(scholars.program, query.program) : undefined,
      query.year ? eq(scholars.year, query.year) : undefined,
      query.programStage ? eq(scholars.programStage, query.programStage) : undefined,
      query.nationality ? eq(scholars.nationality, query.nationality) : undefined
    );
  }

  /** Distinct dropdown values. Not loaded for CSV, which does not return filter options. */
  private async filterOptionSources() {
    const [programs, years, nationalities] = await Promise.all([
      this.db.selectDistinct({ value: scholars.program }).from(scholars).orderBy(scholars.program),
      this.db.selectDistinct({ value: scholars.year }).from(scholars).orderBy(scholars.year),
      this.db
        .selectDistinct({ value: scholars.nationality })
        .from(scholars)
        .orderBy(scholars.nationality),
    ]);
    return {
      programs: programs.map((row) => row.value),
      years: years.map((row) => row.value),
      nationalities: nationalities.map((row) => row.value),
    };
  }

  /**
   * Scholars matching the report filter. Aggregates join this instead of an IN list
   * that grows with every scholar in the cohort.
   */
  private filteredScholars(where: SQL | undefined) {
    return this.db
      .select({ id: scholars.id })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(where)
      .as('filtered_scholars');
  }

  private taskAggregates(where: SQL | undefined, from: Date | null, to: Date | null) {
    const filtered = this.filteredScholars(where);
    const inRange = and(
      eq(tasks.status, 'completed'),
      from ? gte(tasks.completedAt, from) : undefined,
      to ? lt(tasks.completedAt, to) : undefined
    );
    const behind = sql`${tasks.status} <> 'completed' and (${tasks.dueDate} at time zone 'UTC')::date <= (current_timestamp at time zone 'UTC')::date`;

    return this.db
      .select({
        scholarId: tasks.scholarId,
        tasksAssigned: sql<number>`count(*)::int`,
        tasksCompleted: countWhere(eq(tasks.status, 'completed')),
        tasksCompletedInRange: countWhere(inRange),
        tasksBehind: countWhere(behind),
      })
      .from(tasks)
      .innerJoin(filtered, eq(tasks.scholarId, filtered.id))
      .where(isNull(tasks.deletedAt))
      .groupBy(tasks.scholarId);
  }

  private goalAggregates(where: SQL | undefined, from: Date | null, to: Date | null) {
    const filtered = this.filteredScholars(where);
    const updatedInRange = and(
      from ? gte(goals.updatedAt, from) : undefined,
      to ? lt(goals.updatedAt, to) : undefined
    );

    return this.db
      .select({
        scholarId: goals.scholarId,
        goalsTotal: sql<number>`count(*)::int`,
        goalsCompleted: countWhere(eq(goals.status, 'completed')),
        goalsUpdatedInRange: countWhere(updatedInRange),
        avgCompletionScale: sql<string | null>`avg(${goals.completionScale})`,
      })
      .from(goals)
      .innerJoin(filtered, eq(goals.scholarId, filtered.id))
      .groupBy(goals.scholarId);
  }
}
