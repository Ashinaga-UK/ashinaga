import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { scholars } from './scholars';

export const annualUpdateStatusEnum = pgEnum('annual_update_status', ['draft', 'submitted']);

export const annualUpdates = pgTable(
  'annual_updates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scholarId: uuid('scholar_id')
      .notNull()
      .references(() => scholars.id, { onDelete: 'cascade' }),
    academicYear: text('academic_year').notNull(),
    status: annualUpdateStatusEnum('status').notNull().default('draft'),
    highlights: text('highlights'),
    partTimeJobs: text('part_time_jobs'),
    extracurriculars: text('extracurriculars'),
    leadershipRolesDescription: text('leadership_roles_description'),
    leadershipRolesCount: integer('leadership_roles_count'),
    payItForwardDescription: text('pay_it_forward_description'),
    payItForwardCount: integer('pay_it_forward_count'),
    subSaharanAfricaActivitiesDescription: text('sub_saharan_africa_activities_description'),
    subSaharanAfricaActivitiesCount: integer('sub_saharan_africa_activities_count'),
    independentInternshipsCount: integer('independent_internships_count'),
    internshipsInAfricaSummary: text('internships_in_africa_summary'),
    internshipsElsewhereSummary: text('internships_elsewhere_summary'),
    completedAshinagaAfricaInternship: boolean('completed_ashinaga_africa_internship'),
    academicYearAverageClassification: text('academic_year_average_classification'),
    academicYearWeightedGrade: text('academic_year_weighted_grade'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    scholarAcademicYearUnique: uniqueIndex('annual_updates_scholar_academic_year_unique').on(
      table.scholarId,
      table.academicYear
    ),
  })
);
