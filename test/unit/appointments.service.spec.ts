import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';
import { AppointmentsRepository } from '../../src/modules/appointments/appointments.repository';

describe('AppointmentsService', () => {
  const futureStart = '2099-06-01T09:00:00+07:00';

  const customer = { id: 'c1' };
  const vehicle = { id: 'v1', customerId: 'c1' };
  const dealership = { id: 'd1' };
  const serviceType = { id: 's1', durationMinutes: 60 };

  function buildService(overrides?: {
    transactionImpl?: (
      fn: (tx: unknown) => Promise<unknown>,
    ) => Promise<unknown>;
  }) {
    const prisma = {
      customer: { findUnique: jest.fn().mockResolvedValue(customer) },
      vehicle: { findUnique: jest.fn().mockResolvedValue(vehicle) },
      dealership: { findUnique: jest.fn().mockResolvedValue(dealership) },
      serviceType: { findUnique: jest.fn().mockResolvedValue(serviceType) },
      $transaction: jest.fn(
        overrides?.transactionImpl ??
          (async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
      ),
    };

    const repository = {
      findQualifiedActiveTechnicians: jest
        .fn()
        .mockResolvedValue([{ id: 't1' }]),
      findActiveServiceBays: jest.fn().mockResolvedValue([{ id: 'b1' }]),
      findOverlappingConfirmedResourceIds: jest
        .fn()
        .mockResolvedValue({ technicianIds: [], serviceBayIds: [] }),
      createConfirmed: jest.fn().mockResolvedValue({
        id: 'a1',
        status: AppointmentStatus.CONFIRMED,
        customerId: 'c1',
        vehicleId: 'v1',
        dealershipId: 'd1',
        serviceTypeId: 's1',
        technicianId: 't1',
        serviceBayId: 'b1',
        startAt: new Date('2099-06-01T02:00:00.000Z'),
        endAt: new Date('2099-06-01T03:00:00.000Z'),
      }),
      findById: jest.fn(),
    };

    const service = new AppointmentsService(
      prisma as never,
      repository as unknown as AppointmentsRepository,
    );

    return { service, prisma, repository };
  }

  it('creates an appointment when resources are free', async () => {
    const { service, repository } = buildService();
    const result = await service.create({
      customerId: 'c1',
      vehicleId: 'v1',
      dealershipId: 'd1',
      serviceTypeId: 's1',
      startAt: futureStart,
    });

    expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    expect(result.technicianId).toBe('t1');
    expect(result.serviceBayId).toBe('b1');
    expect(repository.createConfirmed).toHaveBeenCalled();
  });

  it('rejects past startAt', async () => {
    const { service } = buildService();
    await expect(
      service.create({
        customerId: 'c1',
        vehicleId: 'v1',
        dealershipId: 'd1',
        serviceTypeId: 's1',
        startAt: '2020-01-01T09:00:00+07:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 when customer is missing', async () => {
    const { service, prisma } = buildService();
    prisma.customer.findUnique.mockResolvedValue(null);
    await expect(
      service.create({
        customerId: 'missing',
        vehicleId: 'v1',
        dealershipId: 'd1',
        serviceTypeId: 's1',
        startAt: futureStart,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 409 when no technician remains', async () => {
    const { service, repository } = buildService();
    repository.findQualifiedActiveTechnicians.mockResolvedValue([]);
    await expect(
      service.create({
        customerId: 'c1',
        vehicleId: 'v1',
        dealershipId: 'd1',
        serviceTypeId: 's1',
        startAt: futureStart,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('retries on exclusion conflict then succeeds with fresh selection', async () => {
    let calls = 0;
    const { service, repository } = buildService({
      transactionImpl: async (fn) => {
        calls += 1;
        if (calls === 1) {
          throw new Error(
            'conflicting key value violates exclusion constraint "appointments_technician_no_overlap" (23P01)',
          );
        }
        return fn({});
      },
    });

    const result = await service.create({
      customerId: 'c1',
      vehicleId: 'v1',
      dealershipId: 'd1',
      serviceTypeId: 's1',
      startAt: futureStart,
    });

    expect(result.id).toBe('a1');
    expect(repository.findQualifiedActiveTechnicians).toHaveBeenCalled();
    expect(calls).toBe(2);
  });

  it('does not map generic errors to conflict', async () => {
    const { service } = buildService({
      transactionImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
    });

    await expect(
      service.create({
        customerId: 'c1',
        vehicleId: 'v1',
        dealershipId: 'd1',
        serviceTypeId: 's1',
        startAt: futureStart,
      }),
    ).rejects.toThrow('ECONNREFUSED');
  });

  it('retries on Prisma P2034 then succeeds with a fresh transaction', async () => {
    let calls = 0;
    const { service, repository } = buildService({
      transactionImpl: async (fn) => {
        calls += 1;
        if (calls === 1) {
          throw new Prisma.PrismaClientKnownRequestError(
            'Transaction failed due to a write conflict or a deadlock',
            { code: 'P2034', clientVersion: '6.0.0' },
          );
        }
        return fn({});
      },
    });

    const result = await service.create({
      customerId: 'c1',
      vehicleId: 'v1',
      dealershipId: 'd1',
      serviceTypeId: 's1',
      startAt: futureStart,
    });

    expect(result.id).toBe('a1');
    expect(calls).toBe(2);
    expect(repository.findQualifiedActiveTechnicians).toHaveBeenCalledTimes(1);
  });

  it('returns 409 after exhausting retries on repeated P2034', async () => {
    const previous = process.env.BOOKING_MAX_RETRIES;
    process.env.BOOKING_MAX_RETRIES = '2';
    try {
      const { service } = buildService({
        transactionImpl: async () => {
          throw new Prisma.PrismaClientKnownRequestError(
            'Transaction failed due to a write conflict or a deadlock',
            { code: 'P2034', clientVersion: '6.0.0' },
          );
        },
      });

      await expect(
        service.create({
          customerId: 'c1',
          vehicleId: 'v1',
          dealershipId: 'd1',
          serviceTypeId: 's1',
          startAt: futureStart,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      if (previous === undefined) {
        delete process.env.BOOKING_MAX_RETRIES;
      } else {
        process.env.BOOKING_MAX_RETRIES = previous;
      }
    }
  });
});
