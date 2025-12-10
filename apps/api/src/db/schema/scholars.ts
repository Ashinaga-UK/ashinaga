import { pgEnum, pgTable, text, timestamp, uuid, date } from 'drizzle-orm/pg-core';
import { users } from './users';

export const scholarStatusEnum = pgEnum('scholar_status', ['active', 'inactive', 'on_hold']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'prefer_not_to_say']);

export const scholars = pgTable('scholars', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),

  // Existing fields (keeping names unchanged)
  phone: text('phone'),
  program: text('program').notNull(), // Will be displayed as "Program of Study" on frontend
  year: text('year').notNull(), // Will be displayed as "Academic Year" on frontend
  university: text('university').notNull(),
  location: text('location'), // Will be displayed as "Address (Country of Study)" on frontend
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  status: scholarStatusEnum('status').notNull().default('active'),
  lastActivity: timestamp('last_activity', { withTimezone: true }),
  bio: text('bio'),

  // New fields - Scholar Identifier (locked field)
  aaiScholarId: text('aai_scholar_id').unique(),

  // New fields - Personal Information
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  nationality: text('nationality'),

  // New fields - Address Information
  addressHomeCountry: text('address_home_country'),

  // New fields - Document Information
  passportExpirationDate: date('passport_expiration_date'),
  visaExpirationDate: date('visa_expiration_date'),

  // New fields - Emergency Contacts (storing as JSON for name, email, phone)
  emergencyContactCountryOfStudy: text('emergency_contact_country_of_study'),
  emergencyContactHomeCountry: text('emergency_contact_home_country'),

  // New fields - Academic Information
  graduationDate: timestamp('graduation_date', { withTimezone: true }),
  universityId: text('university_id'),

  // New fields - Additional Information
  dietaryInformation: text('dietary_information'),
  kokorozashi: text('kokorozashi'),
  longTermCareerPlan: text('long_term_career_plan'),
  postGraduationPlan: text('post_graduation_plan'),

  // New fields - Academic categorization (matching Insightly)
  majorCategory: text('major_category'), // Business-Related, Engineering and Technology, etc.
  fieldOfStudy: text('field_of_study'), // Computer Science, Medicine, etc.

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
