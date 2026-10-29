import {
  isISO8601,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Requires an ISO 8601 date-time with an explicit UTC offset:
 * trailing Z / z, or ±HH:MM / ±HHMM.
 * Rejects date-only values, naive local times without offset, and
 * impossible calendar dates (e.g. 2026-02-30) that JS Date would normalize.
 */
const ISO8601_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/i;

@ValidatorConstraint({ name: 'isIso8601WithOffset', async: false })
export class IsIso8601WithOffsetConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    if (!ISO8601_WITH_OFFSET.test(value)) {
      return false;
    }
    // Strict calendar validation (rejects Feb 30, Apr 31, non-leap Feb 29, etc.)
    if (!isISO8601(value, { strict: true, strictSeparator: true })) {
      return false;
    }
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  }

  defaultMessage(): string {
    return 'must be a real ISO 8601 calendar date-time with an explicit timezone offset (Z or ±HH:MM)';
  }
}

export function IsIso8601WithOffset(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsIso8601WithOffsetConstraint,
    });
  };
}
