import { Prisma } from '@prisma/client';

/** PostgreSQL exclusion_violation */
export const PG_EXCLUSION_VIOLATION = '23P01';

/** PostgreSQL deadlock_detected */
export const PG_DEADLOCK = '40P01';

/** PostgreSQL serialization_failure */
export const PG_SERIALIZATION_FAILURE = '40001';

/**
 * Prisma client code for write conflicts / deadlocks during interactive transactions.
 * @see https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions
 */
export const PRISMA_TRANSACTION_CONFLICT = 'P2034';

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function getPostgresErrorCode(error: unknown): string | undefined {
  if (isPrismaKnownRequestError(error)) {
    const meta = error.meta as { code?: string } | undefined;
    if (meta?.code) {
      return meta.code;
    }
  }

  const match = /\b(23P01|40P01|40001)\b/.exec(errorMessage(error));
  return match?.[1];
}

/**
 * Returns true only for well-defined transient resource conflicts / serialization issues.
 * Generic database failures must NOT map to HTTP 409.
 */
export function isTransientBookingConflict(error: unknown): boolean {
  // Prisma-known transaction write conflict / deadlock (retry whole transaction).
  if (
    isPrismaKnownRequestError(error) &&
    error.code === PRISMA_TRANSACTION_CONFLICT
  ) {
    return true;
  }

  const pgCode = getPostgresErrorCode(error);
  if (
    pgCode === PG_EXCLUSION_VIOLATION ||
    pgCode === PG_DEADLOCK ||
    pgCode === PG_SERIALIZATION_FAILURE
  ) {
    return true;
  }

  const message = errorMessage(error).toLowerCase();
  if (
    message.includes('appointments_technician_no_overlap') ||
    message.includes('appointments_service_bay_no_overlap') ||
    message.includes('exclusion constraint') ||
    message.includes('conflicting key value violates exclusion')
  ) {
    return true;
  }

  return false;
}
