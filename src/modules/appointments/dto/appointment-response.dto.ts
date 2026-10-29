import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';

export class AppointmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
  })
  status!: AppointmentStatus;

  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiProperty({ format: 'uuid' })
  dealershipId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceTypeId!: string;

  @ApiProperty({ format: 'uuid' })
  technicianId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceBayId!: string;

  @ApiProperty({ example: '2026-11-10T02:00:00.000Z' })
  startAt!: string;

  @ApiProperty({ example: '2026-11-10T03:00:00.000Z' })
  endAt!: string;
}
