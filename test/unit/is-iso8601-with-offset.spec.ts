import { IsIso8601WithOffsetConstraint } from '../../src/common/validation/is-iso8601-with-offset';

describe('IsIso8601WithOffsetConstraint', () => {
  const constraint = new IsIso8601WithOffsetConstraint();

  it.each([
    '2026-11-10T09:00:00+07:00',
    '2026-11-10T09:00:00Z',
    '2026-11-10T09:00:00.123Z',
    '2026-11-10T02:00:00-05:00',
    '2026-11-10T09:00:00+0700',
    '2024-02-29T09:00:00Z', // leap year
    '2024-02-29T09:00:00+07:00',
  ])('accepts %s', (value) => {
    expect(constraint.validate(value)).toBe(true);
  });

  it.each([
    '2026-11-10',
    '2026-11-10T09:00:00',
    'tomorrow',
    '2026-11-10 09:00:00+07:00',
    '',
    123,
    '2026-02-30T09:00:00+07:00', // impossible calendar day
    '2026-04-31T09:00:00Z', // April has 30 days
    '2025-02-29T09:00:00Z', // non-leap year
    '2026-13-01T09:00:00Z', // invalid month
    '2026-00-10T09:00:00Z',
  ])('rejects %s', (value) => {
    expect(constraint.validate(value)).toBe(false);
  });
});
