/**
 * Half-open interval helpers: [start, end)
 * Two intervals overlap iff startA < endB AND startB < endA.
 */
export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && startB < endA;
}

export function calculateEndAt(startAt: Date, durationMinutes: number): Date {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error('durationMinutes must be a positive integer');
  }
  return new Date(startAt.getTime() + durationMinutes * 60_000);
}

export function isStrictlyInFuture(
  startAt: Date,
  now: Date = new Date(),
): boolean {
  return startAt.getTime() > now.getTime();
}
