import { registerDecorator, type ValidationOptions } from 'class-validator';
import { isValidAcademicYear } from '../academic-year';

export function IsConsecutiveAcademicYear(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isConsecutiveAcademicYear',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidAcademicYear(value);
        },
        defaultMessage() {
          return 'academicYear must be a consecutive teaching year in YYYY/YYYY or YYYY/YY format';
        },
      },
    });
  };
}
