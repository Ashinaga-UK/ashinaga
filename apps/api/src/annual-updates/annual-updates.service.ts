import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { annualUpdates } from '../db/schema/annual-updates';
import { scholars } from '../db/schema/scholars';
import { users } from '../db/schema/users';
import { escapeCsvValue } from '../utils/csv';
import { UpsertAnnualUpdateDto } from './dto/upsert-annual-update.dto';

const LIMITED_RESPONSE_WORD_LIMIT = 150;
type AnnualUpdate = typeof annualUpdates.$inferSelect;

@Injectable()
export class AnnualUpdatesService {
  private db = getDatabase();

  async getAnnualUpdatesReport() {
    const rows = await this.db
      .select({
        id: annualUpdates.id,
        scholarId: annualUpdates.scholarId,
        academicYear: annualUpdates.academicYear,
        status: annualUpdates.status,
        submittedAt: annualUpdates.submittedAt,
        updatedAt: annualUpdates.updatedAt,
        scholarName: users.name,
        scholarEmail: users.email,
        aaiScholarId: scholars.aaiScholarId,
        scholarYear: scholars.year,
        university: scholars.university,
      })
      .from(annualUpdates)
      .innerJoin(scholars, eq(annualUpdates.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .orderBy(desc(annualUpdates.createdAt));

    return rows;
  }

  async getMyAnnualUpdate(userId: string, academicYear?: string) {
    const scholar = await this.getScholarForUser(userId);

    const query = this.db
      .select()
      .from(annualUpdates)
      .where(
        academicYear
          ? and(
              eq(annualUpdates.scholarId, scholar.id),
              eq(annualUpdates.academicYear, academicYear)
            )
          : eq(annualUpdates.scholarId, scholar.id)
      )
      .orderBy(desc(annualUpdates.createdAt));

    const [annualUpdate] = await query.limit(1);
    return annualUpdate ?? null;
  }

  async getMyDraftAnnualUpdate(userId: string) {
    const scholar = await this.getScholarForUser(userId);

    const [annualUpdate] = await this.db
      .select()
      .from(annualUpdates)
      .where(and(eq(annualUpdates.scholarId, scholar.id), eq(annualUpdates.status, 'draft')))
      .orderBy(desc(annualUpdates.updatedAt))
      .limit(1);

    return annualUpdate ?? null;
  }

  async getAnnualUpdatesForScholar(scholarId: string) {
    const rows = await this.db
      .select()
      .from(annualUpdates)
      .where(eq(annualUpdates.scholarId, scholarId))
      .orderBy(desc(annualUpdates.createdAt));

    return rows.map((annualUpdate) => this.hideDraftAnswersForStaff(annualUpdate));
  }

  async exportAnnualUpdatesCsv(scholarId?: string, annualUpdateIds?: string[]): Promise<string> {
    const rows =
      annualUpdateIds?.length === 0
        ? []
        : await this.getAnnualUpdatesReportRows(scholarId, annualUpdateIds);

    const headers = [
      'Scholar Name',
      'Scholar Email',
      'AAI Scholar ID',
      'Program',
      'Scholar Year',
      'University',
      'Location',
      'Academic Year',
      'Review Status',
      'Submitted At',
      'Last Updated At',
      'Highlights',
      'Part-Time Jobs',
      'Extracurriculars',
      'Leadership Roles Description',
      'Leadership Roles Count',
      'Pay It Forward Description',
      'Pay It Forward Count',
      'Sub-Saharan Africa Activities Description',
      'Sub-Saharan Africa Activities Count',
      'Independent Internships Count',
      'Internships In Africa Summary',
      'Internships Outside Africa Summary',
      'Completed Ashinaga 8-Week Internship In Sub-Saharan Africa',
      'Academic Year Average Classification',
      'Academic Year Weighted Grade',
    ];

    const csvRows = [headers.map((header) => escapeCsvValue(header)).join(',')];

    for (const row of rows) {
      const annualUpdate = this.hideDraftAnswersForStaff(row.annualUpdate);
      csvRows.push(
        [
          row.scholarName,
          row.scholarEmail,
          row.aaiScholarId,
          row.program,
          row.year,
          row.university,
          row.location,
          annualUpdate.academicYear,
          annualUpdate.status,
          this.formatCsvDate(annualUpdate.submittedAt),
          this.formatCsvDate(annualUpdate.updatedAt),
          annualUpdate.highlights,
          annualUpdate.partTimeJobs,
          annualUpdate.extracurriculars,
          annualUpdate.leadershipRolesDescription,
          annualUpdate.leadershipRolesCount,
          annualUpdate.payItForwardDescription,
          annualUpdate.payItForwardCount,
          annualUpdate.subSaharanAfricaActivitiesDescription,
          annualUpdate.subSaharanAfricaActivitiesCount,
          annualUpdate.independentInternshipsCount,
          annualUpdate.internshipsInAfricaSummary,
          annualUpdate.internshipsElsewhereSummary,
          this.formatCsvBoolean(annualUpdate.completedAshinagaAfricaInternship),
          annualUpdate.academicYearAverageClassification,
          annualUpdate.academicYearWeightedGrade,
        ]
          .map((value) => escapeCsvValue(value))
          .join(',')
      );
    }

    return csvRows.join('\n');
  }

  private getAnnualUpdatesReportFilters(scholarId?: string, annualUpdateIds?: string[]) {
    return [
      scholarId ? eq(annualUpdates.scholarId, scholarId) : undefined,
      annualUpdateIds ? inArray(annualUpdates.id, annualUpdateIds) : undefined,
    ].filter((filter) => filter !== undefined);
  }

  private getAnnualUpdatesReportRows(scholarId?: string, annualUpdateIds?: string[]) {
    const filters = this.getAnnualUpdatesReportFilters(scholarId, annualUpdateIds);

    return this.db
      .select({
        annualUpdate: annualUpdates,
        scholarName: users.name,
        scholarEmail: users.email,
        aaiScholarId: scholars.aaiScholarId,
        program: scholars.program,
        year: scholars.year,
        university: scholars.university,
        location: scholars.location,
      })
      .from(annualUpdates)
      .innerJoin(scholars, eq(annualUpdates.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(annualUpdates.createdAt));
  }

  private hideDraftAnswersForStaff(annualUpdate: AnnualUpdate): AnnualUpdate {
    if (annualUpdate.status === 'submitted') {
      return annualUpdate;
    }

    return {
      ...annualUpdate,
      highlights: null,
      partTimeJobs: null,
      extracurriculars: null,
      leadershipRolesDescription: null,
      leadershipRolesCount: null,
      payItForwardDescription: null,
      payItForwardCount: null,
      subSaharanAfricaActivitiesDescription: null,
      subSaharanAfricaActivitiesCount: null,
      independentInternshipsCount: null,
      internshipsInAfricaSummary: null,
      internshipsElsewhereSummary: null,
      completedAshinagaAfricaInternship: null,
      academicYearAverageClassification: null,
      academicYearWeightedGrade: null,
    };
  }

  async saveDraft(userId: string, dto: UpsertAnnualUpdateDto) {
    const scholar = await this.getScholarForUser(userId);
    this.validateWordLimits(dto);

    return this.upsertAnnualUpdate(scholar.id, dto, 'draft');
  }

  async submit(userId: string, dto: UpsertAnnualUpdateDto) {
    const scholar = await this.getScholarForUser(userId);
    this.validateRequiredFields(dto);
    this.validateWordLimits(dto);

    return this.upsertAnnualUpdate(scholar.id, dto, 'submitted');
  }

  private async upsertAnnualUpdate(
    scholarId: string,
    dto: UpsertAnnualUpdateDto,
    status: 'draft' | 'submitted'
  ) {
    const now = new Date();
    const values = {
      ...this.toAnnualUpdateValues(dto),
      scholarId,
      academicYear: dto.academicYear,
      status,
      submittedAt: status === 'submitted' ? now : null,
      updatedAt: now,
    };

    const [annualUpdate] = await this.db
      .insert(annualUpdates)
      .values(values)
      .onConflictDoUpdate({
        target: [annualUpdates.scholarId, annualUpdates.academicYear],
        set: values,
        setWhere: ne(annualUpdates.status, 'submitted'),
      })
      .returning();

    if (!annualUpdate) {
      throw new ConflictException('This annual review has already been submitted and is final.');
    }

    return annualUpdate;
  }

  private async getScholarForUser(userId: string) {
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      throw new NotFoundException('Scholar not found for this user');
    }

    return scholar;
  }

  private toAnnualUpdateValues(dto: UpsertAnnualUpdateDto) {
    return {
      highlights: dto.highlights ?? null,
      partTimeJobs: dto.partTimeJobs ?? null,
      extracurriculars: dto.extracurriculars ?? null,
      leadershipRolesDescription: dto.leadershipRolesDescription ?? null,
      leadershipRolesCount: dto.leadershipRolesCount ?? null,
      payItForwardDescription: dto.payItForwardDescription ?? null,
      payItForwardCount: dto.payItForwardCount ?? null,
      subSaharanAfricaActivitiesDescription: dto.subSaharanAfricaActivitiesDescription ?? null,
      subSaharanAfricaActivitiesCount: dto.subSaharanAfricaActivitiesCount ?? null,
      independentInternshipsCount: dto.independentInternshipsCount ?? null,
      internshipsInAfricaSummary: dto.internshipsInAfricaSummary ?? null,
      internshipsElsewhereSummary: dto.internshipsElsewhereSummary ?? null,
      completedAshinagaAfricaInternship: dto.completedAshinagaAfricaInternship ?? null,
      academicYearAverageClassification: dto.academicYearAverageClassification ?? null,
      academicYearWeightedGrade: dto.academicYearWeightedGrade ?? null,
    };
  }

  private validateRequiredFields(dto: UpsertAnnualUpdateDto) {
    const missingFields: string[] = [];

    const requireText = (value: string | undefined, label: string) => {
      if (!value?.trim()) {
        missingFields.push(label);
      }
    };

    const requireNumber = (value: number | undefined, label: string) => {
      if (value === undefined || value === null || !Number.isFinite(value)) {
        missingFields.push(label);
      }
    };

    requireText(dto.academicYear, 'Academic year');
    requireText(dto.highlights, 'Highlights');
    requireText(dto.partTimeJobs, 'Part-time jobs');
    requireText(dto.extracurriculars, 'Extracurriculars');
    requireText(dto.leadershipRolesDescription, 'Leadership roles description');
    requireNumber(dto.leadershipRolesCount, 'Number of leadership roles');
    requireText(dto.payItForwardDescription, 'Pay-it-forward description');
    requireNumber(dto.payItForwardCount, 'Number of pay-it-forward activities');
    requireText(dto.subSaharanAfricaActivitiesDescription, 'Sub-Saharan Africa-related activities');
    requireNumber(
      dto.subSaharanAfricaActivitiesCount,
      'Number of sub-Saharan Africa-related activities'
    );
    requireNumber(dto.independentInternshipsCount, 'Number of independently secured internships');
    requireText(dto.internshipsInAfricaSummary, 'Internships in Africa summary');
    requireText(dto.internshipsElsewhereSummary, 'Internships outside Africa summary');
    if (dto.completedAshinagaAfricaInternship == null) {
      missingFields.push('Ashinaga 8-week internship answer');
    }
    requireText(dto.academicYearAverageClassification, 'Academic year average classification');
    requireText(dto.academicYearWeightedGrade, 'Academic year weighted grade');

    if (missingFields.length > 0) {
      throw new BadRequestException({
        message: 'Please complete all required fields before submitting.',
        missingFields,
      });
    }
  }

  private validateWordLimits(dto: UpsertAnnualUpdateDto) {
    const overLimitFields: string[] = [];

    const requireWordLimit = (value: string | undefined, label: string) => {
      if (value && this.countWords(value) > LIMITED_RESPONSE_WORD_LIMIT) {
        overLimitFields.push(label);
      }
    };

    requireWordLimit(dto.leadershipRolesDescription, 'Leadership roles description');
    requireWordLimit(dto.payItForwardDescription, 'Pay-it-forward description');
    requireWordLimit(
      dto.subSaharanAfricaActivitiesDescription,
      'Sub-Saharan Africa-related activities'
    );

    if (overLimitFields.length > 0) {
      throw new BadRequestException({
        message: `Please keep each limited response within ${LIMITED_RESPONSE_WORD_LIMIT} words.`,
        overLimitFields,
      });
    }
  }

  private countWords(value: string) {
    return value.trim().split(/\s+/).filter(Boolean).length;
  }

  private formatCsvDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London' }).format(new Date(value));
  }

  private formatCsvBoolean(value: boolean | null): string {
    if (value === null) return '';
    return value ? 'Yes' : 'No';
  }
}
