import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, isNull, lt, ne } from 'drizzle-orm';
import { toCanonicalAcademicYear } from '../annual-updates/academic-year';
import { database } from '../db/connection';
import {
  annualUpdates,
  requestAssignees,
  requests,
  scholars,
  staff,
  tasks,
  users,
} from '../db/schema';
import { inactivityDays } from '../notifications/notification-config';
import { PrepYearReportService } from '../prep-year-report/prep-year-report.service';
import { loginActivityFilterSql } from '../scholars/login-activity-filter';
import { startOfNextUtcDay } from '../tasks/task-due';
import { buildOverview, type OverviewPayload, type OverviewPrepScholar } from './overview';

@Injectable()
export class OverviewService {
  constructor(private readonly prepYearReportService: PrepYearReportService) {}

  async getOverview(userId: string): Promise<OverviewPayload> {
    const now = new Date();
    const [scholarStageCount, prepReport, taskRows, scholarRows, requestRows, draftRows] =
      await Promise.all([
        database
          .select({ count: count() })
          .from(scholars)
          .where(and(eq(scholars.programStage, 'scholar'), ne(scholars.status, 'archived'))),
        this.prepYearReportService.getReport({}),
        database
          .select({
            id: tasks.id,
            title: tasks.title,
            dueDate: tasks.dueDate,
            status: tasks.status,
            scholarId: tasks.scholarId,
            scholarName: users.name,
          })
          .from(tasks)
          .innerJoin(scholars, eq(tasks.scholarId, scholars.id))
          .innerJoin(users, eq(scholars.userId, users.id))
          .where(
            and(
              isNull(tasks.deletedAt),
              eq(scholars.status, 'active'),
              ne(tasks.status, 'completed'),
              lt(tasks.dueDate, startOfNextUtcDay(now))
            )
          ),
        database
          .select({
            id: scholars.id,
            name: users.name,
            lastActivity: scholars.lastActivity,
          })
          .from(scholars)
          .innerJoin(users, eq(scholars.userId, users.id))
          .where(and(eq(scholars.status, 'active'), loginActivityFilterSql('stale'))),
        this.listPendingRequests(userId),
        database
          .select({
            id: annualUpdates.id,
            scholarId: annualUpdates.scholarId,
            scholarName: users.name,
            academicYear: annualUpdates.academicYear,
          })
          .from(annualUpdates)
          .innerJoin(scholars, eq(annualUpdates.scholarId, scholars.id))
          .innerJoin(users, eq(scholars.userId, users.id))
          .where(and(eq(annualUpdates.status, 'draft'), eq(scholars.status, 'active'))),
      ]);

    const documentLabels = new Map(prepReport.documentTypes.map((type) => [type.id, type.label]));
    const platformNames = new Map(
      prepReport.platforms.map((platform) => [platform.id, platform.name])
    );
    const prepScholars: OverviewPrepScholar[] = prepReport.scholars.map((scholar) => {
      const missingDocuments = Object.entries(scholar.documents)
        .filter(([, status]) => status === 'missing')
        .map(([id]) => documentLabels.get(id) ?? 'Document');
      const incompletePlatforms = Object.entries(scholar.platforms)
        .filter(([, status]) => status !== 'yes')
        .map(([id]) => platformNames.get(id) ?? 'Platform');
      return {
        scholarId: scholar.scholarId,
        name: scholar.name,
        status: scholar.status,
        intendedUniversity: scholar.intendedUniversity,
        intendedCourse: scholar.intendedCourse,
        degreePathway: scholar.degreePathway,
        overdueCount: scholar.overdueCount,
        missingDocumentCount: missingDocuments.length,
        incompletePlatformCount: incompletePlatforms.length,
        missingDocuments,
        incompletePlatforms,
      };
    });

    return buildOverview({
      now,
      scholarStats: {
        total: Number(scholarStageCount[0]?.count ?? 0),
      },
      prepYearCount: prepReport.scholars.filter((scholar) => scholar.status !== 'archived').length,
      prepScholars,
      tasks: taskRows,
      requests: requestRows,
      scholars: scholarRows,
      drafts: draftRows.map((draft) => ({
        ...draft,
        academicYear: toCanonicalAcademicYear(draft.academicYear),
      })),
      followUpDays: inactivityDays(),
    });
  }

  /**
   * Same assignee scope as RequestsService.getRequestStats: super admins see
   * every pending request, other staff see only requests assigned to them.
   * Needs you is only scholars currently in the program. A pending request
   * for an on-hold, inactive, or archived scholar stays in the Requests queue
   * and in the sidebar badge, which does not filter by scholar status.
   */
  private async listPendingRequests(userId: string) {
    const where = [
      eq(requests.archived, false),
      eq(requests.status, 'pending'),
      eq(scholars.status, 'active'),
    ];
    const [staffRecord] = await database.select().from(staff).where(eq(staff.userId, userId));
    if (!staffRecord?.isSuperAdmin) {
      const assignedRequestIds = database
        .select({ requestId: requestAssignees.requestId })
        .from(requestAssignees)
        .where(eq(requestAssignees.userId, userId));
      where.push(inArray(requests.id, assignedRequestIds));
    }

    return database
      .select({
        id: requests.id,
        type: requests.type,
        submittedDate: requests.submittedDate,
        scholarId: requests.scholarId,
        scholarName: users.name,
      })
      .from(requests)
      .innerJoin(scholars, eq(requests.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(and(...where))
      .orderBy(asc(requests.submittedDate));
  }
}
