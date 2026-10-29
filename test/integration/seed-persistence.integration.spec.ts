import { execSync } from 'child_process';
import { join } from 'path';
import { AppointmentStatus } from '@prisma/client';
import {
  futureSlot,
  PostgresTestEnv,
  resetAndSeedMinimal,
  SEED_IDS,
  seedSingleResourcePair,
  startPostgresTestEnv,
  stopPostgresTestEnv,
} from './postgres-test-env';

describe('Non-destructive seed persistence', () => {
  let env: PostgresTestEnv;

  beforeAll(async () => {
    env = await startPostgresTestEnv();
  }, 120_000);

  afterAll(async () => {
    await stopPostgresTestEnv(env);
  });

  it('prisma seed upsert leaves existing appointments intact', async () => {
    await resetAndSeedMinimal(env.prisma);
    await seedSingleResourcePair(env.prisma);

    const startAt = new Date(futureSlot(220));
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    const appointment = await env.prisma.appointment.create({
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

    execSync('pnpm exec prisma db seed', {
      cwd: join(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: env.databaseUrl },
      stdio: 'inherit',
    });

    const stillThere = await env.prisma.appointment.findUnique({
      where: { id: appointment.id },
    });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.status).toBe(AppointmentStatus.CONFIRMED);

    const count = await env.prisma.appointment.count();
    expect(count).toBe(1);
  });
});
