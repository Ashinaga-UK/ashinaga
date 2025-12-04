import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { Gender } from './update-scholar-profile.dto';

// Custom validator: Date must be in the past
@ValidatorConstraint({ name: 'isPastDate', async: false })
export class IsPastDateConstraint implements ValidatorConstraintInterface {
  validate(value: string, _args: ValidationArguments) {
    if (!value) return true; // Optional field
    const date = new Date(value);
    return date < new Date();
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Date must be in the past';
  }
}

// Custom validator: Date must not be in the past (for passport expiry)
@ValidatorConstraint({ name: 'isNotPastDate', async: false })
export class IsNotPastDateConstraint implements ValidatorConstraintInterface {
  validate(value: string, _args: ValidationArguments) {
    if (!value) return true; // Optional field
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only
    return date >= today;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Date must not be in the past';
  }
}

// Custom validator: Reasonable age (16-80 years)
@ValidatorConstraint({ name: 'isReasonableAge', async: false })
export class IsReasonableAgeConstraint implements ValidatorConstraintInterface {
  validate(value: string, _args: ValidationArguments) {
    if (!value) return true; // Optional field
    const date = new Date(value);
    const today = new Date();
    const age = Math.floor((today.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 16 && age <= 80;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Age must be between 16 and 80 years';
  }
}

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
  @Validate(IsPastDateConstraint)
  @Validate(IsReasonableAgeConstraint)
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\d\s+\-()]*$/, {
    message:
      'Phone number must contain only digits and valid phone characters (+, -, spaces, parentheses)',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string; // Address (Country of Study)

  @IsOptional()
  @IsString()
  addressHomeCountry?: string;

  @IsOptional()
  @IsString()
  @Validate(IsNotPastDateConstraint)
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

  // Academic categorization (matching Insightly)
  @IsOptional()
  @IsString()
  majorCategory?: string;

  @IsOptional()
  @IsString()
  fieldOfStudy?: string;
}
