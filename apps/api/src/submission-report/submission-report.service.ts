import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, gte, inArray, isNull, lt, type SQL, sql } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { goals, requests, scholars, taskResponses, tasks, users } from '../db/schema';
import type { RequestType } from '../requests/request-types';
import { GetSubmissionReportQueryDto } from './dto/get-submission-report-query.dto';
import {
  buildSubmissionReport,
  type GoalSubmissionInput,
  type GoalSubmissionStatus,
  type RequestSubmissionInput,
  type RequestSubmissionStatus,
  type SubmissionReport,
  type SubmissionReportQuery,
  submissionRangeEnd,
  submissionRangeStart,
  submissionReportToCsv,
  type TaskSubmissionInput,
  type TaskSubmissionStatus,
} from './submission-report';

@Injectable()
export class SubmissionReportService {
  private get db() {
    return getDatabase();
  }

  async getReport(query: GetSubmissionReportQueryDto = {}): Promise<SubmissionReport> {
    return this.compose(query, true);
  }

  async getScholarReport(
    scholarId: string,
    query: GetSubmissionReportQueryDto = {}
  ): Promise<SubmissionReport> {
    return this.compose({ ...query, scholarId }, true);
  }

  async exportCsv(query: GetSubmissionReportQueryDto = {}): Promise<string> {
    const report = await this.compose({ ...query, page: undefined, limit: undefined }, false);
    return submissionReportToCsv(report.rows);
  }

  private async compose(
    query: SubmissionReportQuery,
    paginate: boolean
  ): Promise<SubmissionReport> {
    if (query.scholarId) {
      const [scholar] = await this.db
        .select({ id: scholars.id })
        .from(scholars)
        .where(eq(scholars.id, query.scholarId))
        .limit(1);
      if (!scholar) {
        throw new NotFoundException('Scholar not found');
      }
    }

    const status = query.status && query.status !== 'all' ? query.status : undefined;
    const requestsOnly = status === 'approved' || status === 'rejected' || !!query.requestType;
    const loadRequests = !query.kind || query.kind === 'request';
    const loadGoals = (!query.kind || query.kind === 'goal_update') && !requestsOnly;
    const loadTasks = (!query.kind || query.kind === 'task_submission') && !requestsOnly;

    const [requestRows, goalRows, taskRows, filterOptions] = await Promise.all([
      loadRequests ? this.loadRequests(query) : Promise.resolve([]),
      loadGoals ? this.loadGoals(query) : Promise.resolve([]),
      loadTasks ? this.loadTaskResponses(query) : Promise.resolve([]),
      this.loadFilterOptions(),
    ]);

    return buildSubmissionReport(
      { requests: requestRows, goals: goalRows, taskResponses: taskRows },
      query,
      { paginate, filterOptions }
    );
  }

  private async loadRequests(query: SubmissionReportQuery): Promise<RequestSubmissionInput[]> {
    const conditions: SQL[] = [eq(requests.archived, false)];
    this.pushScholarFilters(conditions, query);
    if (query.requestType) conditions.push(eq(requests.type, query.requestType));
    if (query.status === 'pending') conditions.push(eq(requests.status, 'pending'));
    if (query.status === 'approved') conditions.push(eq(requests.status, 'approved'));
    if (query.status === 'rejected') conditions.push(eq(requests.status, 'rejected'));
    this.pushDateFilters(conditions, requests.submittedDate, query);

    const rows = await this.db
      .select({
        id: requests.id,
        scholarId: scholars.id,
        scholarName: users.name,
        scholarEmail: users.email,
        program: scholars.program,
        year: scholars.year,
        requestType: requests.type,
        status: requests.status,
        submittedAt: requests.submittedDate,
        archived: requests.archived,
        description: requests.description,
      })
      .from(requests)
      .innerJoin(scholars, eq(requests.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(and(...conditions));

    return rows.map((row) => ({
      ...row,
      requestType: row.requestType as RequestType,
      status: row.status as RequestSubmissionStatus,
    }));
  }

  private async loadGoals(query: SubmissionReportQuery): Promise<GoalSubmissionInput[]> {
    const conditions: SQL[] = [sql`${goals.updatedAt} > ${goals.createdAt}`];
    this.pushScholarFilters(conditions, query);
    if (query.status === 'pending') {
      conditions.push(inArray(goals.status, ['pending', 'in_progress']));
    }
    this.pushDateFilters(conditions, goals.updatedAt, query);

    const rows = await this.db
      .select({
        id: goals.id,
        scholarId: scholars.id,
        scholarName: users.name,
        scholarEmail: users.email,
        program: scholars.program,
        year: scholars.year,
        status: goals.status,
        title: goals.title,
        createdAt: goals.createdAt,
        updatedAt: goals.updatedAt,
      })
      .from(goals)
      .innerJoin(scholars, eq(goals.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(and(...conditions));

    return rows.map((row) => ({
      ...row,
      status: row.status as GoalSubmissionStatus,
    }));
  }

  private async loadTaskResponses(query: SubmissionReportQuery): Promise<TaskSubmissionInput[]> {
    const conditions: SQL[] = [isNull(tasks.deletedAt)];
    this.pushScholarFilters(conditions, query);
    if (query.status === 'pending') {
      conditions.push(inArray(tasks.status, ['pending', 'in_progress']));
    }
    this.pushDateFilters(conditions, taskResponses.submittedAt, query);

    const rows = await this.db
      .select({
        id: taskResponses.id,
        taskId: tasks.id,
        scholarId: scholars.id,
        scholarName: users.name,
        scholarEmail: users.email,
        program: scholars.program,
        year: scholars.year,
        taskStatus: tasks.status,
        taskType: tasks.type,
        taskTitle: tasks.title,
        deletedAt: tasks.deletedAt,
        submittedAt: taskResponses.submittedAt,
      })
      .from(taskResponses)
      .innerJoin(tasks, eq(taskResponses.taskId, tasks.id))
      .innerJoin(scholars, eq(tasks.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(and(...conditions));

    return rows.map((row) => ({
      ...row,
      taskStatus: row.taskStatus as TaskSubmissionStatus,
    }));
  }

  private pushScholarFilters(conditions: SQL[], query: SubmissionReportQuery) {
    if (query.scholarId) conditions.push(eq(scholars.id, query.scholarId));
    if (query.program) conditions.push(eq(scholars.program, query.program));
    if (query.year) conditions.push(eq(scholars.year, query.year));
  }

  private pushDateFilters(
    conditions: SQL[],
    column:
      | typeof requests.submittedDate
      | typeof goals.updatedAt
      | typeof taskResponses.submittedAt,
    query: SubmissionReportQuery
  ) {
    const start = submissionRangeStart(query.from);
    const end = submissionRangeEnd(query.to);
    if (start) conditions.push(gte(column, start));
    if (end) conditions.push(lt(column, end));
  }

  private async loadFilterOptions(): Promise<{ programs: string[]; years: string[] }> {
    const rows = await this.db
      .selectDistinct({ program: scholars.program, year: scholars.year })
      .from(scholars);
    return {
      programs: [...new Set(rows.map((row) => row.program))].sort((a, b) =>
        a.localeCompare(b, 'en-GB')
      ),
      years: [...new Set(rows.map((row) => row.year))].sort((a, b) => a.localeCompare(b, 'en-GB')),
    };
  }
}
