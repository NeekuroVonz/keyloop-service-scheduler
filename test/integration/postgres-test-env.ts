import { execSync } from 'child_process';
import { join } from 'path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { SEED_IDS } from '../../prisma/seed-ids';

export interface PostgresTestEnv {
  container: StartedPostgreSqlContainer;
  prisma: PrismaClient;
  databaseUrl: string;
}

export async function startPostgresTestEnv(): Promise<PostgresTestEnv> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const databaseUrl = container.getConnectionUri();

  process.env.DATABASE_URL = databaseUrl;

  execSync('pnpm exec prisma migrate deploy', {
    cwd: join(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  await prisma.$connect();

  return { container, prisma, databaseUrl };
}

export async function stopPostgresTestEnv(env: PostgresTestEnv): Promise<void> {
  await env.prisma.$disconnect();
  await env.container.stop();
}

export async function resetAndSeedMinimal(prisma: PrismaClient): Promise<void> {
  await prisma.appointment.deleteMany();
  await prisma.technicianQualification.deleteMany();
  await prisma.serviceBay.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.serviceType.deleteMany();
  await prisma.dealership.deleteMany();

  await prisma.dealership.create({
    data: {
      id: SEED_IDS.dealershipDowntown,
      name: 'Downtown',
      timezone: 'UTC',
    },
  });

  await prisma.customer.create({
    data: {
      id: SEED_IDS.customerAlice,
      name: 'Alice',
      email: 'alice@example.com',
    },
  });

  await prisma.vehicle.create({
    data: {
      id: SEED_IDS.vehicleAliceCivic,
      customerId: SEED_IDS.customerAlice,
      vin: 'VINALICE1',
      make: 'Honda',
      model: 'Civic',
    },
  });

  await prisma.serviceType.createMany({
    data: [
      {
        id: SEED_IDS.serviceOilChange,
        name: 'Oil Change',
        durationMinutes: 60,
      },
      {
        id: SEED_IDS.serviceBrakePad,
        name: 'Brake Pad',
        durationMinutes: 90,
      },
    ],
  });
}

export async function seedSingleResourcePair(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.technician.create({
    data: {
      id: SEED_IDS.techDowntownOil,
      dealershipId: SEED_IDS.dealershipDowntown,
      name: 'Only Tech',
      active: true,
      qualifications: {
        create: [{ serviceTypeId: SEED_IDS.serviceOilChange }],
      },
    },
  });

  await prisma.serviceBay.create({
    data: {
      id: SEED_IDS.bayDowntown1,
      dealershipId: SEED_IDS.dealershipDowntown,
      name: 'Only Bay',
      active: true,
    },
  });
}

export async function seedDualResourcePairs(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.technician.createMany({
    data: [
      {
        id: SEED_IDS.techDowntownOil,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Tech A',
        active: true,
      },
      {
        id: SEED_IDS.techDowntownMulti,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Tech B',
        active: true,
      },
    ],
  });

  await prisma.technicianQualification.createMany({
    data: [
      {
        technicianId: SEED_IDS.techDowntownOil,
        serviceTypeId: SEED_IDS.serviceOilChange,
      },
      {
        technicianId: SEED_IDS.techDowntownMulti,
        serviceTypeId: SEED_IDS.serviceOilChange,
      },
    ],
  });

  await prisma.serviceBay.createMany({
    data: [
      {
        id: SEED_IDS.bayDowntown1,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Bay A',
        active: true,
      },
      {
        id: SEED_IDS.bayDowntown2,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: 'Bay B',
        active: true,
      },
    ],
  });
}

export function futureSlot(hoursFromNow = 48): string {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().replace('Z', '+00:00');
}

export { SEED_IDS };
