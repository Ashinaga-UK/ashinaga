import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { annualUpdates } from '../db/schema/annual-updates';
import { scholars } from '../db/schema/scholars';
import { UpsertAnnualUpdateDto } from './dto/upsert-annual-update.dto';

@Injectable()
export class AnnualUpdatesService {
  private db = getDatabase();

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

  async getAnnualUpdatesForScholar(scholarId: string) {
    return this.db
      .select()
      .from(annualUpdates)
      .where(eq(annualUpdates.scholarId, scholarId))
      .orderBy(desc(annualUpdates.createdAt));
  }

  async saveDraft(userId: string, dto: UpsertAnnualUpdateDto) {
    const scholar = await this.getScholarForUser(userId);
    const existing = await this.getAnnualUpdateForScholar(scholar.id, dto.academicYear);

    if (existing?.status === 'submitted') {
      throw new ConflictException('This annual review has already been submitted and is final.');
    }

    const values = {
      ...this.toAnnualUpdateValues(dto),
      scholarId: scholar.id,
      academicYear: dto.academicYear,
      status: 'draft' as const,
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await this.db
        .update(annualUpdates)
        .set(values)
        .where(eq(annualUpdates.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db.insert(annualUpdates).values(values).returning();
    return created;
  }

  async submit(userId: string, dto: UpsertAnnualUpdateDto) {
    const scholar = await this.getScholarForUser(userId);
    const existing = await this.getAnnualUpdateForScholar(scholar.id, dto.academicYear);

    if (existing?.status === 'submitted') {
      throw new ConflictException('This annual review has already been submitted and is final.');
    }

    this.validateRequiredFields(dto);

    const values = {
      ...this.toAnnualUpdateValues(dto),
      scholarId: scholar.id,
      academicYear: dto.academicYear,
      status: 'submitted' as const,
      submittedAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await this.db
        .update(annualUpdates)
        .set(values)
        .where(eq(annualUpdates.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db.insert(annualUpdates).values(values).returning();
    return created;
  }

  private async getScholarForUser(userId: string) {
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      throw new NotFoundException('Scholar not found for this user');
    }

    return scholar;
  }

  private async getAnnualUpdateForScholar(scholarId: string, academicYear: string) {
    const [annualUpdate] = await this.db
      .select()
      .from(annualUpdates)
      .where(
        and(eq(annualUpdates.scholarId, scholarId), eq(annualUpdates.academicYear, academicYear))
      );

    return annualUpdate;
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
    if (dto.completedAshinagaAfricaInternship === undefined) {
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
}
