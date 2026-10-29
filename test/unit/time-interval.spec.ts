import {
  calculateEndAt,
  intervalsOverlap,
  isStrictlyInFuture,
} from '../../src/domain/time-interval';

describe('time-interval', () => {
  describe('calculateEndAt', () => {
    it('adds duration minutes to startAt', () => {
      const start = new Date('2026-11-10T02:00:00.000Z');
      expect(calculateEndAt(start, 60).toISOString()).toBe(
        '2026-11-10T03:00:00.000Z',
      );
      expect(calculateEndAt(start, 90).toISOString()).toBe(
        '2026-11-10T03:30:00.000Z',
      );
    });

    it('rejects non-positive durations', () => {
      const start = new Date('2026-11-10T02:00:00.000Z');
      expect(() => calculateEndAt(start, 0)).toThrow();
      expect(() => calculateEndAt(start, -5)).toThrow();
      expect(() => calculateEndAt(start, 1.5)).toThrow();
    });
  });

  describe('intervalsOverlap half-open [start, end)', () => {
    const nine = new Date('2026-11-10T09:00:00.000Z');
    const ten = new Date('2026-11-10T10:00:00.000Z');
    const tenThirty = new Date('2026-11-10T10:30:00.000Z');
    const eleven = new Date('2026-11-10T11:00:00.000Z');

    it('treats adjacent appointments as non-overlapping', () => {
      expect(intervalsOverlap(nine, ten, ten, eleven)).toBe(false);
    });

    it('detects partial overlap', () => {
      expect(
        intervalsOverlap(
          nine,
          ten,
          new Date('2026-11-10T09:30:00.000Z'),
          tenThirty,
        ),
      ).toBe(true);
    });

    it('detects identical intervals as overlapping', () => {
      expect(intervalsOverlap(nine, ten, nine, ten)).toBe(true);
    });

    it('detects nested intervals as overlapping', () => {
      expect(intervalsOverlap(nine, eleven, ten, tenThirty)).toBe(true);
    });
  });

  describe('isStrictlyInFuture', () => {
    it('requires startAfter now', () => {
      const now = new Date('2026-11-10T08:00:00.000Z');
      expect(
        isStrictlyInFuture(new Date('2026-11-10T08:00:00.001Z'), now),
      ).toBe(true);
      expect(isStrictlyInFuture(now, now)).toBe(false);
      expect(
        isStrictlyInFuture(new Date('2026-11-10T07:59:59.000Z'), now),
      ).toBe(false);
    });
  });
});
