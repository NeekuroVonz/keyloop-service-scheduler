import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Appointment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { calculateEndAt, isStrictlyInFuture } from '../../domain/time-interval';
import { AppointmentsRepository } from './appointments.repository';
import { isTransientBookingConflict } from './booking-errors';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);
  private readonly maxRetries: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentsRepository: AppointmentsRepository,
  ) {
    const parsed = Number.parseInt(process.env.BOOKING_MAX_RETRIES ?? '3', 10);
    this.maxRetries = Number.isFinite(parsed) && parsed >= 0 ? parsed : 3;
  }

  async create(dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException(
        'startAt must be a valid ISO 8601 datetime',
      );
    }

    if (!isStrictlyInFuture(startAt)) {
      throw new BadRequestException('startAt must be in the future');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });
    if (!vehicle || vehicle.customerId !== dto.customerId) {
      throw new NotFoundException(
        `Vehicle ${dto.vehicleId} not found for customer ${dto.customerId}`,
      );
    }

    const dealership = await this.prisma.dealership.findUnique({
      where: { id: dto.dealershipId },
    });
    if (!dealership) {
      throw new NotFoundException(`Dealership ${dto.dealershipId} not found`);
    }

    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: dto.serviceTypeId },
    });
    if (!serviceType) {
      throw new NotFoundException(
        `Service type ${dto.serviceTypeId} not found`,
      );
    }

    const endAt = calculateEndAt(startAt, serviceType.durationMinutes);

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const appointment = await this.attemptBooking({
          customerId: dto.customerId,
          vehicleId: dto.vehicleId,
          dealershipId: dto.dealershipId,
          serviceTypeId: dto.serviceTypeId,
          startAt,
          endAt,
        });

        this.logger.log({
          msg: 'booking_succeeded',
          appointmentId: appointment.id,
          dealershipId: appointment.dealershipId,
          serviceTypeId: appointment.serviceTypeId,
          technicianId: appointment.technicianId,
          serviceBayId: appointment.serviceBayId,
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
          attempt,
        });

        return this.toResponse(appointment);
      } catch (error: unknown) {
        if (error instanceof ConflictException) {
          throw error;
        }

        if (isTransientBookingConflict(error) && attempt < this.maxRetries) {
          attempt += 1;
          this.logger.warn({
            msg: 'booking_retry_after_conflict',
            attempt,
            maxRetries: this.maxRetries,
            dealershipId: dto.dealershipId,
            serviceTypeId: dto.serviceTypeId,
            startAt: startAt.toISOString(),
          });
          continue;
        }

        if (isTransientBookingConflict(error)) {
          this.logger.warn({
            msg: 'booking_conflict_exhausted_retries',
            attempt,
            dealershipId: dto.dealershipId,
            serviceTypeId: dto.serviceTypeId,
            startAt: startAt.toISOString(),
          });
          throw new ConflictException(
            'No available technician and service bay combination for the requested time',
          );
        }

        this.logger.error({
          msg: 'booking_unexpected_failure',
          dealershipId: dto.dealershipId,
          err:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : { message: 'unknown' },
        });
        throw error;
      }
    }

    throw new ConflictException(
      'No available technician and service bay combination for the requested time',
    );
  }

  async findById(id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentsRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    return this.toResponse(appointment);
  }

  private async attemptBooking(input: {
    customerId: string;
    vehicleId: string;
    dealershipId: string;
    serviceTypeId: string;
    startAt: Date;
    endAt: Date;
  }): Promise<Appointment> {
    return this.prisma.$transaction(async (tx) => {
      const technicians =
        await this.appointmentsRepository.findQualifiedActiveTechnicians(
          tx,
          input.dealershipId,
          input.serviceTypeId,
        );

      const bays = await this.appointmentsRepository.findActiveServiceBays(
        tx,
        input.dealershipId,
      );

      const overlapping =
        await this.appointmentsRepository.findOverlappingConfirmedResourceIds(
          tx,
          input.dealershipId,
          input.startAt,
          input.endAt,
        );

      const busyTechnicians = new Set(overlapping.technicianIds);
      const busyBays = new Set(overlapping.serviceBayIds);

      const technician = technicians.find(
        (row) => !busyTechnicians.has(row.id),
      );
      const serviceBay = bays.find((row) => !busyBays.has(row.id));

      if (!technician || !serviceBay) {
        throw new ConflictException(
          'No available technician and service bay combination for the requested time',
        );
      }

      return this.appointmentsRepository.createConfirmed(tx, {
        customerId: input.customerId,
        vehicleId: input.vehicleId,
        dealershipId: input.dealershipId,
        serviceTypeId: input.serviceTypeId,
        technicianId: technician.id,
        serviceBayId: serviceBay.id,
        startAt: input.startAt,
        endAt: input.endAt,
      });
    });
  }

  private toResponse(appointment: Appointment): AppointmentResponseDto {
    return {
      id: appointment.id,
      status: appointment.status,
      customerId: appointment.customerId,
      vehicleId: appointment.vehicleId,
      dealershipId: appointment.dealershipId,
      serviceTypeId: appointment.serviceTypeId,
      technicianId: appointment.technicianId,
      serviceBayId: appointment.serviceBayId,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
    };
  }

  /** Exposed for availability module — counts free resources for an interval. */
  async countAvailableResources(
    dealershipId: string,
    serviceTypeId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<{
    availableTechnicianCount: number;
    availableServiceBayCount: number;
  }> {
    const technicians =
      await this.appointmentsRepository.findQualifiedActiveTechnicians(
        this.prisma,
        dealershipId,
        serviceTypeId,
      );
    const bays = await this.appointmentsRepository.findActiveServiceBays(
      this.prisma,
      dealershipId,
    );
    const overlapping =
      await this.appointmentsRepository.findOverlappingConfirmedResourceIds(
        this.prisma,
        dealershipId,
        startAt,
        endAt,
      );

    const busyTechnicians = new Set(overlapping.technicianIds);
    const busyBays = new Set(overlapping.serviceBayIds);

    return {
      availableTechnicianCount: technicians.filter(
        (row) => !busyTechnicians.has(row.id),
      ).length,
      availableServiceBayCount: bays.filter((row) => !busyBays.has(row.id))
        .length,
    };
  }
}
