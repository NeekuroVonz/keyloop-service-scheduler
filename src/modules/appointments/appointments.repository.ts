import { Injectable } from '@nestjs/common';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreateAppointmentData {
  customerId: string;
  vehicleId: string;
  dealershipId: string;
  serviceTypeId: string;
  technicianId: string;
  serviceBayId: string;
  startAt: Date;
  endAt: Date;
}

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Appointment | null> {
    return this.prisma.appointment.findUnique({ where: { id } });
  }

  async findOverlappingConfirmedResourceIds(
    tx: Prisma.TransactionClient,
    dealershipId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<{ technicianIds: string[]; serviceBayIds: string[] }> {
    // Half-open overlap: existing.start < requested.end AND requested.start < existing.end
    const overlapping = await tx.appointment.findMany({
      where: {
        dealershipId,
        status: AppointmentStatus.CONFIRMED,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: {
        technicianId: true,
        serviceBayId: true,
      },
    });

    return {
      technicianIds: overlapping.map((row) => row.technicianId),
      serviceBayIds: overlapping.map((row) => row.serviceBayId),
    };
  }

  async findQualifiedActiveTechnicians(
    tx: Prisma.TransactionClient,
    dealershipId: string,
    serviceTypeId: string,
  ): Promise<Array<{ id: string }>> {
    return tx.technician.findMany({
      where: {
        dealershipId,
        active: true,
        qualifications: {
          some: { serviceTypeId },
        },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
  }

  async findActiveServiceBays(
    tx: Prisma.TransactionClient,
    dealershipId: string,
  ): Promise<Array<{ id: string }>> {
    return tx.serviceBay.findMany({
      where: {
        dealershipId,
        active: true,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
  }

  async createConfirmed(
    tx: Prisma.TransactionClient,
    data: CreateAppointmentData,
  ): Promise<Appointment> {
    return tx.appointment.create({
      data: {
        ...data,
        status: AppointmentStatus.CONFIRMED,
      },
    });
  }
}
