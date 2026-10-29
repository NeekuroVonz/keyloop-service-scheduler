import {
  isServiceBayEligible,
  isTechnicianEligibleForService,
  pickFirstAvailable,
  sortByIdAscending,
} from '../../src/domain/resource-eligibility';

describe('resource-eligibility', () => {
  const dealershipId = 'd1';
  const serviceTypeId = 's1';

  it('requires active qualified technician at the dealership', () => {
    expect(
      isTechnicianEligibleForService(
        {
          id: 't1',
          dealershipId,
          active: true,
          qualifiedServiceTypeIds: [serviceTypeId],
        },
        dealershipId,
        serviceTypeId,
      ),
    ).toBe(true);

    expect(
      isTechnicianEligibleForService(
        {
          id: 't2',
          dealershipId,
          active: false,
          qualifiedServiceTypeIds: [serviceTypeId],
        },
        dealershipId,
        serviceTypeId,
      ),
    ).toBe(false);

    expect(
      isTechnicianEligibleForService(
        {
          id: 't3',
          dealershipId: 'other',
          active: true,
          qualifiedServiceTypeIds: [serviceTypeId],
        },
        dealershipId,
        serviceTypeId,
      ),
    ).toBe(false);

    expect(
      isTechnicianEligibleForService(
        {
          id: 't4',
          dealershipId,
          active: true,
          qualifiedServiceTypeIds: ['other'],
        },
        dealershipId,
        serviceTypeId,
      ),
    ).toBe(false);
  });

  it('requires active bay at the dealership', () => {
    expect(
      isServiceBayEligible(
        { id: 'b1', dealershipId, active: true },
        dealershipId,
      ),
    ).toBe(true);
    expect(
      isServiceBayEligible(
        { id: 'b2', dealershipId, active: false },
        dealershipId,
      ),
    ).toBe(false);
  });

  it('picks the first free resource by ascending id', () => {
    const sorted = sortByIdAscending([{ id: 'c' }, { id: 'a' }, { id: 'b' }]);
    expect(sorted.map((x) => x.id)).toEqual(['a', 'b', 'c']);

    const picked = pickFirstAvailable(
      [{ id: 'b' }, { id: 'a' }, { id: 'c' }],
      new Set(['a']),
    );
    expect(picked?.id).toBe('b');
  });
});
