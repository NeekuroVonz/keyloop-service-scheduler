import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsIso8601WithOffset } from '../../../common/validation/is-iso8601-with-offset';

export class CreateAppointmentDto {
  @ApiProperty({
    format: 'uuid',
    example: '22222222-2222-4222-8222-222222222221',
    description: 'Seeded customer Alice (placeholder fixture ID)',
  })
  @IsUUID('4')
  customerId!: string;

  @ApiProperty({
    format: 'uuid',
    example: '33333333-3333-4333-8333-333333333331',
    description: 'Seeded Alice Civic vehicle (placeholder fixture ID)',
  })
  @IsUUID('4')
  vehicleId!: string;

  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Seeded Downtown dealership (placeholder fixture ID)',
  })
  @IsUUID('4')
  dealershipId!: string;

  @ApiProperty({
    format: 'uuid',
    example: '44444444-4444-4444-8444-444444444441',
    description: 'Seeded Oil Change service type (placeholder fixture ID)',
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
