import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Gender } from './update-scholar-profile.dto';

export class CreateScholarDto {
  // Basic required information
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  // Optional profile fields
  @IsOptional()
  @IsString()
  aaiScholarId?: string;

  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsString()
  location?: string; // Address (Country of Study)

  @IsOptional()
  @IsString()
  addressHomeCountry?: string;

  @IsOptional()
  @IsString()
  passportExpirationDate?: string;

  @IsOptional()
  @IsString()
  visaExpirationDate?: string;

  @IsOptional()
  @IsString()
  emergencyContactCountryOfStudy?: string;

  @IsOptional()
  @IsString()
  emergencyContactHomeCountry?: string;

  @IsOptional()
  @IsString()
  graduationDate?: string;

  @IsOptional()
  @IsString()
  universityId?: string;

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
