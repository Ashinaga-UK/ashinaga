import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export class UpdateScholarProfileDto {
  // Note: These fields are locked and cannot be updated by the scholar
  // - name (from users table)
  // - email (from users table)
  // - aaiScholarId

  // Personal Information
  @IsOptional()
  @IsString() // Changed from @IsDateString() to allow empty strings
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Address Information
  @IsOptional()
  @IsString()
  location?: string; // Address (Country of Study)

  @IsOptional()
  @IsString()
  addressHomeCountry?: string;

  // Document Information
  @IsOptional()
  @IsString() // Changed from @IsDateString() to allow empty strings
  passportExpirationDate?: string;

  @IsOptional()
  @IsString() // Changed from @IsDateString() to allow empty strings
  visaExpirationDate?: string;

  // Emergency Contacts (JSON string with name, email, phone)
  @IsOptional()
  @IsString()
  emergencyContactCountryOfStudy?: string;

  @IsOptional()
  @IsString()
  emergencyContactHomeCountry?: string;

  // Academic Information
  @IsOptional()
  @IsString()
  program?: string; // Program of Study (text field now)

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  year?: string; // Academic Year

  @IsOptional()
  @IsString() // Changed from @IsDateString() to allow empty strings
  startDate?: string;

  @IsOptional()
  @IsString() // Changed from @IsDateString() to allow empty strings
  graduationDate?: string;

  @IsOptional()
  @IsString()
  universityId?: string;

  // Additional Information
  @IsOptional()
  @IsString()
  dietaryInformation?: string;

  @IsOptional()
  @IsString()
  kokorozashi?: string;

  @IsOptional()
  @IsString()
  longTermCareerPlan?: string;

  @IsOptional()
  @IsString()
  postGraduationPlan?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
