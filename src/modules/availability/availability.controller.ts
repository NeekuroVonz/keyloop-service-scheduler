import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { calculateEndAt, isStrictlyInFuture } from '../../domain/time-interval';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  AvailabilityQueryDto,
  AvailabilityResponseDto,
} from './availability.dto';

@ApiTags('availability')
@Controller('api/availability')
export class AvailabilityController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Advisory availability check',
    description:
      'Returns current free technician/bay counts for a future slot. This is NOT a reservation. Past startAt values are rejected with 400 (same contract as booking).',
  })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  async check(
    @Query() query: AvailabilityQueryDto,
  ): Promise<AvailabilityResponseDto> {
    const startAt = new Date(query.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException(
        'startAt must be a valid ISO 8601 datetime',
      );
    }
    if (!isStrictlyInFuture(startAt)) {
      throw new BadRequestException('startAt must be in the future');
    }

    const dealership = await this.prisma.dealership.findUnique({
      where: { id: query.dealershipId },
    });
    if (!dealership) {
      throw new NotFoundException(`Dealership ${query.dealershipId} not found`);
    }

    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: query.serviceTypeId },
    });
    if (!serviceType) {
      throw new NotFoundException(
        `Service type ${query.serviceTypeId} not found`,
      );
    }

    const endAt = calculateEndAt(startAt, serviceType.durationMinutes);
    const counts = await this.appointmentsService.countAvailableResources(
      query.dealershipId,
      query.serviceTypeId,
      startAt,
      endAt,
    );

    const available =
      counts.availableTechnicianCount > 0 &&
      counts.availableServiceBayCount > 0;

    return {
      available,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      availableTechnicianCount: counts.availableTechnicianCount,
      availableServiceBayCount: counts.availableServiceBayCount,
    };
  }
}
