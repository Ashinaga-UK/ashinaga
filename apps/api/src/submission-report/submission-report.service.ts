import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AnyColumn, SQL } from 'drizzle-orm';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { requests, scholars, staff } from '../db/schema';
import {
  activityRangeEnd,
  activityRangeStart,
} from '../scholar-activity-report/scholar-activity-report';
import { GetSubmissionReportQueryDto } from './dto/get-submission-report-query.dto';
import {
  buildSubmissionReport,
  type SubmissionReport,
  type SubmissionRequestType,
  submissionReportToCsv,
} from './submission-report';

/** Same trimmed, case-folded match as the scholar activity report filters. */
function foldedEquals(column: AnyColumn, value?: string): SQL | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return sql`lower(btrim(${column})) = ${trimmed.toLocaleLowerCase('en-GB')}`;
}

/**
 * Request volume over time. Archived requests and every scholar status are counted,
 * so the history does not shrink when requests are archived or scholars leave.
 */
@Injectable()
export class SubmissionReportService {
  private get db() {
    return getDatabase();
  }

  async getReport(
    query: GetSubmissionReportQueryDto,
    staffUserId: string
  ): Promise<SubmissionReport> {
    await this.assertSuperAdmin(staffUserId);
    return buildSubmissionReport(await this.aggregate(query));
  }

  async exportCsv(query: GetSubmissionReportQueryDto, staffUserId: string): Promise<string> {
    return submissionReportToCsv(await this.getReport(query, staffUserId));
  }

  /** Non-super-admins only see assigned, unarchived requests elsewhere; totals would leak. */
  private async assertSuperAdmin(staffUserId: string): Promise<void> {
    const [staffRecord] = await this.db
      .select({ isSuperAdmin: staff.isSuperAdmin })
      .from(staff)
      .where(eq(staff.userId, staffUserId));
    if (!staffRecord?.isSuperAdmin) {
      throw new ForbiddenException('Submission report is restricted to super admins');
    }
  }

  private async aggregate(query: GetSubmissionReportQueryDto) {
    const from = activityRangeStart(query.from);
    const to = activityRangeEnd(query.to);
    if (from && to && from.getTime() >= to.getTime()) {
      throw new BadRequestException('from must be before to');
    }

    const month = sql<string>`to_char(date_trunc('month', ${requests.submittedDate} at time zone 'UTC'), 'YYYY-MM')`;
    const programKey = sql`lower(btrim(${scholars.program}))`;
    const yearKey = sql`lower(btrim(${scholars.year}))`;

    const rows = await this.db
      .select({
        month,
        type: requests.type,
        program: sql<string>`min(btrim(${scholars.program}))`,
        year: sql<string>`min(btrim(${scholars.year}))`,
        count: sql<number>`count(*)::int`,
      })
      .from(requests)
      .innerJoin(scholars, eq(requests.scholarId, scholars.id))
      .where(
        and(
          from ? gte(requests.submittedDate, from) : undefined,
          to ? lt(requests.submittedDate, to) : undefined,
          query.type ? eq(requests.type, query.type) : undefined,
          foldedEquals(scholars.program, query.program),
          foldedEquals(scholars.year, query.year)
        )
      )
      .groupBy(month, requests.type, programKey, yearKey)
      .orderBy(month, requests.type, programKey, yearKey);

    return rows.map((row) => ({
      month: row.month,
      type: row.type as SubmissionRequestType,
      program: row.program,
      year: row.year,
      count: Number(row.count),
    }));
  }
}
