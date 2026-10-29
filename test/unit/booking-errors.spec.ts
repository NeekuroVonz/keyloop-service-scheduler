import { Prisma } from '@prisma/client';
import { isTransientBookingConflict } from '../../src/modules/appointments/booking-errors';

describe('booking-errors', () => {
  it('treats exclusion violations as transient conflicts', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'conflicting key value violates exclusion constraint "appointments_technician_no_overlap"',
      { code: 'P2010', clientVersion: '6.0.0', meta: { code: '23P01' } },
    );
    expect(isTransientBookingConflict(error)).toBe(true);
  });

  it('treats Prisma P2034 transaction conflicts as transient', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Transaction failed due to a write conflict or a deadlock',
      { code: 'P2034', clientVersion: '6.0.0' },
    );
    expect(isTransientBookingConflict(error)).toBe(true);
  });

  it('treats deadlocks as transient', () => {
    const error = new Error('deadlock detected Code: 40P01');
    expect(isTransientBookingConflict(error)).toBe(true);
  });

  it('does not treat unrelated Prisma errors as conflicts', () => {
    const notFound = new Prisma.PrismaClientKnownRequestError(
      'Record to update not found.',
      { code: 'P2025', clientVersion: '6.0.0' },
    );
    expect(isTransientBookingConflict(notFound)).toBe(false);

    const unreachable = new Prisma.PrismaClientKnownRequestError(
      'Connection reset',
      {
        code: 'P1001',
        clientVersion: '6.0.0',
      },
    );
    expect(isTransientBookingConflict(unreachable)).toBe(false);

    expect(isTransientBookingConflict(new Error('ECONNREFUSED'))).toBe(false);
  });
});
