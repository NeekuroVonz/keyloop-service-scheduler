import { PrismaClient } from '@prisma/client';
import { SEED_IDS } from './seed-ids';

const prisma = new PrismaClient();

/**
 * Non-destructive demo fixture upsert.
 * Never deletes appointments or unrelated rows — safe to re-run after bookings exist.
 */
async function main(): Promise<void> {
  await prisma.dealership.upsert({
    where: { id: SEED_IDS.dealershipDowntown },
    update: { name: 'Keyloop Downtown', timezone: 'Asia/Bangkok' },
    create: {
      id: SEED_IDS.dealershipDowntown,
      name: 'Keyloop Downtown',
      timezone: 'Asia/Bangkok',
    },
  });

  await prisma.dealership.upsert({
    where: { id: SEED_IDS.dealershipUptown },
    update: { name: 'Keyloop Uptown', timezone: 'Asia/Bangkok' },
    create: {
      id: SEED_IDS.dealershipUptown,
      name: 'Keyloop Uptown',
      timezone: 'Asia/Bangkok',
    },
  });

  await prisma.customer.upsert({
    where: { id: SEED_IDS.customerAlice },
    update: { name: 'Alice Nguyen', email: 'alice@example.com' },
    create: {
      id: SEED_IDS.customerAlice,
      name: 'Alice Nguyen',
      email: 'alice@example.com',
    },
  });

  await prisma.customer.upsert({
    where: { id: SEED_IDS.customerBob },
    update: { name: 'Bob Smith', email: 'bob@example.com' },
    create: {
      id: SEED_IDS.customerBob,
      name: 'Bob Smith',
      email: 'bob@example.com',
    },
  });

  await prisma.vehicle.upsert({
    where: { id: SEED_IDS.vehicleAliceCivic },
    update: {
      customerId: SEED_IDS.customerAlice,
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Civic',
    },
    create: {
      id: SEED_IDS.vehicleAliceCivic,
      customerId: SEED_IDS.customerAlice,
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Civic',
    },
  });

  await prisma.vehicle.upsert({
    where: { id: SEED_IDS.vehicleBobCamry },
    update: {
      customerId: SEED_IDS.customerBob,
      vin: '4T1BF1FK5HU123456',
      make: 'Toyota',
      model: 'Camry',
    },
    create: {
      id: SEED_IDS.vehicleBobCamry,
      customerId: SEED_IDS.customerBob,
      vin: '4T1BF1FK5HU123456',
      make: 'Toyota',
      model: 'Camry',
    },
  });

  await prisma.serviceType.upsert({
    where: { id: SEED_IDS.serviceOilChange },
    update: { name: 'Oil Change', durationMinutes: 60 },
    create: {
      id: SEED_IDS.serviceOilChange,
      name: 'Oil Change',
      durationMinutes: 60,
    },
  });

  await prisma.serviceType.upsert({
    where: { id: SEED_IDS.serviceBrakePad },
    update: { name: 'Brake Pad Replacement', durationMinutes: 90 },
    create: {
      id: SEED_IDS.serviceBrakePad,
      name: 'Brake Pad Replacement',
      durationMinutes: 90,
    },
  });

  await prisma.serviceType.upsert({
    where: { id: SEED_IDS.serviceFullInspection },
    update: { name: 'Full Inspection', durationMinutes: 120 },
    create: {
      id: SEED_IDS.serviceFullInspection,
      name: 'Full Inspection',
      durationMinutes: 120,
    },
  });

  const technicians = [
    {
      id: SEED_IDS.techDowntownOil,
      name: 'Tech Oil Specialist',
      active: true,
    },
    {
      id: SEED_IDS.techDowntownBrake,
      name: 'Tech Brake Specialist',
      active: true,
    },
    {
      id: SEED_IDS.techDowntownMulti,
      name: 'Tech Multi-Skilled',
      active: true,
    },
    {
      id: SEED_IDS.techDowntownInactive,
      name: 'Tech Inactive',
      active: false,
    },
  ] as const;

  for (const tech of technicians) {
    await prisma.technician.upsert({
      where: { id: tech.id },
      update: {
        dealershipId: SEED_IDS.dealershipDowntown,
        name: tech.name,
        active: tech.active,
      },
      create: {
        id: tech.id,
        dealershipId: SEED_IDS.dealershipDowntown,
        name: tech.name,
        active: tech.active,
      },
    });
  }

  const qualifications = [
    {
      technicianId: SEED_IDS.techDowntownOil,
      serviceTypeId: SEED_IDS.serviceOilChange,
    },
    {
      technicianId: SEED_IDS.techDowntownBrake,
      serviceTypeId: SEED_IDS.serviceBrakePad,
    },
    {
      technicianId: SEED_IDS.techDowntownMulti,
      serviceTypeId: SEED_IDS.serviceOilChange,
    },
    {
      technicianId: SEED_IDS.techDowntownMulti,
      serviceTypeId: SEED_IDS.serviceBrakePad,
    },
    {
      technicianId: SEED_IDS.techDowntownMulti,
      serviceTypeId: SEED_IDS.serviceFullInspection,
    },
    {
      technicianId: SEED_IDS.techDowntownInactive,
      serviceTypeId: SEED_IDS.serviceOilChange,
    },
  ] as const;

  for (const qualification of qualifications) {
    await prisma.technicianQualification.upsert({
      where: {
        technicianId_serviceTypeId: {
          technicianId: qualification.technicianId,
          serviceTypeId: qualification.serviceTypeId,
        },
      },
      update: {},
      create: qualification,
    });
  }

  const bays = [
    {
      id: SEED_IDS.bayDowntown1,
      dealershipId: SEED_IDS.dealershipDowntown,
      name: 'Bay 1',
      active: true,
    },
    {
      id: SEED_IDS.bayDowntown2,
      dealershipId: SEED_IDS.dealershipDowntown,
      name: 'Bay 2',
      active: true,
    },
    {
      id: SEED_IDS.bayDowntownInactive,
      dealershipId: SEED_IDS.dealershipDowntown,
      name: 'Bay Inactive',
      active: false,
    },
    {
      id: SEED_IDS.bayUptown1,
      dealershipId: SEED_IDS.dealershipUptown,
      name: 'Uptown Bay 1',
      active: true,
    },
  ] as const;

  for (const bay of bays) {
    await prisma.serviceBay.upsert({
      where: { id: bay.id },
      update: {
        dealershipId: bay.dealershipId,
        name: bay.name,
        active: bay.active,
      },
      create: bay,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
