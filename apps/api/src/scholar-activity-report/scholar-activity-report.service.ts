import { Injectable } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { and, asc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { goals, scholars, tasks, users } from '../db/schema';
import { GetScholarActivityQueryDto } from './dto/get-scholar-activity-query.dto';
import {
  activityRangeEnd,
  activityRangeStart,
  buildScholarActivityReport,
  type ScholarActivityReport,
  type ScholarActivityScholarInput,
  type ScholarActivityStage,
  type ScholarActivityStatus,
  scholarActivityReportToCsv,
} from './scholar-activity-report';

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
    const from = activityRangeStart(query.from);
    const to = activityRangeEnd(query.to);
    const where = this.scholarWhere(query);

    const [optionRows, scholarRows] = await Promise.all([
      this.db
        .select({
          program: scholars.program,
          year: scholars.year,
          nationality: scholars.nationality,
        })
        .from(scholars),
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

    const ids = scholarRows.map((row) => row.scholarId);
    const [taskRows, goalRows] =
      ids.length === 0
        ? [[], []]
        : await Promise.all([
            this.taskAggregates(ids, from, to),
            this.goalAggregates(ids, from, to),
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
        tasksCompletedInRange: asNumber(task?.tasksCompletedInRange),
        tasksBehind: asNumber(task?.tasksBehind),
        goalsTotal: asNumber(goal?.goalsTotal),
        goalsCompleted: asNumber(goal?.goalsCompleted),
        goalsUpdatedInRange: asNumber(goal?.goalsUpdatedInRange),
        avgCompletionScale: asNumberOrNull(goal?.avgCompletionScale),
      };
    });

    return buildScholarActivityReport(inputs, optionRows, {
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async exportCsv(query: GetScholarActivityQueryDto = {}): Promise<string> {
    const report = await this.getReport(query);
    return scholarActivityReportToCsv(report);
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

  private taskAggregates(ids: string[], from: Date | null, to: Date | null) {
    const inRange = and(
      isNull(tasks.deletedAt),
      eq(tasks.status, 'completed'),
      from ? gte(tasks.completedAt, from) : undefined,
      to ? lt(tasks.completedAt, to) : undefined
    );
    const behind = sql`${tasks.deletedAt} is null and ${tasks.status} <> 'completed' and (${tasks.dueDate} at time zone 'UTC')::date <= (current_timestamp at time zone 'UTC')::date`;

    return this.db
      .select({
        scholarId: tasks.scholarId,
        tasksAssigned: countWhere(isNull(tasks.deletedAt)),
        tasksCompleted: countWhere(and(isNull(tasks.deletedAt), eq(tasks.status, 'completed'))),
        tasksCompletedInRange: countWhere(inRange),
        tasksBehind: countWhere(behind),
      })
      .from(tasks)
      .where(inArray(tasks.scholarId, ids))
      .groupBy(tasks.scholarId);
  }

  private goalAggregates(ids: string[], from: Date | null, to: Date | null) {
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
      .where(inArray(goals.scholarId, ids))
      .groupBy(goals.scholarId);
  }
}
