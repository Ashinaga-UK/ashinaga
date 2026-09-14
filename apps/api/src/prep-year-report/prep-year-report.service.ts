import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import {
  platforms,
  requiredDocumentFiles,
  requiredDocumentTypes,
  scholarPlatformSetups,
  scholars,
  tasks,
  users,
} from '../db/schema';
import { GetPrepYearReportQueryDto } from './dto/get-prep-year-report-query.dto';
import {
  buildPrepYearReport,
  type PrepYearPlatformStatus,
  type PrepYearReportPayload,
  type PrepYearReportScholarStatus,
  type PrepYearReportTaskStatus,
  prepYearReportToCsv,
} from './prep-year-report';

@Injectable()
export class PrepYearReportService {
  private get db() {
    return getDatabase();
  }

  async getReport(query: GetPrepYearReportQueryDto = {}): Promise<PrepYearReportPayload> {
    const [documentTypes, activePlatforms, prepScholars] = await Promise.all([
      this.db
        .select({
          id: requiredDocumentTypes.id,
          slug: requiredDocumentTypes.slug,
          label: requiredDocumentTypes.label,
        })
        .from(requiredDocumentTypes)
        .where(eq(requiredDocumentTypes.isActive, true))
        .orderBy(asc(requiredDocumentTypes.sortOrder), asc(requiredDocumentTypes.label)),
      this.db
        .select({
          id: platforms.id,
          slug: platforms.slug,
          name: platforms.name,
        })
        .from(platforms)
        .where(eq(platforms.isActive, true))
        .orderBy(asc(platforms.sortOrder)),
      this.db
        .select({
          scholarId: scholars.id,
          name: users.name,
          email: users.email,
          status: scholars.status,
          intendedUniversity: scholars.intendedUniversity,
          intendedCourse: scholars.intendedCourse,
          degreePathway: scholars.degreePathway,
        })
        .from(scholars)
        .innerJoin(users, eq(scholars.userId, users.id))
        .where(eq(scholars.programStage, 'prep_year'))
        .orderBy(asc(users.name)),
    ]);

    const scholarIds = prepScholars.map((row) => row.scholarId);
    const [documentFiles, platformSetups, taskRows] =
      scholarIds.length === 0
        ? [[], [], []]
        : await Promise.all([
            this.db
              .select({
                scholarId: requiredDocumentFiles.scholarId,
                typeId: requiredDocumentFiles.typeId,
              })
              .from(requiredDocumentFiles)
              .where(inArray(requiredDocumentFiles.scholarId, scholarIds)),
            this.db
              .select({
                scholarId: scholarPlatformSetups.scholarId,
                platformId: scholarPlatformSetups.platformId,
                status: scholarPlatformSetups.status,
              })
              .from(scholarPlatformSetups)
              .where(inArray(scholarPlatformSetups.scholarId, scholarIds)),
            this.db
              .select({
                scholarId: tasks.scholarId,
                phase: tasks.phase,
                dueDate: tasks.dueDate,
                status: tasks.status,
              })
              .from(tasks)
              .where(and(inArray(tasks.scholarId, scholarIds), isNull(tasks.deletedAt))),
          ]);

    return buildPrepYearReport(
      prepScholars.map((row) => ({
        ...row,
        status: row.status as PrepYearReportScholarStatus,
      })),
      documentTypes,
      documentFiles,
      activePlatforms,
      platformSetups.map((row) => ({
        ...row,
        status: row.status as PrepYearPlatformStatus,
      })),
      taskRows.map((row) => ({
        ...row,
        status: row.status as PrepYearReportTaskStatus,
      })),
      {
        scholarId: query.scholarId,
        phase: query.phase,
      }
    );
  }

  async exportCsv(query: GetPrepYearReportQueryDto = {}): Promise<string> {
    const report = await this.getReport(query);
    return prepYearReportToCsv(report);
  }
}
