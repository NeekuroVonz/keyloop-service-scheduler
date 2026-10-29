export interface TechnicianCandidate {
  id: string;
  dealershipId: string;
  active: boolean;
  qualifiedServiceTypeIds: string[];
}

export interface ServiceBayCandidate {
  id: string;
  dealershipId: string;
  active: boolean;
}

export function isTechnicianEligibleForService(
  technician: TechnicianCandidate,
  dealershipId: string,
  serviceTypeId: string,
): boolean {
  return (
    technician.active &&
    technician.dealershipId === dealershipId &&
    technician.qualifiedServiceTypeIds.includes(serviceTypeId)
  );
}

export function isServiceBayEligible(
  bay: ServiceBayCandidate,
  dealershipId: string,
): boolean {
  return bay.active && bay.dealershipId === dealershipId;
}

/** Deterministic ascending UUID lexicographic order. */
export function sortByIdAscending<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

export function pickFirstAvailable<T extends { id: string }>(
  candidates: T[],
  unavailableIds: ReadonlySet<string>,
): T | undefined {
  return sortByIdAscending(candidates).find(
    (item) => !unavailableIds.has(item.id),
  );
}
