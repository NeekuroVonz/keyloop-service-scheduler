import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAppointmentDto } from '../../src/modules/appointments/dto/create-appointment.dto';

describe('CreateAppointmentDto validation', () => {
  it('accepts a valid payload', async () => {
    const dto = plainToInstance(CreateAppointmentDto, {
      customerId: '22222222-2222-4222-8222-222222222221',
      vehicleId: '33333333-3333-4333-8333-333333333331',
      dealershipId: '11111111-1111-4111-8111-111111111111',
      serviceTypeId: '44444444-4444-4444-8444-444444444441',
      startAt: '2026-11-10T09:00:00+07:00',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid UUIDs and missing fields', async () => {
    const dto = plainToInstance(CreateAppointmentDto, {
      customerId: 'not-a-uuid',
      vehicleId: '33333333-3333-4333-8333-333333333331',
      dealershipId: '11111111-1111-4111-8111-111111111111',
      startAt: 'tomorrow',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toEqual(
      expect.arrayContaining(['customerId', 'serviceTypeId', 'startAt']),
    );
  });

  it.each([
    '2026-11-10',
    '2026-11-10T09:00:00',
    'not-a-date',
    '2026-02-30T09:00:00+07:00',
    '2026-04-31T09:00:00Z',
    '2025-02-29T09:00:00Z',
  ])('rejects invalid or impossible startAt: %s', async (startAt) => {
    const dto = plainToInstance(CreateAppointmentDto, {
      customerId: '22222222-2222-4222-8222-222222222221',
      vehicleId: '33333333-3333-4333-8333-333333333331',
      dealershipId: '11111111-1111-4111-8111-111111111111',
      serviceTypeId: '44444444-4444-4444-8444-444444444441',
      startAt,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'startAt')).toBe(true);
  });

  it('accepts Zulu and numeric offsets', async () => {
    for (const startAt of [
      '2099-11-10T09:00:00Z',
      '2099-11-10T09:00:00+07:00',
      '2099-11-10T02:00:00-05:00',
    ]) {
      const dto = plainToInstance(CreateAppointmentDto, {
        customerId: '22222222-2222-4222-8222-222222222221',
        vehicleId: '33333333-3333-4333-8333-333333333331',
        dealershipId: '11111111-1111-4111-8111-111111111111',
        serviceTypeId: '44444444-4444-4444-8444-444444444441',
        startAt,
      });
      expect(await validate(dto)).toHaveLength(0);
    }
  });
});
