import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsIso8601WithOffset } from '../../common/validation/is-iso8601-with-offset';

export class AvailabilityQueryDto {
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID('4')
  dealershipId!: string;

  @ApiProperty({
    format: 'uuid',
    example: '44444444-4444-4444-8444-444444444441',
  })
  @IsUUID('4')
  serviceTypeId!: string;

  @ApiProperty({
    example: '2026-11-10T09:00:00+07:00',
    description:
      'ISO 8601 date-time with explicit timezone offset (Z or ±HH:MM)',
  })
  @IsIso8601WithOffset()
  startAt!: string;
}

export class AvailabilityResponseDto {
  @ApiProperty({
    description:
      'Advisory only — never a reservation or guarantee under concurrent load',
  })
  available!: boolean;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty()
  availableTechnicianCount!: number;

  @ApiProperty()
  availableServiceBayCount!: number;
}
