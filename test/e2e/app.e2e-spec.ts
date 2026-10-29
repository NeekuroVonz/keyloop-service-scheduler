import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import {
  futureSlot,
  PostgresTestEnv,
  resetAndSeedMinimal,
  SEED_IDS,
  seedSingleResourcePair,
  startPostgresTestEnv,
  stopPostgresTestEnv,
} from '../integration/postgres-test-env';

describe('App e2e', () => {
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

  it('health check succeeds', async () => {
    const response = await request(httpServer).get('/api/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('up');
  });

  it('lists dealerships and service types then books', async () => {
    await resetAndSeedMinimal(env.prisma);
    await seedSingleResourcePair(env.prisma);

    const dealerships = await request(httpServer)
      .get('/api/dealerships')
      .expect(200);
    expect(dealerships.body.length).toBeGreaterThan(0);

    const serviceTypes = await request(httpServer)
      .get('/api/service-types')
      .expect(200);
    expect(serviceTypes.body.length).toBeGreaterThan(0);

    const startAt = futureSlot(200);
    const availability = await request(httpServer)
      .get('/api/availability')
      .query({
        dealershipId: SEED_IDS.dealershipDowntown,
        serviceTypeId: SEED_IDS.serviceOilChange,
        startAt,
      })
      .expect(200);

    expect(availability.body.available).toBe(true);

    const created = await request(httpServer)
      .post('/api/appointments')
      .send({
        customerId: SEED_IDS.customerAlice,
        vehicleId: SEED_IDS.vehicleAliceCivic,
        dealershipId: SEED_IDS.dealershipDowntown,
        serviceTypeId: SEED_IDS.serviceOilChange,
        startAt,
      })
      .expect(201);

    await request(httpServer)
      .get(`/api/appointments/${created.body.id as string}`)
      .expect(200);
  });
});
