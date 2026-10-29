import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppointmentStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import {
  futureSlot,
  PostgresTestEnv,
  resetAndSeedMinimal,
  SEED_IDS,
  seedDualResourcePairs,
  seedSingleResourcePair,
  startPostgresTestEnv,
  stopPostgresTestEnv,
} from './postgres-test-env';

describe('Appointments integration (PostgreSQL)', () => {
  let env: PostgresTestEnv;
  let app: INestApplication;
  let httpServer: App;

  beforeAll(async () => {
    env = await startPostgresTestEnv();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer() as App;
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await stopPostgresTestEnv(env);
  });

  beforeEach(async () => {
    await resetAndSeedMinimal(env.prisma);
  });

  function bookingBody(overrides?: Record<string, string>) {
    return {
      customerId: SEED_IDS.customerAlice,
      vehicleId: SEED_IDS.vehicleAliceCivic,
      dealershipId: SEED_IDS.dealershipDowntown,
      serviceTypeId: SEED_IDS.serviceOilChange,
      startAt: futureSlot(72),
      ...overrides,
    };
  }

  it('creates a confirmed appointment with correct relationships', async () => {
    await seedSingleResourcePair(env.prisma);

    const response = await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody())
      .expect(201);

    expect(response.body.status).toBe(AppointmentStatus.CONFIRMED);
    expect(response.body.technicianId).toBe(SEED_IDS.techDowntownOil);
    expect(response.body.serviceBayId).toBe(SEED_IDS.bayDowntown1);
    expect(response.body.customerId).toBe(SEED_IDS.customerAlice);
    expect(response.body.vehicleId).toBe(SEED_IDS.vehicleAliceCivic);

    const stored = await env.prisma.appointment.findUnique({
      where: { id: response.body.id as string },
    });
    expect(stored).not.toBeNull();
    expect(stored?.customerId).toBe(SEED_IDS.customerAlice);
    expect(stored?.vehicleId).toBe(SEED_IDS.vehicleAliceCivic);
  });

  it('allocates only qualified technicians at the dealership', async () => {
    await seedSingleResourcePair(env.prisma);
    await env.prisma.technician.create({
      data: {
        id: SEED_IDS.techDowntownBrake,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Brake only',
        active: true,
        qualifications: {
          create: [{ serviceTypeId: SEED_IDS.serviceBrakePad }],
        },
      },
    });

    const response = await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody())
      .expect(201);

    expect(response.body.technicianId).toBe(SEED_IDS.techDowntownOil);
  });

  it('returns 409 when no qualified technician exists', async () => {
    await env.prisma.serviceBay.create({
      data: {
        id: SEED_IDS.bayDowntown1,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Bay',
        active: true,
      },
    });

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody())
      .expect(409);
  });

  it('returns 409 when no service bay is available', async () => {
    await env.prisma.technician.create({
      data: {
        id: SEED_IDS.techDowntownOil,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Tech',
        active: true,
        qualifications: {
          create: [{ serviceTypeId: SEED_IDS.serviceOilChange }],
        },
      },
    });

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody())
      .expect(409);
  });

  it('rejects booking when technician already booked for overlapping interval', async () => {
    await seedSingleResourcePair(env.prisma);
    const startAt = futureSlot(96);

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt }))
      .expect(201);

    await env.prisma.serviceBay.create({
      data: {
        id: SEED_IDS.bayDowntown2,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Extra Bay',
        active: true,
      },
    });

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt }))
      .expect(409);
  });

  it('rejects booking when service bay already booked for overlapping interval', async () => {
    await seedSingleResourcePair(env.prisma);
    const startAt = futureSlot(100);

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt }))
      .expect(201);

    await env.prisma.technician.create({
      data: {
        id: SEED_IDS.techDowntownMulti,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Extra Tech',
        active: true,
        qualifications: {
          create: [{ serviceTypeId: SEED_IDS.serviceOilChange }],
        },
      },
    });

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt }))
      .expect(409);
  });

  it('allows adjacent half-open appointments sharing resources', async () => {
    await seedSingleResourcePair(env.prisma);
    const firstStart = new Date(Date.now() + 120 * 60 * 60 * 1000);
    firstStart.setMinutes(0, 0, 0);
    const secondStart = new Date(firstStart.getTime() + 60 * 60 * 1000);

    await request(httpServer)
      .post('/api/appointments')
      .send(
        bookingBody({
          startAt: firstStart.toISOString().replace('Z', '+00:00'),
        }),
      )
      .expect(201);

    await request(httpServer)
      .post('/api/appointments')
      .send(
        bookingBody({
          startAt: secondStart.toISOString().replace('Z', '+00:00'),
        }),
      )
      .expect(201);

    const count = await env.prisma.appointment.count({
      where: { status: AppointmentStatus.CONFIRMED },
    });
    expect(count).toBe(2);
  });

  it('detects partial overlaps as conflicts', async () => {
    await seedSingleResourcePair(env.prisma);
    const base = new Date(Date.now() + 130 * 60 * 60 * 1000);
    base.setMinutes(0, 0, 0);
    const overlapping = new Date(base.getTime() + 30 * 60 * 1000);

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt: base.toISOString().replace('Z', '+00:00') }))
      .expect(201);

    await request(httpServer)
      .post('/api/appointments')
      .send(
        bookingBody({
          startAt: overlapping.toISOString().replace('Z', '+00:00'),
        }),
      )
      .expect(409);
  });

  it('respects different service durations when computing endAt', async () => {
    await seedSingleResourcePair(env.prisma);
    await env.prisma.technicianQualification.create({
      data: {
        technicianId: SEED_IDS.techDowntownOil,
        serviceTypeId: SEED_IDS.serviceBrakePad,
      },
    });

    const startAt = futureSlot(140);
    const response = await request(httpServer)
      .post('/api/appointments')
      .send(
        bookingBody({
          serviceTypeId: SEED_IDS.serviceBrakePad,
          startAt,
        }),
      )
      .expect(201);

    const start = new Date(response.body.startAt as string).getTime();
    const end = new Date(response.body.endAt as string).getTime();
    expect(end - start).toBe(90 * 60 * 1000);
  });

  it('enforces exclusion constraints directly at the database', async () => {
    await seedSingleResourcePair(env.prisma);
    const startAt = new Date(Date.now() + 150 * 60 * 60 * 1000);
    startAt.setMinutes(0, 0, 0);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    await env.prisma.appointment.create({
      data: {
        customerId: SEED_IDS.customerAlice,
        vehicleId: SEED_IDS.vehicleAliceCivic,
        dealershipId: SEED_IDS.dealershipDowntown,
        serviceTypeId: SEED_IDS.serviceOilChange,
        technicianId: SEED_IDS.techDowntownOil,
        serviceBayId: SEED_IDS.bayDowntown1,
        startAt,
        endAt,
        status: AppointmentStatus.CONFIRMED,
      },
    });

    await expect(
      env.prisma.appointment.create({
        data: {
          customerId: SEED_IDS.customerAlice,
          vehicleId: SEED_IDS.vehicleAliceCivic,
          dealershipId: SEED_IDS.dealershipDowntown,
          serviceTypeId: SEED_IDS.serviceOilChange,
          technicianId: SEED_IDS.techDowntownOil,
          serviceBayId: SEED_IDS.bayDowntown1,
          startAt: new Date(startAt.getTime() + 15 * 60 * 1000),
          endAt: new Date(endAt.getTime() + 15 * 60 * 1000),
          status: AppointmentStatus.CONFIRMED,
        },
      }),
    ).rejects.toThrow(/exclusion|23P01/i);
  });

  it('rolls back when insert fails inside a transaction', async () => {
    await seedSingleResourcePair(env.prisma);
    const startAt = new Date(Date.now() + 160 * 60 * 60 * 1000);
    startAt.setMinutes(0, 0, 0);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    await expect(
      env.prisma.$transaction(async (tx) => {
        await tx.appointment.create({
          data: {
            customerId: SEED_IDS.customerAlice,
            vehicleId: SEED_IDS.vehicleAliceCivic,
            dealershipId: SEED_IDS.dealershipDowntown,
            serviceTypeId: SEED_IDS.serviceOilChange,
            technicianId: SEED_IDS.techDowntownOil,
            serviceBayId: SEED_IDS.bayDowntown1,
            startAt,
            endAt,
            status: AppointmentStatus.CONFIRMED,
          },
        });
        throw new Error('force_rollback');
      }),
    ).rejects.toThrow('force_rollback');

    const count = await env.prisma.appointment.count();
    expect(count).toBe(0);
  });

  it('allows only one of two concurrent overlapping bookings with a single resource pair', async () => {
    await seedSingleResourcePair(env.prisma);
    const startAt = futureSlot(170);

    const [first, second] = await Promise.all([
      request(httpServer)
        .post('/api/appointments')
        .send(bookingBody({ startAt })),
      request(httpServer)
        .post('/api/appointments')
        .send(bookingBody({ startAt })),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const confirmed = await env.prisma.appointment.count({
      where: { status: AppointmentStatus.CONFIRMED },
    });
    expect(confirmed).toBe(1);
  });

  it('allows concurrent bookings when multiple resource combinations exist', async () => {
    await seedDualResourcePairs(env.prisma);
    const startAt = futureSlot(180);

    const [first, second] = await Promise.all([
      request(httpServer)
        .post('/api/appointments')
        .send(bookingBody({ startAt })),
      request(httpServer)
        .post('/api/appointments')
        .send(bookingBody({ startAt })),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.technicianId).not.toBe(second.body.technicianId);
    expect(first.body.serviceBayId).not.toBe(second.body.serviceBayId);

    const confirmed = await env.prisma.appointment.count({
      where: { status: AppointmentStatus.CONFIRMED },
    });
    expect(confirmed).toBe(2);
  });

  it('returns 409 when only an inactive technician is qualified', async () => {
    await env.prisma.technician.create({
      data: {
        id: SEED_IDS.techDowntownInactive,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Inactive',
        active: false,
        qualifications: {
          create: [{ serviceTypeId: SEED_IDS.serviceOilChange }],
        },
      },
    });
    await env.prisma.serviceBay.create({
      data: {
        id: SEED_IDS.bayDowntown1,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Bay',
        active: true,
      },
    });

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody())
      .expect(409);
  });

  it('returns 409 when only an inactive service bay exists', async () => {
    await env.prisma.technician.create({
      data: {
        id: SEED_IDS.techDowntownOil,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Tech',
        active: true,
        qualifications: {
          create: [{ serviceTypeId: SEED_IDS.serviceOilChange }],
        },
      },
    });
    await env.prisma.serviceBay.create({
      data: {
        id: SEED_IDS.bayDowntownInactive,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Inactive Bay',
        active: false,
      },
    });

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody())
      .expect(409);
  });

  it('does not allocate resources from another dealership', async () => {
    await env.prisma.dealership.create({
      data: {
        id: SEED_IDS.dealershipUptown,
        name: 'Uptown',
        timezone: 'UTC',
      },
    });
    await env.prisma.technician.create({
      data: {
        id: SEED_IDS.techDowntownOil,
        dealershipId: SEED_IDS.dealershipUptown,
        name: 'Uptown Tech',
        active: true,
        qualifications: {
          create: [{ serviceTypeId: SEED_IDS.serviceOilChange }],
        },
      },
    });
    await env.prisma.serviceBay.create({
      data: {
        id: SEED_IDS.bayUptown1,
        dealershipId: SEED_IDS.dealershipUptown,
        name: 'Uptown Bay',
        active: true,
      },
    });

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody())
      .expect(409);
  });

  it('returns 404 when vehicle does not belong to customer', async () => {
    await seedSingleResourcePair(env.prisma);
    await env.prisma.customer.create({
      data: {
        id: SEED_IDS.customerBob,
        name: 'Bob',
        email: 'bob@example.com',
      },
    });
    await env.prisma.vehicle.create({
      data: {
        id: SEED_IDS.vehicleBobCamry,
        customerId: SEED_IDS.customerBob,
        vin: 'VINBOB1',
        make: 'Toyota',
        model: 'Camry',
      },
    });

    await request(httpServer)
      .post('/api/appointments')
      .send(
        bookingBody({
          customerId: SEED_IDS.customerAlice,
          vehicleId: SEED_IDS.vehicleBobCamry,
        }),
      )
      .expect(404);
  });

  it('returns 404 for missing referenced entities', async () => {
    await seedSingleResourcePair(env.prisma);

    await request(httpServer)
      .post('/api/appointments')
      .send(
        bookingBody({
          customerId: '99999999-9999-4999-8999-999999999999',
        }),
      )
      .expect(404);
  });

  it('returns 400 for startAt without timezone offset', async () => {
    await seedSingleResourcePair(env.prisma);

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt: '2099-06-01T09:00:00' }))
      .expect(400);

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt: '2099-06-01' }))
      .expect(400);
  });

  it('returns 400 for impossible calendar dates even with a valid offset', async () => {
    await seedSingleResourcePair(env.prisma);

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt: '2099-02-30T09:00:00+07:00' }))
      .expect(400);

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt: '2099-04-31T09:00:00Z' }))
      .expect(400);

    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt: '2099-02-29T09:00:00Z' })) // 2099 is not a leap year
      .expect(400);

    // Leap-day in a leap year remains valid (far future).
    await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt: '2104-02-29T09:00:00Z' }))
      .expect(201);
  });

  it('availability rejects past and impossible calendar startAt with 400', async () => {
    await seedSingleResourcePair(env.prisma);

    await request(httpServer)
      .get('/api/availability')
      .query({
        dealershipId: SEED_IDS.dealershipDowntown,
        serviceTypeId: SEED_IDS.serviceOilChange,
        startAt: '2020-01-01T09:00:00Z',
      })
      .expect(400);

    await request(httpServer)
      .get('/api/availability')
      .query({
        dealershipId: SEED_IDS.dealershipDowntown,
        serviceTypeId: SEED_IDS.serviceOilChange,
        startAt: '2099-02-30T09:00:00+07:00',
      })
      .expect(400);
  });

  it('enforces CHECK end_at > start_at at the database', async () => {
    await seedSingleResourcePair(env.prisma);
    const startAt = new Date(Date.now() + 200 * 60 * 60 * 1000);

    await expect(
      env.prisma.appointment.create({
        data: {
          customerId: SEED_IDS.customerAlice,
          vehicleId: SEED_IDS.vehicleAliceCivic,
          dealershipId: SEED_IDS.dealershipDowntown,
          serviceTypeId: SEED_IDS.serviceOilChange,
          technicianId: SEED_IDS.techDowntownOil,
          serviceBayId: SEED_IDS.bayDowntown1,
          startAt,
          endAt: startAt,
          status: AppointmentStatus.CONFIRMED,
        },
      }),
    ).rejects.toThrow();
  });

  it('enforces CHECK duration_minutes > 0 at the database', async () => {
    await expect(
      env.prisma.serviceType.create({
        data: {
          id: '44444444-4444-4444-8444-444444444499',
          name: 'Invalid Zero Duration',
          durationMinutes: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it('does not delete appointments when demo fixtures are re-seeded', async () => {
    await seedSingleResourcePair(env.prisma);
    const created = await request(httpServer)
      .post('/api/appointments')
      .send(bookingBody({ startAt: futureSlot(210) }))
      .expect(201);

    // Simulate non-destructive seed upsert of a dealership fixture.
    await env.prisma.dealership.upsert({
      where: { id: SEED_IDS.dealershipDowntown },
      update: { name: 'Downtown Reseeded' },
      create: {
        id: SEED_IDS.dealershipDowntown,
        name: 'Downtown Reseeded',
        timezone: 'UTC',
      },
    });

    const stillThere = await env.prisma.appointment.findUnique({
      where: { id: created.body.id as string },
    });
    expect(stillThere).not.toBeNull();
  });
});
