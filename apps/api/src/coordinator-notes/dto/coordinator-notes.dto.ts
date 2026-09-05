import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const COORDINATOR_TEXT_MAX_LENGTH = 10_000;

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

@ValidatorConstraint({ name: 'atLeastOneMeetingField', async: false })
export class AtLeastOneMeetingFieldConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const object = args.object as {
      notes?: string;
      concern?: string;
      furtherAction?: string;
    };
    return hasText(object.notes) || hasText(object.concern) || hasText(object.furtherAction);
  }

  defaultMessage() {
    return 'At least one of notes, concern, or furtherAction is required';
  }
}

export function AtLeastOneMeetingField(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: AtLeastOneMeetingFieldConstraint,
    });
  };
}

export class CreateCoordinatorNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(COORDINATOR_TEXT_MAX_LENGTH)
  body: string;
}

export class UpdateCoordinatorNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(COORDINATOR_TEXT_MAX_LENGTH)
  body: string;
}

export class CreateMeetingUpdateDto {
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: 'meetingDate must be YYYY-MM-DD' })
  @AtLeastOneMeetingField()
  meetingDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(COORDINATOR_TEXT_MAX_LENGTH)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(COORDINATOR_TEXT_MAX_LENGTH)
  concern?: string;

  @IsOptional()
  @IsString()
  @MaxLength(COORDINATOR_TEXT_MAX_LENGTH)
  furtherAction?: string;
}

export class UpdateMeetingUpdateDto {
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: 'meetingDate must be YYYY-MM-DD' })
  meetingDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(COORDINATOR_TEXT_MAX_LENGTH)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(COORDINATOR_TEXT_MAX_LENGTH)
  concern?: string;

  @IsOptional()
  @IsString()
  @MaxLength(COORDINATOR_TEXT_MAX_LENGTH)
  furtherAction?: string;
}
